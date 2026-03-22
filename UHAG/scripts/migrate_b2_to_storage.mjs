import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");
const imagesPath = path.join(projectDir, "data", "images.json");
const envPath = path.join(projectDir, ".env");

const storageRoot = path.join(projectDir, "storage");
const privateRoot = path.join(storageRoot, "private");
const publicRoot = path.join(storageRoot, "public");
const originalsRoot = path.join(privateRoot, "originals");
const watermarkedRoot = path.join(publicRoot, "watermarked");
const thumbsRoot = path.join(publicRoot, "thumbs");
const failureReportPath = path.join(projectDir, "data", "migration-failures.json");

const parseEnv = async () => {
  const raw = await readFile(envPath, "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
};

const must = (value, label) => {
  if (!value) throw new Error(`Missing required env var: ${label}`);
  return value;
};

const ensureDirs = async () => {
  await Promise.all([
    mkdir(originalsRoot, { recursive: true }),
    mkdir(watermarkedRoot, { recursive: true }),
    mkdir(thumbsRoot, { recursive: true }),
  ]);
};

const extFromContentType = (contentType = "") => {
  const lower = contentType.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
  if (lower.includes("png")) return ".png";
  if (lower.includes("webp")) return ".webp";
  return ".bin";
};

const watermarkOverlay = (text, targetWidth, targetHeight) => {
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
      <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" fill="rgba(0,0,0,0.28)" rx="${radius}" ry="${radius}" />
      <text x="${textX}" y="${textY}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="rgba(255,255,255,0.78)">${safeText}</text>
    </svg>`,
    "utf8",
  );
};

const authorizeAccount = async ({ keyId, applicationKey }) => {
  const basic = Buffer.from(`${keyId}:${applicationKey}`).toString("base64");
  const response = await fetch("https://api.backblazeb2.com/b2api/v4/b2_authorize_account", {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!response.ok) {
    throw new Error(`Backblaze authorize failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
};

const getDownloadAuth = async ({ apiUrl, authToken, bucketId, fileName }) => {
  const response = await fetch(`${apiUrl}/b2api/v4/b2_get_download_authorization`, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId,
      fileNamePrefix: fileName,
      validDurationInSeconds: 600,
    }),
  });
  if (!response.ok) {
    throw new Error(`Backblaze get download auth failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadFile = async ({ downloadUrl, bucketName, fileName, token }) => {
  const url = `${downloadUrl}/file/${bucketName}/${encodeURI(fileName)}?Authorization=${encodeURIComponent(token)}`;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) {
        throw new Error(`Backblaze download failed for "${fileName}": ${response.status} ${await response.text()}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        await sleep(attempt * 1500);
      }
    }
  }
  throw lastError;
};

const processImage = async ({ sourceBuffer, id, watermarkText, originalExt }) => {
  const originalKey = `originals/${id}${originalExt}`;
  const watermarkedKey = `watermarked/${id}.jpg`;
  const thumbKey = `thumbs/${id}.jpg`;

  const originalPath = path.join(privateRoot, originalKey);
  const watermarkedPath = path.join(publicRoot, watermarkedKey);
  const thumbPath = path.join(publicRoot, thumbKey);

  await writeFile(originalPath, sourceBuffer);

  const normalizedBuffer = await sharp(sourceBuffer).rotate().toBuffer();
  const image = sharp(normalizedBuffer);
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) {
    throw new Error("Invalid image dimensions");
  }

  const wm = watermarkOverlay(watermarkText, width, height);
  await sharp(normalizedBuffer)
    .composite([{ input: wm, gravity: "southeast" }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(watermarkedPath);

  const thumbBase = sharp(normalizedBuffer)
    .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true });
  const thumbBuffer = await thumbBase.toBuffer();
  const thumbMeta = await sharp(thumbBuffer).metadata();
  const thumbWidth = Math.max(thumbMeta.width || 1, 1);
  const thumbHeight = Math.max(thumbMeta.height || 1, 1);
  await sharp(thumbBuffer)
    .composite([{ input: watermarkOverlay(watermarkText, thumbWidth, thumbHeight), gravity: "southeast" }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(thumbPath);

  return {
    width,
    height,
    originalKey,
    watermarkedKey,
    thumbKey,
    contentLength: sourceBuffer.length,
    checksumSha256: createHash("sha256").update(sourceBuffer).digest("hex"),
  };
};

const run = async () => {
  const env = await parseEnv();
  const keyId = must(env.B2_KEY_ID, "B2_KEY_ID");
  const applicationKey = must(env.B2_APPLICATION_KEY, "B2_APPLICATION_KEY");
  const defaultBucketId = must(env.B2_BUCKET_ID, "B2_BUCKET_ID");
  const defaultBucketName = must(env.B2_BUCKET_NAME, "B2_BUCKET_NAME");
  const watermarkText = env.WATERMARK_TEXT || "Urban Hippie Art";

  await ensureDirs();

  const account = await authorizeAccount({ keyId, applicationKey });
  const apiUrl = account.apiInfo.storageApi.apiUrl;
  const downloadUrl = account.apiInfo.storageApi.downloadUrl;
  const authToken = account.authorizationToken;

  const images = JSON.parse(await readFile(imagesPath, "utf8"));
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < images.length; i += 1) {
    const image = images[i];
    if (!image.backblazeKey) {
      skipped += 1;
      continue;
    }
    if (image.watermarkedKey && image.thumbKey && image.originalKey) {
      skipped += 1;
      continue;
    }

    try {
      const bucketId = image.bucketId || defaultBucketId;
      const bucketName = image.bucketName || defaultBucketName;
      const tokenPayload = await getDownloadAuth({
        apiUrl,
        authToken,
        bucketId,
        fileName: image.backblazeKey,
      });

      const sourceBuffer = await downloadFile({
        downloadUrl,
        bucketName,
        fileName: image.backblazeKey,
        token: tokenPayload.authorizationToken,
      });

      const originalExt = extFromContentType(image.contentType);
      const derived = await processImage({
        sourceBuffer,
        id: image.id,
        watermarkText,
        originalExt,
      });

      images[i] = {
        ...image,
        contentLength: derived.contentLength,
        width: derived.width,
        height: derived.height,
        watermarkVersion: 1,
        checksumSha256: derived.checksumSha256,
        originalKey: derived.originalKey,
        watermarkedKey: derived.watermarkedKey,
        thumbKey: derived.thumbKey,
      };
      migrated += 1;
      await writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`, "utf8");
      console.log(`[${i + 1}/${images.length}] migrated ${image.id}`);
    } catch (error) {
      failed += 1;
      failures.push({
        id: image.id,
        backblazeKey: image.backblazeKey,
        message: error?.message || String(error),
      });
      console.error(`[${i + 1}/${images.length}] failed ${image.id}: ${error?.message || error}`);
      continue;
    }
  }

  await writeFile(imagesPath, `${JSON.stringify(images, null, 2)}\n`, "utf8");
  await writeFile(
    failureReportPath,
    `${JSON.stringify({ timestamp: new Date().toISOString(), failed, failures }, null, 2)}\n`,
    "utf8",
  );
  console.log(`Done. migrated=${migrated} skipped=${skipped} failed=${failed} total=${images.length}`);
  console.log(`Failure report: ${failureReportPath}`);
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
