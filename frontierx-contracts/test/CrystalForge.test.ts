import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("CrystalForge", function () {
  const playCost = ethers.parseEther("5");
  const userBalance = ethers.parseEther("100");
  const seedAmount = ethers.parseEther("50");

  async function deployFixture() {
    const [owner, treasury, user, secondUser] = await ethers.getSigners();

    const FRXToken = await ethers.getContractFactory("FRXToken");
    const frxToken = await FRXToken.deploy(treasury.address);
    await frxToken.setStakingContract(owner.address);
    await frxToken.mint(owner.address, userBalance);
    await frxToken.mint(user.address, userBalance);

    const CrystalForge = await ethers.getContractFactory("CrystalForge");
    const crystalForge = await CrystalForge.deploy(await frxToken.getAddress());

    return { frxToken, crystalForge, owner, treasury, user, secondUser };
  }

  it("sets the FRX token and game constants", async function () {
    const { frxToken, crystalForge } = await deployFixture();

    expect(await crystalForge.frxToken()).to.equal(await frxToken.getAddress());
    expect(await crystalForge.PLAY_COST()).to.equal(playCost);
    expect(await crystalForge.totalPlays()).to.equal(0n);
  });

  it("allows owner to seed the payout pool", async function () {
    const { frxToken, crystalForge, owner, secondUser } = await deployFixture();

    await frxToken.approve(await crystalForge.getAddress(), seedAmount);

    await expect(crystalForge.seedPool(seedAmount))
      .to.emit(crystalForge, "PoolSeeded")
      .withArgs(owner.address, seedAmount);

    expect(await frxToken.balanceOf(await crystalForge.getAddress())).to.equal(seedAmount);

    await expect(crystalForge.connect(secondUser).seedPool(seedAmount)).to.be.revertedWithCustomError(
      crystalForge,
      "OwnableUnauthorizedAccount",
    );
  });

  it("plays one forge round and records payout accounting", async function () {
    const { frxToken, crystalForge, user } = await deployFixture();
    await frxToken.approve(await crystalForge.getAddress(), seedAmount);
    await crystalForge.seedPool(seedAmount);
    await frxToken.connect(user).approve(await crystalForge.getAddress(), playCost);

    const userBefore = await frxToken.balanceOf(user.address);
    const forgeBefore = await frxToken.balanceOf(await crystalForge.getAddress());

    await expect(crystalForge.connect(user).forge())
      .to.emit(crystalForge, "ForgeRequested")
      .withArgs(user.address, 1n, playCost);

    expect(await frxToken.balanceOf(user.address)).to.equal(userBefore - playCost);
    expect(await frxToken.balanceOf(await crystalForge.getAddress())).to.equal(forgeBefore + playCost);

    const request = await crystalForge.pendingForges(1);
    expect(request.player).to.equal(user.address);
    expect(request.settled).to.equal(false);

    await expect(crystalForge.settleForge(1)).to.emit(crystalForge, "CrystalForged");

    const record = await crystalForge.history(0);
    const allowedPayouts = [0n, ethers.parseEther("7.5"), ethers.parseEther("10"), ethers.parseEther("15")];

    expect(record.player).to.equal(user.address);
    expect(record.result).to.be.greaterThanOrEqual(0n);
    expect(record.result).to.be.lessThanOrEqual(3n);
    expect(allowedPayouts).to.include(record.payout);
    expect(await crystalForge.totalPlays()).to.equal(1n);
    expect(await crystalForge.playerPlays(user.address)).to.equal(1n);
    expect(await crystalForge.playerWinnings(user.address)).to.equal(record.payout);
    expect(await crystalForge.totalPaidOut()).to.equal(record.payout);
    expect(await frxToken.balanceOf(user.address)).to.equal(userBefore - playCost + record.payout);
    expect(await frxToken.balanceOf(await crystalForge.getAddress())).to.equal(forgeBefore + playCost - record.payout);

    const settledRequest = await crystalForge.pendingForges(1);
    expect(settledRequest.settled).to.equal(true);
  });

  it("does not allow the same forge request to settle twice", async function () {
    const { frxToken, crystalForge, user } = await deployFixture();
    await frxToken.connect(user).approve(await crystalForge.getAddress(), playCost);
    await crystalForge.connect(user).forge();

    await crystalForge.settleForge(1);

    await expect(crystalForge.settleForge(1)).to.be.revertedWith("Already settled");
  });

  it("refunds expired forge requests after the blockhash settlement window", async function () {
    const { frxToken, crystalForge, user } = await deployFixture();
    await frxToken.connect(user).approve(await crystalForge.getAddress(), playCost);

    const userBefore = await frxToken.balanceOf(user.address);
    await crystalForge.connect(user).forge();

    await network.provider.send("hardhat_mine", ["0x101"]);

    await expect(crystalForge.settleForge(1)).to.be.revertedWith("Request expired");
    await expect(crystalForge.refundExpiredForge(1))
      .to.emit(crystalForge, "ForgeRefunded")
      .withArgs(user.address, 1n, playCost);

    expect(await frxToken.balanceOf(user.address)).to.equal(userBefore);

    const request = await crystalForge.pendingForges(1);
    expect(request.settled).to.equal(true);
    await expect(crystalForge.refundExpiredForge(1)).to.be.revertedWith("Already settled");
  });

  it("burns excess pool balance and tracks total burned", async function () {
    const { frxToken, crystalForge, owner, secondUser } = await deployFixture();
    await frxToken.approve(await crystalForge.getAddress(), seedAmount);
    await crystalForge.seedPool(seedAmount);

    await expect(crystalForge.connect(secondUser).burnExcess()).to.be.revertedWithCustomError(
      crystalForge,
      "OwnableUnauthorizedAccount",
    );

    await expect(crystalForge.burnExcess()).to.emit(frxToken, "TokensBurned").withArgs(await crystalForge.getAddress(), seedAmount);

    expect(await crystalForge.totalBurned()).to.equal(seedAmount);
    expect(await frxToken.balanceOf(await crystalForge.getAddress())).to.equal(0n);
    expect(await frxToken.balanceOf(owner.address)).to.equal(userBalance - seedAmount);
  });

  it("returns recent history with the requested cap", async function () {
    const { frxToken, crystalForge, user } = await deployFixture();

    for (let i = 0; i < 3; i++) {
      await frxToken.connect(user).approve(await crystalForge.getAddress(), playCost);
      await crystalForge.connect(user).forge();
      await crystalForge.settleForge(i + 1);
    }

    const recent = await crystalForge.getRecentHistory(2);
    expect(recent).to.have.lengthOf(2);
    expect(recent[0].player).to.equal(user.address);
    expect(recent[1].player).to.equal(user.address);
  });
});
