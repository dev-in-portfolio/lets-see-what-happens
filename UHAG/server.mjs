import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import Busboy from "busboy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesPath = path.join(__dirname, "data", "images.json");
const collectionsPath = path.join(__dirname, "data", "collections.json");
const memoryStackPath = path.join(__dirname, "data", "memory-stack.json");
const distDir = path.join(__dirname, "dist");
const storageRoot = path.join(__dirname, "storage");
const privateRoot = path.join(storageRoot, "private");
const publicRoot = path.join(storageRoot, "public");
const originalsRoot = path.join(privateRoot, "originals");
const watermarkedRoot = path.join(publicRoot, "watermarked");
const thumbsRoot = path.join(publicRoot, "thumbs");

const port = Number(process.env.PORT || 8787);
const isProduction = process.env.NODE_ENV === "production";
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PUBLIC_MEDIA_PREFIX = "/media";

const logoAsset = {
  id: "logo",
  backblazeKey: "Image drop/logo/file_00000000cc1c71f5b791d4bfd9d67c08.png",
};

let accountAuthCache = null;
const downloadAuthCache = new Map();

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, jsonHeaders);
  res.end(JSON.stringify(data));
};

const sendText = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
};

const loadJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

const getImages = async () => loadJson(imagesPath);
const getCollections = async () => loadJson(collectionsPath);
const getMemoryStack = async () => {
  try {
    return await loadJson(memoryStackPath);
  } catch {
    return { generatedAt: null, count: 0, items: [] };
  }
};

const writeImages = async (images) => {
  await writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`, "utf8");
};

const writeCollections = async (collections) => {
  await writeFile(collectionsPath, `${JSON.stringify(collections, null, 2)}\n`, "utf8");
};

const loadDotEnv = async () => {
  const envPath = path.join(__dirname, ".env");
  try {
    await access(envPath);
  } catch {
    return;
  }

  const file = await readFile(envPath, "utf8");
  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
};

const readRequestBody = async (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const extFromMime = (mime) => {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return "";
};

const assertDir = async (dirPath) => {
  await mkdir(dirPath, { recursive: true });
};

const ensureStorageDirs = async () => {
  await Promise.all([assertDir(originalsRoot), assertDir(watermarkedRoot), assertDir(thumbsRoot)]);
};

const getPublicUrlForKey = (assetKey) => `${PUBLIC_MEDIA_PREFIX}/${encodeURI(assetKey.replace(/\\/g, "/"))}`;

const safeUnlink = async (targetPath) => {
  try {
    await unlink(targetPath);
  } catch {
    // Ignore missing files for idempotent delete behavior.
  }
};

const parseJsonBody = async (req) => {
  const raw = await readRequestBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
};

const parseAuthToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const fallback = req.headers["x-admin-token"];
  if (Array.isArray(fallback)) return fallback[0] || "";
  return String(fallback || "").trim();
};

const isAdminAuthorized = (req) => {
  const configured = process.env.ADMIN_TOKEN;
  if (!configured) {
    return { ok: false, reason: "missing_token_config" };
  }

  const received = parseAuthToken(req);
  const a = Buffer.from(received);
  const b = Buffer.from(configured);
  if (a.length !== b.length) return { ok: false, reason: "invalid" };
  return { ok: timingSafeEqual(a, b) };
};

const getBackblazeCredentials = () => {
  const keyId = process.env.B2_KEY_ID;
  const applicationKey = process.env.B2_APPLICATION_KEY;
  const bucketId = process.env.B2_BUCKET_ID;
  const bucketName = process.env.B2_BUCKET_NAME;

  if (!keyId || !applicationKey || !bucketId || !bucketName) {
    return null;
  }

  return { keyId, applicationKey, bucketId, bucketName };
};

const getImageStorageTarget = (image) => {
  const defaults = getBackblazeCredentials();
  if (!defaults) {
    throw new Error("Backblaze credentials are missing. Fill .env before requesting asset URLs.");
  }

  const bucketId = image.bucketId || defaults.bucketId;
  const bucketName = image.bucketName || defaults.bucketName;
  if (!bucketId || !bucketName) {
    throw new Error(`Storage target is incomplete for image ${image.id}.`);
  }

  return {
    keyId: defaults.keyId,
    applicationKey: defaults.applicationKey,
    bucketId,
    bucketName,
  };
};

const authorizeAccount = async () => {
  if (accountAuthCache && accountAuthCache.expiresAt > Date.now() + 60_000) {
    return accountAuthCache.value;
  }

  const credentials = getBackblazeCredentials();
  if (!credentials) {
    throw new Error("Backblaze credentials are missing. Fill .env before requesting asset URLs.");
  }

  const basic = Buffer.from(`${credentials.keyId}:${credentials.applicationKey}`).toString("base64");
  const response = await fetch("https://api.backblazeb2.com/b2api/v4/b2_authorize_account", {
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backblaze authorization failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  accountAuthCache = {
    value: payload,
    expiresAt: Date.now() + 11 * 60 * 60 * 1000,
  };
  return payload;
};

const getDownloadAuthorization = async (target, fileName) => {
  const cacheKey = createHash("sha1").update(`${target.bucketId}:${fileName}`).digest("hex");
  const cached = downloadAuthCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.value;
  }

  const account = await authorizeAccount();
  const response = await fetch(`${account.apiInfo.storageApi.apiUrl}/b2api/v4/b2_get_download_authorization`, {
    method: "POST",
    headers: {
      Authorization: account.authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId: target.bucketId,
      fileNamePrefix: fileName,
      validDurationInSeconds: 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backblaze download authorization failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const url = `${account.apiInfo.storageApi.downloadUrl}/file/${target.bucketName}/${encodeURI(fileName)}?Authorization=${encodeURIComponent(payload.authorizationToken)}`;
  const value = {
    url,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  downloadAuthCache.set(cacheKey, { value, expiresAt: value.expiresAt });
  return value;
};

const parseMultipartImageUpload = async (req) =>
  new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: MAX_UPLOAD_BYTES,
      },
    });

    const fields = {};
    let fileName = "";
    let mimeType = "";
    let fileBuffer = Buffer.alloc(0);
    let gotFile = false;

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (name, file, info) => {
      gotFile = true;
      fileName = info.filename || "upload";
      mimeType = info.mimeType || "";

      const chunks = [];
      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("limit", () => {
        reject(new Error(`Upload exceeds max size of ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`));
      });

      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      if (!gotFile || !fileBuffer.length) {
        reject(new Error("No image file uploaded."));
        return;
      }
      resolve({ fields, fileName, mimeType, fileBuffer });
    });

    req.pipe(busboy);
  });

const adminUploadPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>UHAG Admin Upload</title>
    <style>
      :root { color-scheme: dark; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0f131a; color: #e8ecf3; }
      main { max-width: 680px; margin: 2rem auto; padding: 1.25rem; }
      .card { background: #161c25; border: 1px solid #263241; border-radius: 12px; padding: 1rem; }
      label { display: block; font-size: 0.9rem; margin: 0.9rem 0 0.35rem; color: #b8c7dc; }
      input, textarea, button { width: 100%; box-sizing: border-box; border-radius: 8px; border: 1px solid #394b61; background: #0f131a; color: #eef3ff; padding: 0.65rem; }
      button { background: #225ea8; border: 1px solid #2f74c8; font-weight: 700; cursor: pointer; margin-top: 1rem; }
      pre { white-space: pre-wrap; background: #0f131a; padding: 0.8rem; border: 1px solid #263241; border-radius: 8px; }
    </style>
  </head>
  <body>
    <main>
      <h1>UHAG Admin Upload</h1>
      <p>Uploads create private originals and public watermarked derivatives.</p>
      <div class="card">
        <label for="token">Admin token</label>
        <input id="token" type="password" placeholder="ADMIN_TOKEN" />
        <label for="title">Title</label>
        <input id="title" type="text" placeholder="Image title" />
        <label for="notes">Notes</label>
        <textarea id="notes" rows="3" placeholder="Optional notes"></textarea>
        <label for="collectionIds">Collection IDs (comma separated)</label>
        <input id="collectionIds" type="text" placeholder="recent-uploads" />
        <label for="image">Image file</label>
        <input id="image" type="file" accept="image/png,image/jpeg,image/webp" />
        <button id="submit" type="button">Upload Image</button>
      </div>
      <h3>Response</h3>
      <pre id="result">No upload yet.</pre>
    </main>
    <script>
      const result = document.getElementById("result");
      document.getElementById("submit").addEventListener("click", async () => {
        const token = document.getElementById("token").value.trim();
        const title = document.getElementById("title").value.trim();
        const notes = document.getElementById("notes").value.trim();
        const collectionIds = document.getElementById("collectionIds").value.trim();
        const fileInput = document.getElementById("image");
        const file = fileInput.files && fileInput.files[0];
        if (!token) {
          result.textContent = "Admin token is required.";
          return;
        }
        if (!file) {
          result.textContent = "Pick an image file first.";
          return;
        }
        const form = new FormData();
        form.append("image", file);
        if (title) form.append("title", title);
        if (notes) form.append("notes", notes);
        if (collectionIds) form.append("collectionIds", collectionIds);
        result.textContent = "Uploading...";
        try {
          const response = await fetch("/api/admin/images/upload", {
            method: "POST",
            headers: { Authorization: \`Bearer \${token}\` },
            body: form,
          });
          const payload = await response.json();
          result.textContent = JSON.stringify(payload, null, 2);
        } catch (error) {
          result.textContent = error.message;
        }
      });
    </script>
  </body>
</html>
`;

const renderMemoryStackPage = (stack) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>UHAG Memory Stack</title>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #101318; color: #e8edf6; }
      main { max-width: 900px; margin: 0 auto; padding: 1rem 1rem 3rem; }
      h1 { margin: 0.5rem 0 0.75rem; }
      .meta { color: #a7b4c9; margin-bottom: 1.2rem; }
      .stack { display: grid; gap: 1rem; }
      .card { border: 1px solid #2d3b50; border-radius: 10px; padding: 0.9rem; background: #171f2b; }
      .label { font-weight: 700; color: #9ed0ff; margin-bottom: 0.35rem; }
      img { width: 100%; height: auto; display: block; border-radius: 8px; }
      .title { margin-top: 0.5rem; color: #d8e2f2; }
      .id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.86rem; color: #9fb0c8; }
    </style>
  </head>
  <body>
    <main>
      <h1>Memory Stack (1-${stack.count || 0})</h1>
      <p class="meta">Stacked and labeled for recollection notes. Generated: ${stack.generatedAt || "n/a"}</p>
      <section class="stack">
        ${stack.items
          .map(
            (item) => `<article class="card">
              <div class="label">#${item.label}</div>
              <img src="${item.stackUrl}" alt="${item.title}" loading="lazy" decoding="async" />
              <div class="title">${item.title}</div>
              <div class="id">${item.id}</div>
            </article>`,
          )
          .join("")}
      </section>
    </main>
  </body>
</html>`;

const createWatermarkOverlay = (text, targetWidth, targetHeight) => {
  const safeText = String(text || "Urban Hippie Art").slice(0, 80);
  const width = Math.max(1, Math.floor(targetWidth || 1));
  const height = Math.max(1, Math.floor(targetHeight || 1));
  const boxWidth = Math.max(1, Math.min(760, Math.floor(width * 0.82)));
  const boxHeight = Math.max(1, Math.min(120, Math.floor(height * 0.16)));
  const fontSize = Math.max(10, Math.min(48, Math.floor(boxHeight * 0.48)));
  const textX = Math.max(10, Math.floor(boxWidth * 0.04));
  const textY = Math.max(fontSize, Math.floor(boxHeight * 0.72));
  const radius = Math.max(6, Math.floor(boxHeight * 0.12));

  return Buffer.from(
    `<svg width="${boxWidth}" height="${boxHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" fill="rgba(0,0,0,0.28)" rx="${radius}" ry="${radius}"/>
      <text x="${textX}" y="${textY}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="rgba(255,255,255,0.78)">${safeText}</text>
    </svg>`,
    "utf8",
  );
};

const buildImageDerivatives = async ({ sourceBuffer, id, watermarkText }) => {
  const normalizedBuffer = await sharp(sourceBuffer, { failOn: "none" }).rotate().toBuffer();
  const metadata = await sharp(normalizedBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (!width || !height) {
    throw new Error("Unable to read image dimensions.");
  }

  const watermarkedKey = `watermarked/${id}.jpg`;
  const thumbKey = `thumbs/${id}.jpg`;
  const originalExt = extFromMime(metadata.format === "jpeg" ? "image/jpeg" : metadata.format === "png" ? "image/png" : metadata.format === "webp" ? "image/webp" : "") || ".bin";
  const originalKey = `originals/${id}${originalExt}`;

  const originalPath = path.join(privateRoot, originalKey);
  const watermarkedPath = path.join(publicRoot, watermarkedKey);
  const thumbPath = path.join(publicRoot, thumbKey);

  await writeFile(originalPath, sourceBuffer);

  const watermarkSvg = createWatermarkOverlay(watermarkText, width, height);
  await sharp(normalizedBuffer)
    .composite([{ input: watermarkSvg, gravity: "southeast" }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(watermarkedPath);

  const thumbBase = sharp(normalizedBuffer)
    .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true });
  const thumbBuffer = await thumbBase.toBuffer();
  const thumbMeta = await sharp(thumbBuffer).metadata();
  const thumbWidth = Math.max(thumbMeta.width || 1, 1);
  const thumbHeight = Math.max(thumbMeta.height || 1, 1);
  await sharp(thumbBuffer)
    .composite([{ input: createWatermarkOverlay(watermarkText, thumbWidth, thumbHeight), gravity: "southeast" }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(thumbPath);

  const statHash = createHash("sha256").update(sourceBuffer).digest("hex");

  return {
    width,
    height,
    originalKey,
    watermarkedKey,
    thumbKey,
    checksumSha256: statHash,
    contentLength: sourceBuffer.length,
  };
};

const sanitizePublicImage = (image) => {
  const safe = { ...image };
  if (safe.originalKey) delete safe.originalKey;
  if (safe.backblazeKey && safe.watermarkedKey) delete safe.backblazeKey;
  return safe;
};

const matchRoute = (pathname, pattern) => {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const part = patternParts[i];
    if (part.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(pathParts[i]);
      continue;
    }
    if (part !== pathParts[i]) {
      return null;
    }
  }
  return params;
};

const serveStatic = async (req, res, pathname) => {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.join(distDir, relativePath);

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": getMimeType(filePath),
    });
    res.end(file);
    return true;
  } catch {
    if (pathname !== "/") {
      try {
        const file = await readFile(path.join(distDir, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(file);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};

const servePublicMedia = async (res, pathname) => {
  const relativePath = pathname.slice(PUBLIC_MEDIA_PREFIX.length).replace(/^\/+/, "");
  const filePath = path.join(publicRoot, relativePath);
  if (!filePath.startsWith(publicRoot)) return false;

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": getMimeType(filePath),
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    res.end(file);
    return true;
  } catch {
    return false;
  }
};

const appendImageToCollections = (collections, imageId, requestedIds) => {
  const targetIds = requestedIds.length ? requestedIds : ["recent-uploads"];

  for (const collectionId of targetIds) {
    let collection = collections.find((item) => item.id === collectionId);
    if (!collection) {
      collection = {
        id: collectionId,
        name: collectionId === "recent-uploads" ? "Recent Uploads" : collectionId,
        description: "Admin uploaded records.",
        incompleteNote: "This section grows as new uploads are added.",
        imageIds: [],
      };
      collections.push(collection);
    }
    if (!collection.imageIds.includes(imageId)) {
      collection.imageIds.push(imageId);
    }
  }
};

const removeImageFromCollections = (collections, imageId) => {
  for (const collection of collections) {
    collection.imageIds = collection.imageIds.filter((id) => id !== imageId);
  }
};

await loadDotEnv();
await ensureStorageDirs();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const { pathname } = url;

    if (req.method === "GET" && pathname.startsWith(`${PUBLIC_MEDIA_PREFIX}/`)) {
      const served = await servePublicMedia(res, pathname);
      if (served) return undefined;
      return sendText(res, 404, "Not found");
    }

    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/api/collections") {
      const [images, collections] = await Promise.all([getImages(), getCollections()]);
      const itemsById = new Map(images.map((image) => [image.id, sanitizePublicImage(image)]));
      const hydratedCollections = collections.map((collection) => ({
        ...collection,
        items: collection.imageIds.map((id) => itemsById.get(id)).filter(Boolean),
      }));
      return sendJson(res, 200, { collections: hydratedCollections });
    }

    if (req.method === "GET" && pathname === "/api/gallery/images") {
      const images = (await getImages()).map(sanitizePublicImage);
      return sendJson(res, 200, { images });
    }

    if (req.method === "GET" && pathname === "/api/memory-stack") {
      const stack = await getMemoryStack();
      return sendJson(res, 200, stack);
    }

    const galleryImageParams = matchRoute(pathname, "/api/gallery/images/:id");
    if (req.method === "GET" && galleryImageParams) {
      const image = (await getImages()).find((item) => item.id === galleryImageParams.id);
      if (!image) return sendJson(res, 404, { error: "Image not found" });
      return sendJson(res, 200, { image: sanitizePublicImage(image) });
    }

    if (req.method === "GET" && pathname === "/admin/upload") {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(adminUploadPage);
      return undefined;
    }

    if (req.method === "GET" && pathname === "/admin/memory-stack") {
      const stack = await getMemoryStack();
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(renderMemoryStackPage(stack));
      return undefined;
    }

    if (req.method === "GET" && pathname === "/api/logo/url") {
      try {
        const target = getImageStorageTarget(logoAsset);
        const signed = await getDownloadAuthorization(target, logoAsset.backblazeKey);
        return sendJson(res, 200, {
          id: logoAsset.id,
          bucketName: target.bucketName,
          bucketId: target.bucketId,
          url: signed.url,
          expiresAt: signed.expiresAt,
        });
      } catch (error) {
        return sendJson(res, 503, {
          error: error.message,
        });
      }
    }

    const imageParams = matchRoute(pathname, "/api/images/:id");
    if (req.method === "GET" && imageParams) {
      const images = await getImages();
      const image = images.find((item) => item.id === imageParams.id);
      if (!image) return sendJson(res, 404, { error: "Image not found" });
      return sendJson(res, 200, { image: sanitizePublicImage(image) });
    }

    const rotationParams = matchRoute(pathname, "/api/images/:id/rotation");
    if (req.method === "PATCH" && rotationParams) {
      const body = await readRequestBody(req);
      const payload = JSON.parse(body || "{}");
      const rotation = Number(payload.preferredRotation);
      if (![0, 90, 180, 270].includes(rotation)) {
        return sendJson(res, 400, { error: "preferredRotation must be one of 0, 90, 180, 270" });
      }

      const images = await getImages();
      const index = images.findIndex((item) => item.id === rotationParams.id);
      if (index === -1) return sendJson(res, 404, { error: "Image not found" });

      images[index] = {
        ...images[index],
        preferredRotation: rotation,
      };
      await writeImages(images);
      return sendJson(res, 200, { image: sanitizePublicImage(images[index]) });
    }

    const assetParams = matchRoute(pathname, "/api/assets/:id/url");
    if (req.method === "GET" && assetParams) {
      const images = await getImages();
      const image = images.find((item) => item.id === assetParams.id);
      if (!image) return sendJson(res, 404, { error: "Image not found" });

      if (image.watermarkedKey) {
        return sendJson(res, 200, {
          id: image.id,
          url: getPublicUrlForKey(image.watermarkedKey),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          visibility: "public-watermarked",
        });
      }

      try {
        const target = getImageStorageTarget(image);
        const signed = await getDownloadAuthorization(target, image.backblazeKey);
        return sendJson(res, 200, {
          id: image.id,
          bucketName: target.bucketName,
          bucketId: target.bucketId,
          url: signed.url,
          expiresAt: signed.expiresAt,
          visibility: "legacy-signed-original",
        });
      } catch (error) {
        return sendJson(res, 503, {
          error: error.message,
        });
      }
    }

    const previewParams = matchRoute(pathname, "/api/assets/:id/preview");
    if (req.method === "GET" && previewParams) {
      const images = await getImages();
      const image = images.find((item) => item.id === previewParams.id);
      if (!image) return sendJson(res, 404, { error: "Image not found" });

      if (image.thumbKey) {
        res.writeHead(302, {
          Location: getPublicUrlForKey(image.thumbKey),
          "Cache-Control": "no-store",
        });
        res.end();
        return undefined;
      }

      if (image.watermarkedKey) {
        res.writeHead(302, {
          Location: getPublicUrlForKey(image.watermarkedKey),
          "Cache-Control": "no-store",
        });
        res.end();
        return undefined;
      }

      try {
        const target = getImageStorageTarget(image);
        const signed = await getDownloadAuthorization(target, image.backblazeKey);
        res.writeHead(302, {
          Location: signed.url,
          "Cache-Control": "no-store",
        });
        res.end();
        return undefined;
      } catch (error) {
        return sendJson(res, 503, {
          error: error.message,
        });
      }
    }

    const uploadRoute = pathname === "/api/admin/images/upload";
    if (req.method === "POST" && uploadRoute) {
      const auth = isAdminAuthorized(req);
      if (!auth.ok) {
        if (auth.reason === "missing_token_config") {
          return sendJson(res, 503, { error: "ADMIN_TOKEN is not configured." });
        }
        return sendJson(res, 401, { error: "Unauthorized" });
      }

      const contentType = req.headers["content-type"] || "";
      if (!String(contentType).toLowerCase().includes("multipart/form-data")) {
        return sendJson(res, 400, { error: "Use multipart/form-data with a file field named image." });
      }

      const { fields, fileName, mimeType, fileBuffer } = await parseMultipartImageUpload(req);
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return sendJson(res, 400, { error: "Only jpg, png, and webp are allowed." });
      }

      const title = String(fields.title || path.parse(fileName).name || "Untitled upload").trim();
      const idBase = slugify(title) || "image";
      const id = `${idBase}-${randomUUID().slice(0, 8)}`;
      const collectionIds = String(fields.collectionIds || "")
        .split(",")
        .map((idPart) => slugify(idPart))
        .filter(Boolean);

      const derivatives = await buildImageDerivatives({
        sourceBuffer: fileBuffer,
        id,
        watermarkText: String(process.env.WATERMARK_TEXT || "Urban Hippie Art"),
      });

      const now = Date.now();
      const imageRecord = {
        id,
        title,
        preferredRotation: 0,
        collectionIds,
        dateExact: "",
        dateApprox: "",
        dateUnknown: true,
        provenanceNote: "Admin uploaded original. Public view uses watermarked derivative.",
        survivalState: "original",
        notes: String(fields.notes || ""),
        relatedImageIds: [],
        dominantTone: "",
        sourceFileName: fileName,
        contentType: mimeType,
        contentLength: derivatives.contentLength,
        uploadTimestamp: now,
        width: derivatives.width,
        height: derivatives.height,
        status: "published",
        watermarkVersion: 1,
        checksumSha256: derivatives.checksumSha256,
        originalKey: derivatives.originalKey,
        watermarkedKey: derivatives.watermarkedKey,
        thumbKey: derivatives.thumbKey,
      };

      const [images, collections] = await Promise.all([getImages(), getCollections()]);
      images.unshift(imageRecord);
      appendImageToCollections(collections, id, collectionIds);
      await Promise.all([writeImages(images), writeCollections(collections)]);

      return sendJson(res, 201, {
        image: sanitizePublicImage(imageRecord),
      });
    }

    const adminImageParams = matchRoute(pathname, "/api/admin/images/:id");
    if (adminImageParams && req.method === "PATCH") {
      const auth = isAdminAuthorized(req);
      if (!auth.ok) {
        if (auth.reason === "missing_token_config") return sendJson(res, 503, { error: "ADMIN_TOKEN is not configured." });
        return sendJson(res, 401, { error: "Unauthorized" });
      }

      const payload = await parseJsonBody(req);
      const images = await getImages();
      const index = images.findIndex((item) => item.id === adminImageParams.id);
      if (index === -1) return sendJson(res, 404, { error: "Image not found" });

      const allowed = ["title", "notes", "provenanceNote", "status", "preferredRotation"];
      const next = { ...images[index] };
      for (const key of allowed) {
        if (payload[key] === undefined) continue;
        if (key === "preferredRotation") {
          const rotation = Number(payload.preferredRotation);
          if (![0, 90, 180, 270].includes(rotation)) {
            return sendJson(res, 400, { error: "preferredRotation must be one of 0, 90, 180, 270" });
          }
          next.preferredRotation = rotation;
          continue;
        }
        next[key] = String(payload[key]);
      }

      images[index] = next;
      await writeImages(images);
      return sendJson(res, 200, { image: sanitizePublicImage(next) });
    }

    if (adminImageParams && req.method === "DELETE") {
      const auth = isAdminAuthorized(req);
      if (!auth.ok) {
        if (auth.reason === "missing_token_config") return sendJson(res, 503, { error: "ADMIN_TOKEN is not configured." });
        return sendJson(res, 401, { error: "Unauthorized" });
      }

      const [images, collections] = await Promise.all([getImages(), getCollections()]);
      const index = images.findIndex((item) => item.id === adminImageParams.id);
      if (index === -1) return sendJson(res, 404, { error: "Image not found" });

      const removed = images[index];
      images.splice(index, 1);
      removeImageFromCollections(collections, removed.id);
      await Promise.all([writeImages(images), writeCollections(collections)]);

      if (removed.originalKey) await safeUnlink(path.join(privateRoot, removed.originalKey));
      if (removed.watermarkedKey) await safeUnlink(path.join(publicRoot, removed.watermarkedKey));
      if (removed.thumbKey) await safeUnlink(path.join(publicRoot, removed.thumbKey));

      return sendJson(res, 200, { deleted: true, id: removed.id });
    }

    const adminOriginalParams = matchRoute(pathname, "/api/admin/images/:id/original-url");
    if (adminOriginalParams && req.method === "GET") {
      const auth = isAdminAuthorized(req);
      if (!auth.ok) {
        if (auth.reason === "missing_token_config") return sendJson(res, 503, { error: "ADMIN_TOKEN is not configured." });
        return sendJson(res, 401, { error: "Unauthorized" });
      }

      const images = await getImages();
      const image = images.find((item) => item.id === adminOriginalParams.id);
      if (!image) return sendJson(res, 404, { error: "Image not found" });

      if (image.originalKey) {
        return sendJson(res, 200, {
          id: image.id,
          path: image.originalKey,
          storage: "local-private",
        });
      }

      if (image.backblazeKey) {
        const target = getImageStorageTarget(image);
        const signed = await getDownloadAuthorization(target, image.backblazeKey);
        return sendJson(res, 200, {
          id: image.id,
          url: signed.url,
          expiresAt: signed.expiresAt,
          storage: "backblaze-signed",
        });
      }

      return sendJson(res, 404, { error: "No original available for this image." });
    }

    if (isProduction && (req.method === "GET" || req.method === "HEAD")) {
      const served = await serveStatic(req, res, pathname);
      if (served) return undefined;
    }

    return sendText(res, 404, "Not found");
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Unexpected server error" });
  }
});

server.listen(port, () => {
  console.log(`UHAG API listening on http://localhost:${port}`);
});
