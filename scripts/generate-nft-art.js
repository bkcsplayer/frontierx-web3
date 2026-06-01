const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const ART_DIR = path.join(ROOT_DIR, "nft-art");
const RARITY_MAP_PATH = path.join(ROOT_DIR, "rarity-map.json");
const TOTAL_SUPPLY = 100;
const ART_MODE = parseArg("mode", process.env.NFT_ART_MODE || "shared");

const RARITIES = {
  common: {
    count: 60,
    tier: 1,
    bg: "#0A0E1A",
    accent: "#3B82F6",
    glow: "#3B82F6",
    borderWidth: 2,
    label: "COMMON",
    multiplier: "1x",
    dailyYield: "100 FRX",
  },
  rare: {
    count: 25,
    tier: 2,
    bg: "#0D0A1A",
    accent: "#8B5CF6",
    glow: "#8B5CF6",
    borderWidth: 4,
    label: "RARE",
    multiplier: "1.5x",
    dailyYield: "150 FRX",
  },
  epic: {
    count: 10,
    tier: 3,
    bg: "#1A150A",
    accent: "#F59E0B",
    glow: "#F59E0B",
    borderWidth: 6,
    label: "EPIC",
    multiplier: "2.5x",
    dailyYield: "250 FRX",
  },
  legendary: {
    count: 5,
    tier: 4,
    bg: "#050505",
    accent: "url(#rainbow)",
    glow: "#FFFFFF",
    borderWidth: 8,
    label: "LEGENDARY",
    multiplier: "5x",
    dailyYield: "500 FRX",
  },
};

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function buildRarityMap() {
  const rarityMap = {};
  let tokenId = 1;

  for (const [rarity, config] of Object.entries(RARITIES)) {
    for (let i = 0; i < config.count; i++) {
      rarityMap[tokenId] = {
        tokenId,
        rarity,
        tier: config.tier,
        stakingMultiplier: config.multiplier,
        dailyYield: config.dailyYield,
      };
      tokenId++;
    }
  }

  return rarityMap;
}

function seededValue(seed, index, min, max) {
  const raw = Math.sin(seed * 9973 + index * 7919) * 10000;
  const normalized = raw - Math.floor(raw);
  return Math.round(min + normalized * (max - min));
}

function crystalEmblem(rarity, config) {
  const stroke = rarity === "legendary" ? "url(#rainbow)" : config.accent;
  const fill = rarity === "legendary" ? "url(#rainbow)" : config.accent;
  const orbit =
    rarity === "legendary"
      ? `<circle cx="400" cy="500" r="188" fill="none" stroke="url(#rainbow)" stroke-width="1.2" opacity="0.42"/>
  <circle cx="400" cy="500" r="156" fill="none" stroke="url(#rainbow)" stroke-width="0.8" opacity="0.28"/>`
      : `<circle cx="400" cy="500" r="188" fill="none" stroke="${config.accent}" stroke-width="1.2" opacity="0.34"/>
  <circle cx="400" cy="500" r="156" fill="none" stroke="${config.accent}" stroke-width="0.8" opacity="0.22"/>`;

  return `${orbit}
  <g filter="url(#glow)">
    <polygon points="400,332 520,410 520,590 400,668 280,590 280,410" fill="rgba(255,255,255,0.02)" stroke="${stroke}" stroke-width="${config.borderWidth}" opacity="0.95"/>
    <polygon points="400,372 484,424 484,576 400,628 316,576 316,424" fill="${fill}" fill-opacity="0.14" stroke="${stroke}" stroke-width="1.6" opacity="0.92"/>
    <polygon points="400,412 448,444 448,556 400,588 352,556 352,444" fill="${fill}" fill-opacity="0.24" stroke="${stroke}" stroke-width="1.2" opacity="0.88"/>
    <path d="M 400 372 L 484 424 L 400 500 L 316 424 Z" fill="${fill}" fill-opacity="0.1" stroke="${stroke}" stroke-width="0.9" opacity="0.7"/>
    <path d="M 400 500 L 484 576 L 400 628 L 316 576 Z" fill="${fill}" fill-opacity="0.08" stroke="${stroke}" stroke-width="0.9" opacity="0.65"/>
    <line x1="400" y1="332" x2="400" y2="668" stroke="${stroke}" stroke-width="0.8" opacity="0.45"/>
    <line x1="280" y1="500" x2="520" y2="500" stroke="${stroke}" stroke-width="0.8" opacity="0.45"/>
    <line x1="316" y1="424" x2="484" y2="576" stroke="${stroke}" stroke-width="0.7" opacity="0.35"/>
    <line x1="484" y1="424" x2="316" y2="576" stroke="${stroke}" stroke-width="0.7" opacity="0.35"/>
    <circle cx="400" cy="500" r="18" fill="#F8FAFC" fill-opacity="0.92" stroke="${stroke}" stroke-width="1.2"/>
    <circle cx="400" cy="500" r="42" fill="none" stroke="${stroke}" stroke-width="1" opacity="0.35"/>
  </g>
  <g opacity="0.55">
    <line x1="150" y1="250" x2="230" y2="310" stroke="${stroke}" stroke-width="0.8"/>
    <line x1="650" y1="250" x2="570" y2="310" stroke="${stroke}" stroke-width="0.8"/>
    <line x1="150" y1="750" x2="230" y2="690" stroke="${stroke}" stroke-width="0.8"/>
    <line x1="650" y1="750" x2="570" y2="690" stroke="${stroke}" stroke-width="0.8"/>
  </g>`;
}

function patternFor(tokenId, rarity, config) {
  return crystalEmblem(rarity, config);
}

function generateCard(tokenId, rarity, options = {}) {
  const config = RARITIES[rarity];
  const pattern = patternFor(tokenId, rarity, config);
  const tokenLabel = options.tokenLabel || String(tokenId).padStart(4, "0");
  const serialLabel = options.serialLabel || `#${tokenLabel} / ${TOTAL_SUPPLY}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200" role="img" aria-label="FrontierX ${config.label} Access Pass ${tokenLabel}">
  <defs>
    <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="25%" stop-color="#F59E0B"/>
      <stop offset="50%" stop-color="#10B981"/>
      <stop offset="75%" stop-color="#06B6D4"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <radialGradient id="glass" cx="50%" cy="25%" r="80%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.13"/>
      <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.18"/>
    </radialGradient>
  </defs>
  <rect width="800" height="1200" fill="${config.bg}" rx="32"/>
  <rect x="24" y="24" width="752" height="1152" fill="url(#glass)" stroke="${config.accent}" stroke-width="${config.borderWidth}" rx="28" filter="url(#glow)"/>
  <rect x="70" y="62" width="660" height="112" fill="rgba(255,255,255,0.04)" stroke="${config.accent}" stroke-width="1" rx="18" opacity="0.9"/>
  <text x="400" y="112" text-anchor="middle" fill="${config.accent}" font-family="Orbitron, monospace" font-size="30" font-weight="700" letter-spacing="5" filter="url(#glow)">FRONTIERX PROTOCOL</text>
  <text x="400" y="150" text-anchor="middle" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-size="16" letter-spacing="9" opacity="0.76">ACCESS PASS</text>
  <rect x="100" y="220" width="600" height="600" fill="rgba(255,255,255,0.025)" stroke="${config.accent}" stroke-width="1" rx="24" opacity="0.85"/>
  ${pattern}
  <line x1="130" y1="860" x2="670" y2="860" stroke="${config.accent}" stroke-width="1" opacity="0.42"/>
  <text x="400" y="920" text-anchor="middle" fill="${config.accent}" font-family="Orbitron, monospace" font-size="34" font-weight="700" letter-spacing="6" filter="url(#glow)">${config.label}</text>
  <text x="400" y="966" text-anchor="middle" fill="#F8FAFC" font-family="JetBrains Mono, monospace" font-size="18" opacity="0.78">${serialLabel}</text>
  <text x="400" y="1012" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="15" opacity="0.72">YIELD ${config.dailyYield} DAILY · MULTIPLIER ${config.multiplier}</text>
  <rect x="80" y="1066" width="640" height="10" rx="5" fill="${rarity === "legendary" ? "url(#rainbow)" : config.accent}" opacity="0.82"/>
  <text x="400" y="1126" text-anchor="middle" fill="#64748B" font-family="JetBrains Mono, monospace" font-size="12" letter-spacing="4">KHTAIN BLOCK TECHNOLOGY LTD</text>
</svg>
`;
}

function generatePlaceholder() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200" role="img" aria-label="Unrevealed Frontier Access Pass">
  <defs>
    <linearGradient id="hidden" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="50%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="800" height="1200" fill="#050510" rx="32"/>
  <rect x="24" y="24" width="752" height="1152" fill="rgba(255,255,255,0.035)" stroke="url(#hidden)" stroke-width="4" rx="28" filter="url(#glow)"/>
  <text x="400" y="120" text-anchor="middle" fill="url(#hidden)" font-family="Orbitron, monospace" font-size="30" font-weight="700" letter-spacing="5">FRONTIERX PROTOCOL</text>
  <text x="400" y="170" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="16" letter-spacing="8">ACCESS PASS</text>
  <g filter="url(#glow)" opacity="0.88">
    <polygon points="400,360 500,430 500,610 400,680 300,610 300,430" fill="rgba(255,255,255,0.03)" stroke="url(#hidden)" stroke-width="2.5"/>
    <polygon points="400,410 460,450 460,590 400,630 340,590 340,450" fill="url(#hidden)" fill-opacity="0.12" stroke="url(#hidden)" stroke-width="1.2"/>
    <circle cx="400" cy="520" r="28" fill="#F8FAFC" fill-opacity="0.85"/>
  </g>
  <text x="400" y="920" text-anchor="middle" fill="#F8FAFC" font-family="Orbitron, monospace" font-size="34" font-weight="700" letter-spacing="6">UNREVEALED</text>
  <text x="400" y="970" text-anchor="middle" fill="#CBD5E1" font-family="JetBrains Mono, monospace" font-size="16">RARITY ASSIGNED AT REVEAL</text>
  <rect x="80" y="1066" width="640" height="10" rx="5" fill="url(#hidden)" opacity="0.82"/>
</svg>
`;
}

function main() {
  if (!["shared", "full"].includes(ART_MODE)) {
    throw new Error("Invalid art mode. Use --mode=shared or --mode=full.");
  }

  resetDir(ART_DIR);

  const rarityMap = buildRarityMap();
  if (ART_MODE === "shared") {
    for (const [rarity, config] of Object.entries(RARITIES)) {
      fs.writeFileSync(
        path.join(ART_DIR, `${rarity}.svg`),
        generateCard(config.tier, rarity, {
          tokenLabel: "SHARED",
          serialLabel: `${config.label} SHARED ART`,
        }),
        "utf8",
      );
    }
  } else {
    for (const [rarity] of Object.entries(RARITIES)) {
      const rarityDir = path.join(ART_DIR, rarity);
      ensureDir(rarityDir);

      for (let tokenId = 1; tokenId <= TOTAL_SUPPLY; tokenId++) {
        fs.writeFileSync(path.join(rarityDir, `${tokenId}.svg`), generateCard(tokenId, rarity), "utf8");
      }
    }
  }

  fs.writeFileSync(path.join(ART_DIR, "placeholder.svg"), generatePlaceholder(), "utf8");
  fs.writeFileSync(RARITY_MAP_PATH, `${JSON.stringify(rarityMap, null, 2)}\n`, "utf8");
  console.log(
    ART_MODE === "shared"
      ? `Generated ${Object.keys(RARITIES).length} shared rarity SVG cards + placeholder in ${path.relative(ROOT_DIR, ART_DIR)}`
      : `Generated ${TOTAL_SUPPLY * Object.keys(RARITIES).length} rarity SVG cards + placeholder in ${path.relative(ROOT_DIR, ART_DIR)}`,
  );
  console.log(`Generated ${path.relative(ROOT_DIR, RARITY_MAP_PATH)}`);
}

main();
