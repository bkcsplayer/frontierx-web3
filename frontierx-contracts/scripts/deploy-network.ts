import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";

type SupportedDeployNetwork = "localhost" | "sepolia" | "polygon" | "base";

type DeploymentRecord = {
  network: SupportedDeployNetwork;
  chainId: number;
  deployer: string;
  treasuryWallet: string;
  royaltyReceiver: string;
  mintPriceWei: string;
  placeholderURI: string;
  frxToken: string;
  frontierPass: string;
  staking: string;
  lottery: string;
  crystalForge: string;
  transactions: {
    frxToken?: string;
    frontierPass?: string;
    staking?: string;
    lottery?: string;
    crystalForge?: string;
    setStakingContract?: string;
  };
  deployedAt: string;
  blockNumber?: number;
};

const supportedNetworks = new Set(["localhost", "sepolia", "polygon", "base"]);
const expectedChainIds: Record<SupportedDeployNetwork, number> = {
  localhost: 31337,
  sepolia: 11155111,
  polygon: 137,
  base: 8453,
};
const repoRoot = path.resolve(__dirname, "..", "..");
const deploymentsDir = path.join(__dirname, "..", "deployments");
const manifestPath = path.join(deploymentsDir, "addresses.json");

async function main() {
  const networkName = network.name as SupportedDeployNetwork;
  if (!supportedNetworks.has(networkName)) {
    throw new Error(`Unsupported deployment network: ${network.name}`);
  }

  if ((networkName === "polygon" || networkName === "base") && process.env.ALLOW_MAINNET_DEPLOY !== "true") {
    throw new Error(`Refusing ${networkName} mainnet deployment unless ALLOW_MAINNET_DEPLOY=true`);
  }

  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (chainId !== expectedChainIds[networkName]) {
    throw new Error(`RPC chainId mismatch for ${networkName}: expected ${expectedChainIds[networkName]}, got ${chainId}`);
  }
  assertCanWriteDeploymentRecord(networkName);

  const treasuryWallet = readAddressEnv("TREASURY_WALLET");
  const royaltyReceiver = readAddressEnv("ROYALTY_RECEIVER", treasuryWallet);
  const mintPrice = getMintPrice(networkName);
  const placeholderURI = getPlaceholderURI(networkName);

  console.log(`Deploying FrontierX contracts to ${networkName} (${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Treasury: ${treasuryWallet}`);
  console.log(`Royalty receiver: ${royaltyReceiver}`);
  console.log(`Mint price: ${mintPrice.toString()} wei`);
  console.log(`Placeholder URI: ${placeholderURI}`);

  const FRXToken = await ethers.getContractFactory("FRXToken");
  const frxToken = await FRXToken.deploy(treasuryWallet);
  await frxToken.waitForDeployment();

  const FrontierPass = await ethers.getContractFactory("FrontierPass");
  const frontierPass = await FrontierPass.deploy(mintPrice, placeholderURI, royaltyReceiver);
  await frontierPass.waitForDeployment();

  const FRXStaking = await ethers.getContractFactory("FRXStaking");
  const frxStaking = await FRXStaking.deploy(await frxToken.getAddress(), await frontierPass.getAddress());
  await frxStaking.waitForDeployment();

  const FRXLottery = await ethers.getContractFactory("FRXLottery");
  const frxLottery = await FRXLottery.deploy(await frxToken.getAddress());
  await frxLottery.waitForDeployment();

  const CrystalForge = await ethers.getContractFactory("CrystalForge");
  const crystalForge = await CrystalForge.deploy(await frxToken.getAddress());
  await crystalForge.waitForDeployment();

  const setStakingTx = await frxToken.setStakingContract(await frxStaking.getAddress());
  const setStakingReceipt = await setStakingTx.wait();

  const record: DeploymentRecord = {
    network: networkName,
    chainId,
    deployer: deployer.address,
    treasuryWallet,
    royaltyReceiver,
    mintPriceWei: mintPrice.toString(),
    placeholderURI,
    frxToken: await frxToken.getAddress(),
    frontierPass: await frontierPass.getAddress(),
    staking: await frxStaking.getAddress(),
    lottery: await frxLottery.getAddress(),
    crystalForge: await crystalForge.getAddress(),
    transactions: {
      frxToken: frxToken.deploymentTransaction()?.hash,
      frontierPass: frontierPass.deploymentTransaction()?.hash,
      staking: frxStaking.deploymentTransaction()?.hash,
      lottery: frxLottery.deploymentTransaction()?.hash,
      crystalForge: crystalForge.deploymentTransaction()?.hash,
      setStakingContract: setStakingTx.hash,
    },
    deployedAt: new Date().toISOString(),
    blockNumber: setStakingReceipt?.blockNumber,
  };

  writeDeploymentRecord(record);
  writeFrontendEnvSnippet(record);

  console.log("\n--- Deployment Complete ---");
  console.log(JSON.stringify(record, null, 2));
  console.log(`\nManifest updated: ${path.relative(repoRoot, manifestPath)}`);
  console.log(`Frontend env snippet: ${path.relative(repoRoot, frontendEnvPath(networkName))}`);
}

function getMintPrice(networkName: SupportedDeployNetwork) {
  if (process.env.MINT_PRICE_WEI) {
    return BigInt(process.env.MINT_PRICE_WEI);
  }

  if (networkName === "polygon") {
    return ethers.parseEther("10");
  }

  return ethers.parseEther("0.003");
}

function getPlaceholderURI(networkName: SupportedDeployNetwork) {
  const explicit = process.env.FRONTIER_PASS_PLACEHOLDER_URI;
  if (explicit) {
    if (networkName !== "localhost" && !explicit.startsWith("ipfs://")) {
      throw new Error("FRONTIER_PASS_PLACEHOLDER_URI must be an ipfs:// URI for non-local deployments");
    }
    return explicit;
  }

  const metadataCid = process.env.METADATA_CID;
  if (metadataCid) {
    return `ipfs://${metadataCid.replace(/^ipfs:\/\//, "").replace(/\/$/, "")}/placeholder.json`;
  }

  if (networkName === "localhost") {
    return "ipfs://placeholder/metadata.json";
  }

  throw new Error("Set FRONTIER_PASS_PLACEHOLDER_URI or METADATA_CID before non-local deployment");
}

function readAddressEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value || !ethers.isAddress(value)) {
    throw new Error(`${name} must be a valid address`);
  }
  return ethers.getAddress(value);
}

function readManifest(): Record<string, unknown> {
  if (!fs.existsSync(manifestPath)) return {};
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeDeploymentRecord(record: DeploymentRecord) {
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const manifest = readManifest();
  manifest[record.network] = record;
  writeJsonAtomic(manifestPath, manifest);
}

function assertCanWriteDeploymentRecord(networkName: SupportedDeployNetwork) {
  if (networkName === "localhost") return;

  const manifest = readManifest();
  if (manifest[networkName] && process.env.ALLOW_DEPLOYMENT_OVERWRITE !== "true") {
    throw new Error(
      `Deployment record for ${networkName} already exists. Set ALLOW_DEPLOYMENT_OVERWRITE=true before deploying again.`,
    );
  }
}

function frontendEnvPath(networkName: SupportedDeployNetwork) {
  return path.join(deploymentsDir, `frontend-env.${networkName}.env`);
}

function writeFrontendEnvSnippet(record: DeploymentRecord) {
  const prefix = record.network === "localhost" ? "LOCAL" : record.network.toUpperCase();
  const lines = [
    `NEXT_PUBLIC_${prefix}_FRX_TOKEN_ADDRESS=${record.frxToken}`,
    `NEXT_PUBLIC_${prefix}_FRONTIER_PASS_ADDRESS=${record.frontierPass}`,
    `NEXT_PUBLIC_${prefix}_FRX_STAKING_ADDRESS=${record.staking}`,
    `NEXT_PUBLIC_${prefix}_FRX_LOTTERY_ADDRESS=${record.lottery}`,
    `NEXT_PUBLIC_${prefix}_CRYSTAL_FORGE_ADDRESS=${record.crystalForge}`,
  ];

  fs.writeFileSync(frontendEnvPath(record.network), `${lines.join("\n")}\n`, "utf8");
}

function writeJsonAtomic(filePath: string, value: unknown) {
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
