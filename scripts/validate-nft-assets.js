const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const ART_DIR = path.join(ROOT_DIR, "nft-art");
const METADATA_DIR = path.join(ROOT_DIR, "nft-metadata");
const RARITY_MAP_PATH = path.join(ROOT_DIR, "rarity-map.json");
const TOTAL_SUPPLY = 100;
const EXPECTED_RARITIES = {
  common: 60,
  rare: 25,
  epic: 10,
  legendary: 5,
};
const PINATA_FREE_FILE_LIMIT = 500;

const requireFinalCid = process.argv.includes("--require-final-cid");
const requirePinataFree = process.argv.includes("--pinata-free");
const assetMode = parseArg("mode", process.env.NFT_ASSET_MODE || "shared");
const target = parseArg("target", "all");

function main() {
  if (!["shared", "full"].includes(assetMode)) {
    throw new Error("Invalid asset mode. Use --mode=shared or --mode=full.");
  }
  if (!["images", "metadata", "all"].includes(target)) {
    throw new Error("Invalid validation target. Use --target=images, --target=metadata, or --target=all.");
  }

  if (target === "images" || target === "all") {
    assertDirectory(ART_DIR);
    assertFile(RARITY_MAP_PATH);

    const rarityMap = JSON.parse(fs.readFileSync(RARITY_MAP_PATH, "utf8"));
    validateRarityMap(rarityMap);
    validateArtFiles();
  }

  if (target === "metadata" || target === "all") {
    assertDirectory(METADATA_DIR);
    validateMetadataFiles();
  }

  validatePinataFileBudget();

  console.log("NFT asset validation passed.");
  if (!requireFinalCid) {
    console.log("Note: use --require-final-cid after Pinata upload to fail on PLACEHOLDER_IMAGES_CID.");
  }
}

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function validateRarityMap(rarityMap) {
  const entries = Object.values(rarityMap);
  assert(entries.length === TOTAL_SUPPLY, `rarity-map.json must contain ${TOTAL_SUPPLY} token entries`);

  const counts = entries.reduce((acc, entry) => {
    assert(Number.isInteger(entry.tokenId), "rarity-map tokenId must be an integer");
    assert(entry.tokenId >= 1 && entry.tokenId <= TOTAL_SUPPLY, `rarity-map tokenId out of range: ${entry.tokenId}`);
    assert(entry.rarity in EXPECTED_RARITIES, `unknown rarity in rarity-map: ${entry.rarity}`);
    acc[entry.rarity] = (acc[entry.rarity] || 0) + 1;
    return acc;
  }, {});

  for (const [rarity, expected] of Object.entries(EXPECTED_RARITIES)) {
    assert(counts[rarity] === expected, `${rarity} count must be ${expected}, got ${counts[rarity] || 0}`);
  }
}

function validateArtFiles() {
  const expectedRootEntries =
    assetMode === "shared"
      ? [...Object.keys(EXPECTED_RARITIES).map((rarity) => `${rarity}.svg`), "placeholder.svg"]
      : [...Object.keys(EXPECTED_RARITIES), "placeholder.svg"];

  assertExactEntries(ART_DIR, expectedRootEntries);
  assertFile(path.join(ART_DIR, "placeholder.svg"));
  validateSvg(path.join(ART_DIR, "placeholder.svg"));

  for (const rarity of Object.keys(EXPECTED_RARITIES)) {
    if (assetMode === "shared") {
      const filePath = path.join(ART_DIR, `${rarity}.svg`);
      assertFile(filePath);
      validateSvg(filePath);
      continue;
    }

    const rarityDir = path.join(ART_DIR, rarity);
    assertDirectory(rarityDir);
    assertExactEntries(
      rarityDir,
      Array.from({ length: TOTAL_SUPPLY }, (_, index) => `${index + 1}.svg`),
    );

    for (let tokenId = 1; tokenId <= TOTAL_SUPPLY; tokenId++) {
      const filePath = path.join(rarityDir, `${tokenId}.svg`);
      assertFile(filePath);
      validateSvg(filePath);
    }
  }
}

function validateMetadataFiles() {
  assertExactEntries(METADATA_DIR, [...Object.keys(EXPECTED_RARITIES), "placeholder.json", "collection.json"]);
  assertFile(path.join(METADATA_DIR, "placeholder.json"));
  assertFile(path.join(METADATA_DIR, "collection.json"));

  const placeholder = readJson(path.join(METADATA_DIR, "placeholder.json"));
  validateImage(placeholder.image, "placeholder.json image");

  const collection = readJson(path.join(METADATA_DIR, "collection.json"));
  assert(collection.name === "Frontier Access Pass", "collection.json name mismatch");
  validateImage(collection.image, "collection.json image");

  for (const rarity of Object.keys(EXPECTED_RARITIES)) {
    const rarityDir = path.join(METADATA_DIR, rarity);
    assertDirectory(rarityDir);
    assertExactEntries(
      rarityDir,
      Array.from({ length: TOTAL_SUPPLY }, (_, index) => `${index + 1}.json`),
    );

    for (let tokenId = 1; tokenId <= TOTAL_SUPPLY; tokenId++) {
      const filePath = path.join(rarityDir, `${tokenId}.json`);
      const metadata = readJson(filePath);
      assert(metadata.name === `Frontier Access Pass #${String(tokenId).padStart(4, "0")}`, `${relative(filePath)} name mismatch`);
      validateImage(metadata.image, `${relative(filePath)} image`);
      validateMetadataImagePath(metadata.image, rarity, tokenId, relative(filePath));
      assert(Array.isArray(metadata.attributes), `${relative(filePath)} attributes must be an array`);
      assert(metadata.attributes.some((item) => item.trait_type === "Rarity"), `${relative(filePath)} missing Rarity attribute`);
    }
  }
}

function validateMetadataImagePath(image, rarity, tokenId, label) {
  const expectedSuffix = assetMode === "shared" ? `/${rarity}.svg` : `/${rarity}/${tokenId}.svg`;
  assert(image.endsWith(expectedSuffix), `${label} image must end with ${expectedSuffix}`);
}

function validatePinataFileBudget() {
  if (!requirePinataFree) return;

  const totalFiles =
    (fs.existsSync(ART_DIR) ? countFiles(ART_DIR) : 0) +
    (fs.existsSync(METADATA_DIR) ? countFiles(METADATA_DIR) : 0);
  assert(
    totalFiles <= PINATA_FREE_FILE_LIMIT,
    `Pinata Free file budget exceeded: ${totalFiles}/${PINATA_FREE_FILE_LIMIT} files`,
  );
}

function validateSvg(filePath) {
  const svg = fs.readFileSync(filePath, "utf8");
  assert(svg.includes("<svg"), `${relative(filePath)} must contain SVG markup`);
  assert(!/<script\b/i.test(svg), `${relative(filePath)} must not contain <script>`);
  assert(!/\son[a-z]+\s*=/i.test(svg), `${relative(filePath)} must not contain inline event handlers`);
  assert(!/(?:href|xlink:href)\s*=\s*["']https?:/i.test(svg), `${relative(filePath)} must not contain external hrefs`);
}

function assertExactEntries(dir, expectedEntries) {
  const expected = new Set(expectedEntries);
  const actual = fs.readdirSync(dir);

  for (const entry of actual) {
    assert(expected.has(entry), `Unexpected file or directory: ${relative(path.join(dir, entry))}`);
  }

  for (const entry of expected) {
    assert(actual.includes(entry), `Missing expected entry: ${relative(path.join(dir, entry))}`);
  }
}

function validateImage(image, label) {
  assert(typeof image === "string" && image.startsWith("ipfs://"), `${label} must be an ipfs:// URI`);
  if (requireFinalCid) {
    assert(!image.includes("PLACEHOLDER_IMAGES_CID"), `${label} still contains PLACEHOLDER_IMAGES_CID`);
  }
}

function readJson(filePath) {
  assertFile(filePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertDirectory(dir) {
  assert(fs.existsSync(dir), `Missing directory: ${relative(dir)}`);
  const stats = fs.lstatSync(dir);
  assert(!stats.isSymbolicLink(), `Symlinks are not allowed: ${relative(dir)}`);
  assert(stats.isDirectory(), `Missing directory: ${relative(dir)}`);
}

function assertFile(filePath) {
  assert(fs.existsSync(filePath), `Missing file: ${relative(filePath)}`);
  const stats = fs.lstatSync(filePath);
  assert(!stats.isSymbolicLink(), `Symlinks are not allowed: ${relative(filePath)}`);
  assert(stats.isFile(), `Missing file: ${relative(filePath)}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return total + countFiles(fullPath);
    return total + 1;
  }, 0);
}

function relative(filePath) {
  return path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
}

main();
