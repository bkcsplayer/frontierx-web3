import { ethers } from "hardhat";
import addresses from "../deployments/addresses.json";

const DEMO_WALLET = "0xa6Bc880B46991c45204f1E35c339Bae777aCDbff";
const STAKED_TOKEN_ID = 1n;

async function main() {
  const sepolia = addresses.sepolia;
  if (!sepolia) {
    throw new Error("No sepolia entry in deployments/addresses.json");
  }

  const frx = await ethers.getContractAt("FRXToken", sepolia.frxToken);
  const pass = await ethers.getContractAt("FrontierPass", sepolia.frontierPass);
  const staking = await ethers.getContractAt("FRXStaking", sepolia.staking);
  const lottery = await ethers.getContractAt("FRXLottery", sepolia.lottery);
  const forge = await ethers.getContractAt("CrystalForge", sepolia.crystalForge);

  const [
    frxBalance,
    pending,
    owner,
    staker,
    revealed,
    totalSupply,
    maxSupply,
    minEntry,
    playCost,
    effectiveHolder,
  ] = await Promise.all([
    frx.balanceOf(DEMO_WALLET),
    staking.pendingRewards(STAKED_TOKEN_ID),
    pass.ownerOf(STAKED_TOKEN_ID),
    staking.stakes(STAKED_TOKEN_ID),
    pass.revealed(),
    pass.totalSupply(),
    pass.MAX_SUPPLY(),
    lottery.MIN_ENTRY(),
    forge.PLAY_COST(),
    staking.effectivePassHolder(DEMO_WALLET),
  ]);

  const staked = staker.stakedAt > 0n;
  const summary = {
    wallet: DEMO_WALLET,
    frxBalance: ethers.formatEther(frxBalance),
    pendingRewardsToken1: ethers.formatEther(pending),
    nft1Owner: owner,
    nft1Staked: staked,
    passRevealed: revealed,
    minted: totalSupply.toString(),
    maxSupply: maxSupply.toString(),
    effectivePassHolder: effectiveHolder,
    lotteryMinEntryFrx: ethers.formatEther(minEntry),
    forgePlayCostFrx: ethers.formatEther(playCost),
    canPlayLottery: frxBalance + pending >= minEntry,
    canPlayForge: frxBalance + pending >= playCost,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
