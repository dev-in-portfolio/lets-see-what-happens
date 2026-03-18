from pathlib import Path


def ingredient_json_path(ingredients_dir: Path, build_unit_id: str) -> Path:
    top_level = build_unit_id.split(".", 1)[0]
    return ingredients_dir / top_level / f"{build_unit_id}.json"


def find_ingredient_json_files(ingredients_dir: Path) -> list[Path]:
    return sorted(path for path in ingredients_dir.rglob("*.json") if path.is_file())

