import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(root, "frontierx-web");

function parseEnv(path) {
  const map = new Map();
  if (!existsSync(path)) return map;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    map.set(key, value);
  }
  return map;
}

const vars = parseEnv(join(root, ".env"));
for (const [key, value] of parseEnv(join(root, "frontierx-contracts/deployments/frontend-env.sepolia.env"))) {
  if (!vars.get(key)) vars.set(key, value);
}

const keys = [
  "NEXT_PUBLIC_WC_PROJECT_ID",
  "NEXT_PUBLIC_SEPOLIA_RPC_URL",
  "NEXT_PUBLIC_SEPOLIA_FRX_TOKEN_ADDRESS",
  "NEXT_PUBLIC_SEPOLIA_FRONTIER_PASS_ADDRESS",
  "NEXT_PUBLIC_SEPOLIA_FRX_STAKING_ADDRESS",
  "NEXT_PUBLIC_SEPOLIA_FRX_LOTTERY_ADDRESS",
  "NEXT_PUBLIC_SEPOLIA_CRYSTAL_FORGE_ADDRESS",
  "NEXT_PUBLIC_PINATA_GATEWAY_URL",
  "SEPOLIA_RPC_URL",
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "DEEPSEEK_MODEL",
  "MINIMAX_API_KEY",
  "MINIMAX_BASE_URL",
  "MINIMAX_MODEL",
  "ALLOW_IN_MEMORY_BURN_GUARD",
];

// Demo default when not in .env (serverless in-memory burn guard).
if (!vars.get("ALLOW_IN_MEMORY_BURN_GUARD")) {
  vars.set("ALLOW_IN_MEMORY_BURN_GUARD", "true");
}

const missing = [];

for (const name of keys) {
  const value = vars.get(name);
  if (!value) {
    missing.push(name);
    continue;
  }
  const sensitive = !name.startsWith("NEXT_PUBLIC_");
  const args = [
    "env",
    "add",
    name,
    "production",
    "--value",
    value,
    "--yes",
    "--force",
    "--non-interactive",
  ];
  if (sensitive) args.push("--sensitive");
  execSync(`vercel ${args.map((part) => (/\s/.test(part) ? `"${part.replace(/"/g, '\\"')}"` : part)).join(" ")}`, {
    cwd: webDir,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120_000,
  });
  console.log(`OK ${name}`);
}

if (missing.length) {
  console.log("\nSkipped (empty):");
  for (const name of missing) console.log(`  - ${name}`);
}

console.log("\nDone. Run: cd frontierx-web && vercel --prod");
