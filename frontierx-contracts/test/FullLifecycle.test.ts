import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FrontierX full lifecycle", function () {
  const mintPrice = ethers.parseEther("0.003");
  const placeholderUri = "ipfs://placeholder/metadata.json";
  const baseUri = "ipfs://metadata/";
  const lotteryEntry = ethers.parseEther("10");
  const forgeCost = ethers.parseEther("5");
  const forgeSeed = ethers.parseEther("50");
  const oneDay = 86_400;

  async function deployFixture() {
    const [owner, treasury, royaltyReceiver, user] = await ethers.getSigners();

    const FRXToken = await ethers.getContractFactory("FRXToken");
    const frxToken = await FRXToken.deploy(treasury.address);

    const FrontierPass = await ethers.getContractFactory("FrontierPass");
    const frontierPass = await FrontierPass.deploy(mintPrice, placeholderUri, royaltyReceiver.address);

    const FRXStaking = await ethers.getContractFactory("FRXStaking");
    const frxStaking = await FRXStaking.deploy(await frxToken.getAddress(), await frontierPass.getAddress());

    const FRXLottery = await ethers.getContractFactory("FRXLottery");
    const frxLottery = await FRXLottery.deploy(await frxToken.getAddress());

    const CrystalForge = await ethers.getContractFactory("CrystalForge");
    const crystalForge = await CrystalForge.deploy(await frxToken.getAddress());

    await frxToken.setStakingContract(owner.address);
    await frxToken.mint(owner.address, forgeSeed);
    await frxToken.setStakingContract(await frxStaking.getAddress());

    return { frxToken, frontierPass, frxStaking, frxLottery, crystalForge, owner, treasury, royaltyReceiver, user };
  }

  it("runs mint, reveal, stake, claim, lottery, and forge end to end", async function () {
    const { frxToken, frontierPass, frxStaking, frxLottery, crystalForge, treasury, user } = await deployFixture();

    await expect(frontierPass.connect(user).mint({ value: mintPrice }))
      .to.emit(frontierPass, "NFTMinted")
      .withArgs(user.address, 1n);

    await frontierPass.reveal(baseUri);
    const rarity = await frontierPass.tokenRarity(1);
    const rarityMultipliers = [10_000n, 15_000n, 25_000n, 50_000n];
    const expectedDailyReward = (ethers.parseEther("100") * rarityMultipliers[Number(rarity)]) / 10_000n;
    expect(rarity).to.be.greaterThanOrEqual(0n);
    expect(await frontierPass.tokenURI(1)).to.match(/^ipfs:\/\/metadata\/(common|rare|epic|legendary)\/1\.json$/);

    await frontierPass.connect(user).setApprovalForAll(await frxStaking.getAddress(), true);
    await expect(frxStaking.connect(user).stake(1)).to.emit(frxStaking, "Staked").withArgs(user.address, 1n, rarity);
    expect(await frxStaking.effectivePassHolder(user.address)).to.equal(true);
    expect(await frontierPass.ownerOf(1)).to.equal(await frxStaking.getAddress());

    const stakeInfoBeforeClaim = await frxStaking.stakes(1);
    await time.setNextBlockTimestamp(Number(stakeInfoBeforeClaim.lastClaimed + BigInt(oneDay)));
    const beforeClaim = await frxToken.balanceOf(user.address);
    const totalMintedBeforeClaim = await frxToken.totalMinted();

    await expect(frxStaking.connect(user).claim(1))
      .to.emit(frxStaking, "Claimed")
      .withArgs(user.address, expectedDailyReward);

    const balanceAfterClaim = await frxToken.balanceOf(user.address);
    expect(balanceAfterClaim).to.equal(beforeClaim + expectedDailyReward);
    expect(await frxToken.totalMinted()).to.equal(totalMintedBeforeClaim + expectedDailyReward);

    await frxToken.connect(user).approve(await frxLottery.getAddress(), lotteryEntry);
    await expect(frxLottery.connect(user).enter(lotteryEntry))
      .to.emit(frxLottery, "EnteredLottery")
      .withArgs(user.address, lotteryEntry, 1n);

    const beforeDraw = await frxToken.balanceOf(user.address);
    await time.increase(oneDay);
    await expect(frxLottery.drawWinner()).to.emit(frxLottery, "WinnerDrawn");

    expect(await frxLottery.currentRound()).to.equal(2n);
    expect(await frxLottery.currentPool()).to.equal(0n);
    expect(await frxLottery.roundPrize(1)).to.equal(ethers.parseEther("9"));
    expect(await frxToken.balanceOf(treasury.address)).to.equal(ethers.parseEther("1"));
    expect(await frxToken.balanceOf(await frxLottery.getAddress())).to.equal(0n);
    expect(await frxLottery.roundWinner(1)).to.equal(user.address);
    expect(await frxToken.balanceOf(user.address)).to.equal(beforeDraw + ethers.parseEther("9"));

    await frxToken.approve(await crystalForge.getAddress(), forgeSeed);
    await crystalForge.seedPool(forgeSeed);
    const beforeForge = await frxToken.balanceOf(user.address);
    const forgePoolBefore = await frxToken.balanceOf(await crystalForge.getAddress());
    await frxToken.connect(user).approve(await crystalForge.getAddress(), forgeCost);
    await expect(crystalForge.connect(user).forge())
      .to.emit(crystalForge, "ForgeRequested")
      .withArgs(user.address, 1n, forgeCost);

    await expect(crystalForge.settleForge(1)).to.emit(crystalForge, "CrystalForged");

    const record = await crystalForge.history(0);
    const allowedPayouts = [0n, ethers.parseEther("7.5"), ethers.parseEther("10"), ethers.parseEther("15")];
    expect(record.player).to.equal(user.address);
    expect(allowedPayouts).to.include(record.payout);
    expect(await crystalForge.totalPlays()).to.equal(1n);
    expect(await crystalForge.playerWinnings(user.address)).to.equal(record.payout);
    expect(await crystalForge.totalPaidOut()).to.equal(record.payout);
    expect(await frxToken.balanceOf(user.address)).to.equal(beforeForge - forgeCost + record.payout);
    expect(await frxToken.balanceOf(await crystalForge.getAddress())).to.equal(forgePoolBefore + forgeCost - record.payout);
  });
});
