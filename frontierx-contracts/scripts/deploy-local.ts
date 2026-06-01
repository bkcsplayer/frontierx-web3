import { ethers } from "hardhat";

async function main() {
  const [deployer, treasury, royaltyReceiver] = await ethers.getSigners();
  const mintPrice = ethers.parseEther("0.003");
  const placeholderUri = "ipfs://placeholder/metadata.json";

  const FRXToken = await ethers.getContractFactory("FRXToken");
  const frxToken = await FRXToken.deploy(treasury.address);
  await frxToken.waitForDeployment();

  const FrontierPass = await ethers.getContractFactory("FrontierPass");
  const frontierPass = await FrontierPass.deploy(mintPrice, placeholderUri, royaltyReceiver.address);
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

  await frxToken.setStakingContract(await frxStaking.getAddress());

  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasury.address);
  console.log("Royalty receiver:", royaltyReceiver.address);
  console.log("FRXToken:", await frxToken.getAddress());
  console.log("FrontierPass:", await frontierPass.getAddress());
  console.log("FRXStaking:", await frxStaking.getAddress());
  console.log("FRXLottery:", await frxLottery.getAddress());
  console.log("CrystalForge:", await crystalForge.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
