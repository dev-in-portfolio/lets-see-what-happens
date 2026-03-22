import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");

const imagesPath = path.join(projectDir, "data", "images.json");
const collectionsPath = path.join(projectDir, "data", "collections.json");
const stackPath = path.join(projectDir, "data", "memory-stack.json");
const notesPath = path.join(projectDir, "data", "memory-stack-notes.json");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const expandRange = (start, end) => {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  const out = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
};

const notesDirectives = [
  {
    labels: [1],
    collectionName: "Playing With Fire",
    dateApprox: "~2018",
    description: "I wonder what would happen if I dumped some black powder on a canvas and lit it on fire.",
  },
  {
    labels: [2],
    collectionName: "Playing With Fire",
    dateApprox: "~2018",
    description: "What designs can I make by heating random metal pieces red-hot with a blowtorch?",
  },
  {
    labels: expandRange(3, 5),
    collectionName: "The Box Said Non-Flammable",
    dateApprox: "~2021",
    description: "64 Pack + Blow Torch = Drip Drip (I don't think I burned myself).",
  },
  {
    labels: expandRange(6, 14),
    collectionName: "The Green Room",
    dateApprox: "~2017",
    description: "Can you paint my room? Sure, what do you want? Green, I like green.",
  },
  {
    labels: expandRange(19, 24),
    collectionName: "Paint On Canvas Viva",
    dateApprox: "~2016-2018",
  },
  {
    labels: expandRange(25, 29),
    collectionName: "Paint On Canvas FM",
    dateApprox: "~2021",
  },
  {
    labels: [30],
    collectionName: "Street Canvas",
    dateApprox: "~2016",
  },
  {
    labels: [31],
    collectionName: "Paint On Canvas FM",
    dateApprox: "~2021",
  },
  {
    labels: [32],
    collectionName: "Paint On Canvas Viva",
    dateApprox: "~2016",
    title: "Locked Away",
    description: "I'll take care of the boy.",
  },
  {
    labels: expandRange(33, 38),
    collectionName: "Paint On Canvas FM",
    dateApprox: "~2021",
  },
  {
    labels: expandRange(39, 40),
    collectionName: "Street Canvas",
    dateApprox: "~2016",
  },
  {
    labels: [41],
    collectionName: "Paint On Canvas Viva",
    dateApprox: "~2017",
  },
  {
    labels: [42],
    collectionName: "Paint On Canvas FM",
    dateApprox: "~2021",
  },
  {
    labels: [43],
    collectionName: "Paint On Canvas Viva",
    dateApprox: "~2016",
    title: "Locked Away",
    description: "I'll take care of the boy.",
  },
  {
    labels: [44],
    collectionName: "Paint On Canvas FM",
    dateApprox: "~2021",
    title: "Steel Your Face",
  },
  {
    labels: [45],
    collectionName: "Paint On Canvas Viva",
    dateApprox: "~2017",
  },
];

const run = async () => {
  const [imagesRaw, collectionsRaw, stackRaw] = await Promise.all([
    readFile(imagesPath, "utf8"),
    readFile(collectionsPath, "utf8"),
    readFile(stackPath, "utf8"),
  ]);

  const images = JSON.parse(imagesRaw);
  const collections = JSON.parse(collectionsRaw);
  const stack = JSON.parse(stackRaw);

  const byId = new Map(images.map((image) => [image.id, image]));
  const labelToId = new Map(stack.items.map((item) => [Number(item.label), item.id]));
  const curatedMap = new Map(); // collectionName -> Set(imageIds)
  const noteByLabel = new Map(); // label -> note summary

  for (const directive of notesDirectives) {
    const memoryCollectionId = `memory-${slugify(directive.collectionName)}`;
    if (!curatedMap.has(directive.collectionName)) {
      curatedMap.set(directive.collectionName, new Set());
    }

    for (const label of directive.labels) {
      const id = labelToId.get(label);
      if (!id) continue;
      const image = byId.get(id);
      if (!image) continue;

      curatedMap.get(directive.collectionName).add(id);

      const nextCollectionIds = new Set([...(image.collectionIds || []), memoryCollectionId]);
      image.collectionIds = [...nextCollectionIds];
      image.memoryLabel = label;
      image.memoryCollectionName = directive.collectionName;
      if (directive.dateApprox) {
        image.memoryDateApprox = directive.dateApprox;
        image.dateApprox = directive.dateApprox;
        image.dateUnknown = false;
      }
      if (directive.description) {
        image.memoryDescription = directive.description;
      }
      if (directive.title) {
        image.title = directive.title;
      }

      const summary = [`(C) ${directive.collectionName}`];
      if (directive.dateApprox) summary.push(`(D) ${directive.dateApprox}`);
      if (directive.title) summary.push(`(Title) ${directive.title}`);
      if (directive.description) summary.push(`(des) ${directive.description}`);
      noteByLabel.set(label, summary.join(" "));
    }
  }

  const existingById = new Map(collections.map((collection) => [collection.id, collection]));
  for (const [collectionName, idsSet] of curatedMap.entries()) {
    const id = `memory-${slugify(collectionName)}`;
    const imageIds = [...idsSet];
    const descriptionSource = notesDirectives.find((item) => item.collectionName === collectionName && item.description)?.description;
    const nextCollection = {
      id,
      name: collectionName,
      description: descriptionSource || `${collectionName} recollection set.`,
      incompleteNote: "User recollection metadata.",
      imageIds,
    };
    existingById.set(id, nextCollection);
  }

  const nextCollections = [...existingById.values()];

  let notesDoc = { updatedAt: new Date().toISOString(), notes: [] };
  try {
    notesDoc = JSON.parse(await readFile(notesPath, "utf8"));
  } catch {
    // no-op
  }
  const nextNotes = (notesDoc.notes || []).map((item) => {
    const summary = noteByLabel.get(Number(item.label));
    if (!summary) return item;
    return {
      ...item,
      memoryDetails: summary,
    };
  });

  await Promise.all([
    writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`, "utf8"),
    writeFile(collectionsPath, `${JSON.stringify(nextCollections, null, 2)}\n`, "utf8"),
    writeFile(
      notesPath,
      `${JSON.stringify({ updatedAt: new Date().toISOString(), notes: nextNotes }, null, 2)}\n`,
      "utf8",
    ),
  ]);

  console.log(`Applied memory notes to ${noteByLabel.size} labeled records.`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

