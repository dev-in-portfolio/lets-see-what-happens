#!/usr/bin/env python3

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INGREDIENTS_DIR = ROOT / "ingredients"
CACHE_PATH = ROOT / "scripts" / "translation_cache_en.json"
ID_PATTERN = re.compile(r"^\d+\.\d+\.\d+\.\d+\.\d+\.\d+$")


def load_cache(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_cache(path: Path, cache: dict[str, dict[str, str]]) -> None:
    path.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def fetch_translation(name: str, retries: int = 5) -> dict[str, str]:
    encoded = urllib.parse.quote(name, safe="")
    fast_url = (
        "https://clients5.google.com/translate_a/t"
        f"?client=dict-chrome-ex&sl=auto&tl=en&q={encoded}"
    )
    fallback_url = (
        "https://translate.googleapis.com/translate_a/single"
        f"?client=gtx&sl=auto&tl=en&dt=t&q={encoded}"
    )

    last_error = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(fast_url, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
            translated = payload[0][0].strip() if payload and payload[0] else name
            src_lang = payload[0][1] if payload and payload[0] and len(payload[0]) > 1 else "unknown"
            return {
                "source_language": src_lang,
                "translated_en": normalize_text(translated) or normalize_text(name),
            }
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            try:
                with urllib.request.urlopen(fallback_url, timeout=25) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                translated = payload[0][0][0].strip() if payload and payload[0] else name
                src_lang = payload[2] if len(payload) > 2 and isinstance(payload[2], str) else "unknown"
                return {
                    "source_language": src_lang,
                    "translated_en": normalize_text(translated) or normalize_text(name),
                }
            except Exception as fallback_exc:  # noqa: BLE001
                last_error = fallback_exc
                time.sleep(min(1.5 * attempt, 8.0))

    raise RuntimeError(f"translation failed for {name!r}: {last_error}")


def collect_names() -> tuple[list[Path], list[str]]:
    files = sorted(INGREDIENTS_DIR.glob("*.json"))
    names: set[str] = set()
    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        for entry in payload.get("entries", []):
            name = entry.get("name")
            if isinstance(name, str) and name.strip():
                names.add(normalize_text(name))
    return files, sorted(names)


def is_likely_non_english(name: str) -> bool:
    if any(ord(ch) > 127 for ch in name):
        return True
    # Common non-English function words and ingredient markers.
    token_pattern = re.compile(
        r"\b("
        r"de|del|la|las|los|el|en|con|sin|y|"
        r"da|do|das|dos|ao|aos|na|no|nas|nos|e|"
        r"di|della|delle|dei|degli|alla|alle|al|ai|"
        r"le|les|des|du|au|aux|et|"
        r"ibn|bin"
        r")\b",
        flags=re.IGNORECASE,
    )
    return bool(token_pattern.search(name))


def format_name(original: str, source_language: str, translated_en: str) -> str:
    original_norm = normalize_text(original)
    translated_norm = normalize_text(translated_en)
    if source_language == "en":
        return original_norm
    # Requested format for non-English originals:
    # (common name), (translated name), (original name)
    # Use translated English for both common and translated fields.
    return f"{translated_norm}, {translated_norm}, {original_norm}"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fill translated ingredient names in the format: common, translated, original."
    )
    parser.add_argument("--workers", type=int, default=16, help="Concurrent translation workers.")
    parser.add_argument("--batch-size", type=int, default=500, help="Names to process per batch.")
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional limit of uncached names to translate (0 = no limit).",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Rewrite ingredient JSON files with translated name formatting.",
    )
    parser.add_argument(
        "--likely-non-english-only",
        action="store_true",
        help="Only translate names that match non-English heuristics.",
    )
    args = parser.parse_args()

    files, unique_names = collect_names()
    cache = load_cache(CACHE_PATH)

    candidate_names = unique_names
    if args.likely_non_english_only:
        candidate_names = [name for name in unique_names if is_likely_non_english(name)]

    missing = [name for name in candidate_names if name not in cache]
    if args.limit > 0:
        missing = missing[: args.limit]

    print(f"ingredient_files={len(files)}")
    print(f"unique_names={len(unique_names)}")
    print(f"cached_names={len(cache)}")
    print(f"candidate_names={len(candidate_names)}")
    print(f"missing_names={len(missing)}")

    if missing:
        done = 0
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            batch_size = max(1, args.batch_size)
            for start in range(0, len(missing), batch_size):
                batch = missing[start : start + batch_size]
                futures = {executor.submit(fetch_translation, name): name for name in batch}
                for future in as_completed(futures):
                    name = futures[future]
                    cache[name] = future.result()
                    done += 1
                    if done % 200 == 0 or done == len(missing):
                        print(f"translated={done}/{len(missing)}", flush=True)
                save_cache(CACHE_PATH, cache)
        save_cache(CACHE_PATH, cache)

    missing_after = [name for name in candidate_names if name not in cache]
    if missing_after and args.limit == 0:
        raise SystemExit(f"translation cache still missing {len(missing_after)} names")

    non_english = 0
    total_entries = 0
    rewritten_entries = 0

    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for entry in payload.get("entries", []):
            name = entry.get("name")
            if not isinstance(name, str) or not name.strip():
                continue
            total_entries += 1
            key = normalize_text(name)
            if key in cache:
                meta = cache[key]
                new_name = format_name(name, meta["source_language"], meta["translated_en"])
                if meta["source_language"] != "en":
                    non_english += 1
            else:
                new_name = name
            if entry["name"] != new_name:
                entry["name"] = new_name
                changed = True
                rewritten_entries += 1
        if args.write and changed:
            path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"total_entries={total_entries}")
    print(f"non_english_entries={non_english}")
    print(f"rewritten_entries={rewritten_entries}")
    print(f"write_mode={args.write}")

    # Check id format is still correct after rewrite pass.
    bad_ids = 0
    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        for entry in payload.get("entries", []):
            if not ID_PATTERN.match(str(entry.get("id", ""))):
                bad_ids += 1
    print(f"bad_id_format={bad_ids}")


if __name__ == "__main__":
    main()
