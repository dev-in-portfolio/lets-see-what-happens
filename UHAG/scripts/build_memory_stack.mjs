import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");
const imagesPath = path.join(projectDir, "data", "images.json");
const stackDataPath = path.join(projectDir, "data", "memory-stack.json");
const stackNotesPath = path.join(projectDir, "data", "memory-stack-notes.json");
const stackPublicDir = path.join(projectDir, "storage", "public", "memory-stack");

const pad = (n) => String(n).padStart(3, "0");

const run = async () => {
  const images = JSON.parse(await readFile(imagesPath, "utf8"));
  const migrated = images.filter((image) => image.originalKey && image.watermarkedKey && image.thumbKey).slice(0, 45);

  await rm(stackPublicDir, { recursive: true, force: true });
  await mkdir(stackPublicDir, { recursive: true });

  const items = [];
  for (let i = 0; i < migrated.length; i += 1) {
    const label = i + 1;
    const source = path.join(projectDir, "storage", "public", migrated[i].watermarkedKey);
    const targetName = `${pad(label)}.jpg`;
    const targetPath = path.join(stackPublicDir, targetName);
    const relativeSource = path.relative(stackPublicDir, source);
    await symlink(relativeSource, targetPath);

    items.push({
      label,
      indexLabel: `${label}`,
      id: migrated[i].id,
      title: migrated[i].title,
      stackUrl: `/media/memory-stack/${targetName}`,
      thumbUrl: migrated[i].thumbKey ? `/media/${migrated[i].thumbKey}` : "",
      watermarkedUrl: migrated[i].watermarkedKey ? `/media/${migrated[i].watermarkedKey}` : "",
      sourceFileName: migrated[i].sourceFileName || "",
    });
  }

  await writeFile(
    stackDataPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), count: items.length, items }, null, 2)}\n`,
    "utf8",
  );

  const blankNotes = items.map((item) => ({
    label: item.label,
    id: item.id,
    title: item.title,
    memoryDetails: "",
  }));
  await writeFile(
    stackNotesPath,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), notes: blankNotes }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Built memory stack with ${items.length} labeled images at ${stackPublicDir}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

