import { ethers } from "hardhat";
import addresses from "../deployments/addresses.json";

async function main() {
  const forgeAddress = addresses.sepolia.crystalForge;
  const wallet = "0xa6Bc880B46991c45204f1E35c339Bae777aCDbff";
  const forge = await ethers.getContractAt("CrystalForge", forgeAddress);
  const nextId = await forge.nextRequestId();
  const [totalPlays, totalPaidOut] = await Promise.all([forge.totalPlays(), forge.totalPaidOut()]);

  const pending: Array<{ id: string; player: string; paid: string; block: string; settled: boolean }> = [];
  for (let id = 1n; id < nextId; id++) {
    const request = await forge.pendingForges(id);
    if (request.player === ethers.ZeroAddress) continue;
    pending.push({
      id: id.toString(),
      player: request.player,
      paid: ethers.formatEther(request.paid),
      block: request.requestBlock.toString(),
      settled: request.settled,
    });
  }

  const history = await forge.getRecentHistory(5);

  console.log(
    JSON.stringify(
      {
        forge: forgeAddress,
        wallet,
        nextRequestId: nextId.toString(),
        totalPlays: totalPlays.toString(),
        totalPaidOutFrx: ethers.formatEther(totalPaidOut),
        pending,
        recentHistory: history.map((row: { player: string; result: number; payout: bigint; timestamp: bigint }) => ({
          player: row.player,
          result: Number(row.result),
          payoutFrx: ethers.formatEther(row.payout),
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
