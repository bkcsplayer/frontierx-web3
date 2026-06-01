const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const PINATA_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const validTargets = new Set(["images", "metadata", "all"]);

loadRootEnv();

function getAuthStrategies() {
  const strategies = [];
  if (process.env.PINATA_JWT) {
    strategies.push({
      name: "PINATA_JWT",
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    });
  }

  if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
    strategies.push({
      name: "PINATA_API_KEY/PINATA_SECRET_KEY",
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
      },
    });
  }

  if (strategies.length === 0) {
    throw new Error("Set PINATA_JWT or PINATA_API_KEY/PINATA_SECRET_KEY before uploading.");
  }

  return strategies;
}

function loadRootEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function walkFiles(dir, allowedExtensions) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    const stats = fs.lstatSync(fullPath);
    if (stats.isSymbolicLink()) {
      throw new Error(`Refusing to upload symlink: ${path.relative(ROOT_DIR, fullPath)}`);
    }
    if (entry.isDirectory()) {
      return walkFiles(fullPath, allowedExtensions);
    }
    if (!allowedExtensions.has(path.extname(entry.name))) {
      throw new Error(`Refusing unexpected file type: ${path.relative(ROOT_DIR, fullPath)}`);
    }
    return [fullPath];
  });
}

async function uploadFolder(folderPath, pinName, allowedExtensions) {
  const absoluteFolder = path.resolve(ROOT_DIR, folderPath);
  if (!fs.existsSync(absoluteFolder)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  const files = walkFiles(absoluteFolder, allowedExtensions);
  const strategies = getAuthStrategies();
  let lastError;

  for (const strategy of strategies) {
    const formData = buildFormData(files, absoluteFolder, pinName);
    const response = await fetch(PINATA_ENDPOINT, {
      method: "POST",
      headers: strategy.headers,
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      const pathPrefix = path.basename(absoluteFolder);
      console.log(`${pinName} uploaded with ${strategy.name}: ipfs://${payload.IpfsHash}/${pathPrefix}/`);
      return { cid: payload.IpfsHash, pathPrefix };
    }

    lastError = `${pinName} upload failed with ${strategy.name}: ${response.status} ${JSON.stringify(payload)}`;
    if (response.status !== 401) {
      break;
    }
  }

  throw new Error(lastError);
}

function buildFormData(files, absoluteFolder, pinName) {
  const rootFolder = path.basename(absoluteFolder);
  const formData = new FormData();
  for (const filePath of files) {
    const relativePath = `${rootFolder}/${path.relative(absoluteFolder, filePath).replace(/\\/g, "/")}`;
    const bytes = fs.readFileSync(filePath);
    formData.append("file", new Blob([bytes]), relativePath);
  }

  formData.append(
    "pinataMetadata",
    JSON.stringify({
      name: pinName,
    }),
  );
  formData.append(
    "pinataOptions",
    JSON.stringify({
      cidVersion: 1,
      wrapWithDirectory: true,
    }),
  );
  return formData;
}

async function main() {
  const target = process.argv.find((arg) => arg.startsWith("--target="))?.split("=")[1] || "all";
  if (!validTargets.has(target)) {
    throw new Error(`Invalid --target=${target}. Use images, metadata, or all.`);
  }
  if (!process.argv.includes("--confirm-upload")) {
    throw new Error("Refusing public IPFS upload without --confirm-upload.");
  }

  validateAssets(target);

  let imagesUpload;
  let metadataUpload;

  if (target === "all" || target === "images") {
    imagesUpload = await uploadFolder("nft-art", "FrontierX-NFT-Images", new Set([".svg"]));
  }

  if (target === "all" || target === "metadata") {
    metadataUpload = await uploadFolder("nft-metadata", "FrontierX-NFT-Metadata", new Set([".json"]));
  }

  console.log("\n--- Upload Complete ---");
  if (imagesUpload) {
    console.log(`Images CID: ${imagesUpload.cid}`);
    console.log(`Images metadata argument: --imagesCID=${imagesUpload.cid}/${imagesUpload.pathPrefix}`);
  }
  if (metadataUpload) {
    console.log(`Metadata CID: ${metadataUpload.cid}`);
    console.log(`FrontierPass reveal base URI: ipfs://${metadataUpload.cid}/${metadataUpload.pathPrefix}/`);
  }
}

function validateAssets(target) {
  const args = ["scripts/validate-nft-assets.js", `--target=${target}`, "--pinata-free"];
  if (target === "metadata" || target === "all") {
    args.push("--require-final-cid");
  }

  const result = spawnSync(process.execPath, args, {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error("NFT asset validation failed; upload aborted.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
