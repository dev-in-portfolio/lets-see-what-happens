import https from "node:https";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");

const parseEnv = async () => {
  const raw = await readFile(path.join(projectDir, ".env"), "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
};

const requestJson = (url, { method = "GET", headers = {}, body } = {}) =>
  new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers, timeout: 30_000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if ((res.statusCode || 500) < 200 || (res.statusCode || 500) >= 300) {
          reject(new Error(`${res.statusCode} ${data}`));
          return;
        }
        resolve(JSON.parse(data));
      });
    });
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });

const collectionMeta = {
  "Black powder on canvas": {
    description: "A single surviving black-powder canvas record.",
    note: "This section is incomplete and may represent only the image that survived export.",
    tone: "#2f2b2a",
  },
  "Burnt wood": {
    description: "Burnt wood work preserved as a minimal surviving fragment.",
    note: "The archive does not claim completeness here.",
    tone: "#5a4234",
  },
  "Crayon on canvas": {
    description: "Crayon-on-canvas works held together through screenshot and export residue.",
    note: "What appears here is what remained reachable in the drop.",
    tone: "#8f6e5e",
  },
  "Green Room": {
    description: "Green Room images as a clustered set of surviving captures.",
    note: "Ordering is archival, not canonical.",
    tone: "#4d6b5c",
  },
  "Paint on canvas": {
    description: "Paint-on-canvas records recovered from mixed exports, screenshots, and preserved uploads.",
    note: "This is a partial archive, not a definitive catalog.",
    tone: "#7b5e4d",
  },
  "Paint on wood": {
    description: "Paint-on-wood works collected as a dense field of surviving fragments.",
    note: "Missing neighbors and lost originals are part of the archive state.",
    tone: "#6a5242",
  },
  Show: {
    description: "Show documentation and event-facing fragments.",
    note: "This section likely represents only a surviving remainder of a larger event record.",
    tone: "#62555f",
  },
  "Spray paint on paper": {
    description: "Spray-paint-on-paper images preserved across compressed and re-saved copies.",
    note: "The file set is incomplete and should be read as what survived transmission.",
    tone: "#6c5a72",
  },
  "Tattoo ink on canvas": {
    description: "Tattoo-ink-on-canvas records kept as a short surviving subset.",
    note: "This section may grow as more images are recovered.",
    tone: "#58464b",
  },
  sculpture: {
    description: "Sculpture photos preserved as a small surviving group.",
    note: "The sculpture set is fragmentary and may not represent the full body of work.",
    tone: "#4e5968",
  },
};

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const sourceKind = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes("screenshot")) return { state: "screenshot", note: "Screenshot-based copy preserved in the drop." };
  if (lower.includes("img_")) return { state: "recovered", note: "Phone photo preserved in the drop." };
  if (lower.includes("signal-")) return { state: "recovered", note: "Signal-export image preserved in the drop." };
  if (lower.includes("ce0235_") || lower.includes("mv2")) {
    return { state: "fragment", note: "Exported web/archive image preserved in the drop." };
  }
  return { state: "recovered", note: "Recovered image preserved in the drop." };
};

const dateText = (name) => {
  const match = name.match(/(20\d{2})(\d{2})(\d{2})/);
  if (!match) return { dateExact: "", dateApprox: "", dateUnknown: true };
  return {
    dateExact: "",
    dateApprox: `source capture ${match[1]}-${match[2]}-${match[3]}`,
    dateUnknown: false,
  };
};

const env = await parseEnv();
const basic = Buffer.from(`${env.B2_KEY_ID}:${env.B2_APPLICATION_KEY}`).toString("base64");
const auth = await requestJson("https://api.backblazeb2.com/b2api/v4/b2_authorize_account", {
  headers: { Authorization: `Basic ${basic}` },
});
const list = await requestJson(
  `${auth.apiInfo.storageApi.apiUrl}/b2api/v4/b2_list_file_names?bucketId=${encodeURIComponent(env.B2_BUCKET_ID)}&maxFileCount=1000`,
  { headers: { Authorization: auth.authorizationToken } },
);

const files = list.files
  .filter((file) => !file.fileName.endsWith(".bzEmpty") && !file.fileName.endsWith("/.bzEmpty"))
  .filter((file) => {
    const parts = file.fileName.split("/");
    return parts[1] && parts[1] !== "logo";
  })
  .sort((a, b) => a.fileName.localeCompare(b.fileName));

const byCollection = new Map();
for (const file of files) {
  const collection = file.fileName.split("/")[1];
  if (!byCollection.has(collection)) byCollection.set(collection, []);
  byCollection.get(collection).push(file);
}

const images = [];
const collections = [];

for (const [collectionName, items] of [...byCollection.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const meta = collectionMeta[collectionName] || {
    description: `${collectionName} records preserved in the image drop.`,
    note: "This section is archive-first and may be incomplete.",
    tone: "#5f5658",
  };
  const collectionId = slug(collectionName);
  const imageIds = [];

  items.forEach((file, index) => {
    const sourceFileName = file.fileName.split("/").at(-1);
    const source = sourceKind(sourceFileName);
    const dates = dateText(sourceFileName);
    const id = slug(`${collectionName}-${String(index + 1).padStart(3, "0")}`);

    imageIds.push(id);
    images.push({
      id,
      title: `${collectionName} ${String(index + 1).padStart(2, "0")}`,
      backblazeKey: file.fileName,
      bucketName: env.B2_BUCKET_NAME,
      bucketId: env.B2_BUCKET_ID,
      preferredRotation: 0,
      collectionIds: [collectionId],
      dateExact: dates.dateExact,
      dateApprox: dates.dateApprox,
      dateUnknown: dates.dateUnknown,
      provenanceNote: `${source.note} Original file: ${sourceFileName}.`,
      survivalState: source.state,
      notes: `Imported from Backblaze folder ${collectionName}.`,
      relatedImageIds: [],
      dominantTone: meta.tone,
      sourceFileName,
      contentType: file.contentType,
      contentLength: file.contentLength,
      uploadTimestamp: file.uploadTimestamp,
    });
  });

  collections.push({
    id: collectionId,
    name: collectionName,
    description: meta.description,
    incompleteNote: meta.note,
    imageIds,
  });
}

await mkdir(path.join(projectDir, "data"), { recursive: true });
await writeFile(path.join(projectDir, "data", "images.json"), `${JSON.stringify(images, null, 2)}\n`, "utf8");
await writeFile(path.join(projectDir, "data", "collections.json"), `${JSON.stringify(collections, null, 2)}\n`, "utf8");

console.log(`Imported ${images.length} images across ${collections.length} collections.`);
