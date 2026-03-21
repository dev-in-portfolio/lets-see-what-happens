import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesPath = path.join(__dirname, "data", "images.json");
const collectionsPath = path.join(__dirname, "data", "collections.json");
const distDir = path.join(__dirname, "dist");
const port = Number(process.env.PORT || 8787);
const isProduction = process.env.NODE_ENV === "production";
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

const writeImages = async (images) => {
  await writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`, "utf8");
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
  return "application/octet-stream";
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

await loadDotEnv();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const { pathname } = url;

    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/api/collections") {
      const [images, collections] = await Promise.all([getImages(), getCollections()]);
      const itemsById = new Map(images.map((image) => [image.id, image]));
      const hydratedCollections = collections.map((collection) => ({
        ...collection,
        items: collection.imageIds.map((id) => itemsById.get(id)).filter(Boolean),
      }));
      return sendJson(res, 200, { collections: hydratedCollections });
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
      return sendJson(res, 200, { image });
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
      return sendJson(res, 200, { image: images[index] });
    }

    const assetParams = matchRoute(pathname, "/api/assets/:id/url");
    if (req.method === "GET" && assetParams) {
      const images = await getImages();
      const image = images.find((item) => item.id === assetParams.id);
      if (!image) return sendJson(res, 404, { error: "Image not found" });

      try {
        const target = getImageStorageTarget(image);
        const signed = await getDownloadAuthorization(target, image.backblazeKey);
        return sendJson(res, 200, {
          id: image.id,
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

    const previewParams = matchRoute(pathname, "/api/assets/:id/preview");
    if (req.method === "GET" && previewParams) {
      const images = await getImages();
      const image = images.find((item) => item.id === previewParams.id);
      if (!image) return sendJson(res, 404, { error: "Image not found" });

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
