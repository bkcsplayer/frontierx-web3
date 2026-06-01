const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const METADATA_DIR = path.join(ROOT_DIR, "nft-metadata");
const RARITY_MAP_PATH = path.join(ROOT_DIR, "rarity-map.json");
const TOTAL_SUPPLY = 100;

loadRootEnv();

const rarityConfig = {
  common: { tier: "Blue", multiplier: "1x", dailyYield: 100 },
  rare: { tier: "Purple", multiplier: "1.5x", dailyYield: 150 },
  epic: { tier: "Gold", multiplier: "2.5x", dailyYield: 250 },
  legendary: { tier: "Rainbow", multiplier: "5x", dailyYield: 500 },
};

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
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

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function validateRarityMap(rarityMap) {
  const counts = Object.values(rarityMap).reduce((acc, entry) => {
    acc[entry.rarity] = (acc[entry.rarity] || 0) + 1;
    return acc;
  }, {});

  const expected = { common: 60, rare: 25, epic: 10, legendary: 5 };
  for (const [rarity, count] of Object.entries(expected)) {
    if (counts[rarity] !== count) {
      throw new Error(`Invalid rarity-map distribution for ${rarity}: expected ${count}, got ${counts[rarity] || 0}`);
    }
  }
}

function createMetadata(tokenId, rarityEntry, imagesCid, imageMode) {
  const config = rarityConfig[rarityEntry.rarity];
  const tokenLabel = String(tokenId).padStart(4, "0");
  const imagePath =
    imageMode === "shared"
      ? `${rarityEntry.rarity}.svg`
      : `${rarityEntry.rarity}/${tokenId}.svg`;

  return {
    name: `Frontier Access Pass #${tokenLabel}`,
    description:
      "An exclusive access pass to the FrontierX Protocol ecosystem. Stake to earn FRX tokens, unlock the AI Agent Hub, and enter the Game Zone.",
    image: `ipfs://${imagesCid}/${imagePath}`,
    external_url: "https://frontierx.khtain.com",
    attributes: [
      { trait_type: "Rarity", value: titleCase(rarityEntry.rarity) },
      { trait_type: "Tier", value: config.tier },
      { trait_type: "Staking Multiplier", value: config.multiplier },
      { trait_type: "Daily FRX Yield", display_type: "number", value: config.dailyYield },
      { trait_type: "Pass Number", display_type: "number", value: tokenId, max_value: TOTAL_SUPPLY },
      { trait_type: "Access Level", value: "Full" },
    ],
  };
}

function main() {
  const imagesCid = parseArg("imagesCID", "PLACEHOLDER_IMAGES_CID");
  const imageMode = parseArg("imageMode", process.env.NFT_IMAGE_MODE || "shared");
  const placeholderImage = parseArg("placeholderImage", `ipfs://${imagesCid}/placeholder.svg`);
  const feeRecipient = parseArg("feeRecipient", process.env.TREASURY_WALLET || process.env.ROYALTY_RECEIVER || "");

  if (!["shared", "full"].includes(imageMode)) {
    throw new Error("Invalid image mode. Use --imageMode=shared or --imageMode=full.");
  }

  if (!fs.existsSync(RARITY_MAP_PATH)) {
    throw new Error("rarity-map.json not found. Run node scripts/generate-nft-art.js first.");
  }

  resetDir(METADATA_DIR);
  const rarityMap = JSON.parse(fs.readFileSync(RARITY_MAP_PATH, "utf8"));
  validateRarityMap(rarityMap);

  for (const rarity of Object.keys(rarityConfig)) {
    const rarityDir = path.join(METADATA_DIR, rarity);
    ensureDir(rarityDir);

    for (let tokenId = 1; tokenId <= TOTAL_SUPPLY; tokenId++) {
      const rarityEntry = {
        tokenId,
        rarity,
      };
      const metadata = createMetadata(tokenId, rarityEntry, imagesCid, imageMode);
      fs.writeFileSync(path.join(rarityDir, `${tokenId}.json`), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    }
  }

  const placeholder = {
    name: "Frontier Access Pass (Unrevealed)",
    description: "This Frontier Access Pass has not been revealed yet. Stay tuned.",
    image: placeholderImage,
    external_url: "https://frontierx.khtain.com",
    attributes: [{ trait_type: "Status", value: "Unrevealed" }],
  };

  const collection = {
    name: "Frontier Access Pass",
    description:
      "100 exclusive access passes to the FrontierX Protocol, a Web3 x AI ecosystem for staking, games, and AI agent utilities.",
    image: placeholderImage,
    external_link: "https://frontierx.khtain.com",
    seller_fee_basis_points: 500,
  };

  if (feeRecipient) {
    collection.fee_recipient = feeRecipient;
  }

  fs.writeFileSync(path.join(METADATA_DIR, "placeholder.json"), `${JSON.stringify(placeholder, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(METADATA_DIR, "collection.json"), `${JSON.stringify(collection, null, 2)}\n`, "utf8");

  console.log(`Generated ${TOTAL_SUPPLY * Object.keys(rarityConfig).length} rarity metadata files, placeholder.json, and collection.json`);
}

main();
