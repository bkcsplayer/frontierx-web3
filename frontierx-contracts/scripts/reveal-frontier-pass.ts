import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";

const deploymentsDir = path.join(__dirname, "..", "deployments");
const manifestPath = path.join(deploymentsDir, "addresses.json");
const expectedChainIds: Record<string, number> = {
  localhost: 31337,
  sepolia: 11155111,
  polygon: 137,
  base: 8453,
};

async function main() {
  assertExpectedChain();
  await assertProviderChainId();
  assertRevealAllowed();

  const frontierPassAddress = getFrontierPassAddress();
  const baseURI = getBaseURI();
  const frontierPass = await ethers.getContractAt("FrontierPass", frontierPassAddress);
  const [signer] = await ethers.getSigners();

  const owner = await frontierPass.owner();
  if (ethers.getAddress(owner) !== ethers.getAddress(signer.address)) {
    throw new Error(`Connected signer is not FrontierPass owner. Owner: ${owner}`);
  }

  const alreadyRevealed = await frontierPass.revealed();
  if (alreadyRevealed) {
    console.log(`FrontierPass already revealed on ${network.name}`);
    return;
  }

  const totalSupply = await frontierPass.totalSupply();
  if (totalSupply === 0n) {
    throw new Error("Cannot reveal before at least one pass is minted. Minting closes after reveal.");
  }

  console.log(`Revealing FrontierPass ${frontierPassAddress} on ${network.name}`);
  console.log(`Base URI: ${baseURI}`);
  console.log(`Current supply: ${totalSupply.toString()}`);

  const tx = await frontierPass.reveal(baseURI);
  const receipt = await tx.wait();

  updateManifest({
    frontierPassAddress,
    baseURI,
    transactionHash: tx.hash,
    blockNumber: receipt?.blockNumber,
  });

  console.log(`Reveal complete: ${tx.hash}`);
}

function getFrontierPassAddress() {
  const explicit = process.env.FRONTIER_PASS_ADDRESS;
  const manifest = readManifest();
  const networkRecord = manifest[network.name] as { frontierPass?: string } | undefined;

  if (explicit) {
    const explicitAddress = validateAddress(explicit, "FRONTIER_PASS_ADDRESS");
    if (networkRecord?.frontierPass && ethers.getAddress(networkRecord.frontierPass) !== explicitAddress) {
      throw new Error(
        `FRONTIER_PASS_ADDRESS does not match deployments.${network.name}.frontierPass. Refusing to merge incompatible deployments.`,
      );
    }
    return explicitAddress;
  }

  if (networkRecord?.frontierPass) {
    return validateAddress(networkRecord.frontierPass, `deployments.${network.name}.frontierPass`);
  }

  throw new Error("Set FRONTIER_PASS_ADDRESS or deploy first so deployments/addresses.json contains this network.");
}

function getBaseURI() {
  const explicit = process.env.FRONTIER_PASS_BASE_URI;
  if (explicit) return validateBaseURI(ensureTrailingSlash(explicit));

  const metadataCid = process.env.METADATA_CID;
  if (metadataCid) {
    return validateBaseURI(`ipfs://${metadataCid.replace(/^ipfs:\/\//, "").replace(/\/$/, "")}/`);
  }

  throw new Error("Set FRONTIER_PASS_BASE_URI or METADATA_CID before reveal.");
}

function assertExpectedChain() {
  const expected = expectedChainIds[network.name];
  if (!expected) {
    throw new Error(`Unsupported reveal network: ${network.name}`);
  }
}

async function assertProviderChainId() {
  const expected = expectedChainIds[network.name];
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (chainId !== expected) {
    throw new Error(`RPC chainId mismatch for ${network.name}: expected ${expected}, got ${chainId}`);
  }
}

function assertRevealAllowed() {
  if (network.name === "polygon" || network.name === "base") {
    if (process.env.ALLOW_MAINNET_REVEAL !== "true") {
      throw new Error(`Refusing ${network.name} reveal unless ALLOW_MAINNET_REVEAL=true`);
    }
    if (process.env.CONFIRM_REVEAL_NETWORK !== network.name) {
      throw new Error(`Set CONFIRM_REVEAL_NETWORK=${network.name} to confirm irreversible reveal.`);
    }
  }
}

function validateBaseURI(value: string) {
  if (!value.startsWith("ipfs://")) {
    throw new Error("Reveal base URI must start with ipfs://");
  }
  if (/\s|\?/.test(value)) {
    throw new Error("Reveal base URI must not contain whitespace or query strings");
  }
  return value;
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function validateAddress(value: string, name: string) {
  if (!ethers.isAddress(value)) {
    throw new Error(`${name} must be a valid address`);
  }
  return ethers.getAddress(value);
}

function readManifest(): Record<string, unknown> {
  if (!fs.existsSync(manifestPath)) return {};
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function updateManifest({
  frontierPassAddress,
  baseURI,
  transactionHash,
  blockNumber,
}: {
  frontierPassAddress: string;
  baseURI: string;
  transactionHash: string;
  blockNumber?: number;
}) {
  if (!fs.existsSync(manifestPath)) return;

  const manifest = readManifest();
  const existing = manifest[network.name];
  if (!existing || typeof existing !== "object") return;

  manifest[network.name] = {
    ...existing,
    frontierPass: frontierPassAddress,
    metadataBaseURI: baseURI,
    revealTransaction: transactionHash,
    revealedAt: new Date().toISOString(),
    revealBlockNumber: blockNumber,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
