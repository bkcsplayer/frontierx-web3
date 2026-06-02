import { ethers } from "hardhat";
import addresses from "../deployments/addresses.json";

async function main() {
  const lotteryAddress = addresses.sepolia.lottery;
  const lottery = await ethers.getContractAt("FRXLottery", lotteryAddress);
  const round = await lottery.currentRound();
  const [pool, count, until] = await Promise.all([
    lottery.currentPool(),
    lottery.currentEntryCount(),
    lottery.timeUntilDraw(),
  ]);
  const entries = await lottery.getRoundEntries(round);

  console.log(
    JSON.stringify(
      {
        lottery: lotteryAddress,
        currentRound: round.toString(),
        currentPoolFrx: ethers.formatEther(pool),
        entryCount: count.toString(),
        timeUntilDrawSec: until.toString(),
        entries: entries.map((entry: { player: string; amount: bigint }) => ({
          player: entry.player,
          amountFrx: ethers.formatEther(entry.amount),
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
