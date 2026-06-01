import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("FRXLottery", function () {
  const minEntry = ethers.parseEther("10");
  const userBalance = ethers.parseEther("2000");

  async function deployFixture() {
    const [owner, treasury, user, secondUser] = await ethers.getSigners();

    const FRXToken = await ethers.getContractFactory("FRXToken");
    const frxToken = await FRXToken.deploy(treasury.address);
    await frxToken.setStakingContract(owner.address);
    await frxToken.mint(user.address, userBalance);
    await frxToken.mint(secondUser.address, userBalance);

    const FRXLottery = await ethers.getContractFactory("FRXLottery");
    const frxLottery = await FRXLottery.deploy(await frxToken.getAddress());

    return { frxToken, frxLottery, owner, treasury, user, secondUser };
  }

  it("sets the FRX token and starts round one", async function () {
    const { frxToken, frxLottery } = await deployFixture();

    expect(await frxLottery.frxToken()).to.equal(await frxToken.getAddress());
    expect(await frxLottery.currentRound()).to.equal(1n);
    expect(await frxLottery.MIN_ENTRY()).to.equal(minEntry);
    expect(await frxLottery.currentEntryCount()).to.equal(0n);
  });

  it("enters the current round and tracks weighted entries", async function () {
    const { frxToken, frxLottery, user } = await deployFixture();

    await frxToken.connect(user).approve(await frxLottery.getAddress(), minEntry);

    await expect(frxLottery.connect(user).enter(minEntry))
      .to.emit(frxLottery, "EnteredLottery")
      .withArgs(user.address, minEntry, 1n);

    expect(await frxLottery.currentPool()).to.equal(minEntry);
    expect(await frxLottery.roundPool(1)).to.equal(minEntry);
    expect(await frxLottery.currentEntryCount()).to.equal(1n);
    expect(await frxToken.balanceOf(await frxLottery.getAddress())).to.equal(minEntry);

    const entries = await frxLottery.getRoundEntries(1);
    expect(entries).to.have.lengthOf(1);
    expect(entries[0].player).to.equal(user.address);
    expect(entries[0].amount).to.equal(minEntry);
  });

  it("caps entries per round to keep settlement bounded", async function () {
    const { frxToken, frxLottery, user } = await deployFixture();
    const maxEntries = await frxLottery.MAX_ENTRIES_PER_ROUND();

    await frxToken.connect(user).approve(await frxLottery.getAddress(), minEntry * (maxEntries + 1n));

    for (let i = 0; i < Number(maxEntries); i++) {
      await frxLottery.connect(user).enter(minEntry);
    }

    await expect(frxLottery.connect(user).enter(minEntry)).to.be.revertedWith("Round entry limit reached");
  });

  it("rejects entries below the minimum", async function () {
    const { frxToken, frxLottery, user } = await deployFixture();

    await frxToken.connect(user).approve(await frxLottery.getAddress(), minEntry);

    await expect(frxLottery.connect(user).enter(minEntry - 1n)).to.be.revertedWith("Below minimum entry");
  });

  it("enforces draw timing and non-empty rounds", async function () {
    const { frxLottery } = await deployFixture();

    await expect(frxLottery.drawWinner()).to.be.revertedWith("Too early");

    await time.increase(86_400);
    await expect(frxLottery.drawWinner()).to.be.revertedWith("No entries");
  });

  it("draws a weighted winner, sends 90% prize and 10% treasury cut, then starts a new round", async function () {
    const { frxToken, frxLottery, treasury, user, secondUser } = await deployFixture();
    const firstEntry = ethers.parseEther("10");
    const secondEntry = ethers.parseEther("30");
    const totalPool = firstEntry + secondEntry;
    const treasuryCut = totalPool / 10n;
    const prize = totalPool - treasuryCut;

    await frxToken.connect(user).approve(await frxLottery.getAddress(), firstEntry);
    await frxToken.connect(secondUser).approve(await frxLottery.getAddress(), secondEntry);
    await frxLottery.connect(user).enter(firstEntry);
    await frxLottery.connect(secondUser).enter(secondEntry);

    const userBefore = await frxToken.balanceOf(user.address);
    const secondUserBefore = await frxToken.balanceOf(secondUser.address);

    await time.increase(86_400);

    await expect(frxLottery.drawWinner())
      .to.emit(frxLottery, "WinnerDrawn")
      .withArgs(1n, anyValue, prize, treasuryCut)
      .and.to.emit(frxLottery, "NewRound")
      .withArgs(2n);

    const winner = await frxLottery.roundWinner(1);
    expect([user.address, secondUser.address]).to.include(winner);
    expect(await frxLottery.roundPrize(1)).to.equal(prize);
    expect(await frxToken.balanceOf(treasury.address)).to.equal(treasuryCut);
    expect(await frxToken.balanceOf(await frxLottery.getAddress())).to.equal(0n);
    expect(await frxLottery.currentRound()).to.equal(2n);
    expect(await frxLottery.currentPool()).to.equal(0n);
    expect(await frxLottery.currentEntryCount()).to.equal(0n);
    expect(await frxLottery.timeUntilDraw()).to.equal(86_400n);

    const userAfter = await frxToken.balanceOf(user.address);
    const secondUserAfter = await frxToken.balanceOf(secondUser.address);
    expect(userAfter + secondUserAfter).to.equal(userBefore + secondUserBefore + prize);
  });

  it("lets owner recover direct token transfers that are outside round accounting", async function () {
    const { frxToken, frxLottery, treasury, user, secondUser } = await deployFixture();
    const directTransfer = ethers.parseEther("3");

    await frxToken.connect(user).transfer(await frxLottery.getAddress(), directTransfer);

    await expect(frxLottery.connect(user).recoverExcessTokens(treasury.address)).to.be.revertedWithCustomError(
      frxLottery,
      "OwnableUnauthorizedAccount",
    );

    await expect(frxLottery.recoverExcessTokens(treasury.address))
      .to.emit(frxLottery, "ExcessTokensRecovered")
      .withArgs(treasury.address, directTransfer);

    expect(await frxToken.balanceOf(treasury.address)).to.equal(directTransfer);

    await expect(frxLottery.recoverExcessTokens(secondUser.address)).to.be.revertedWith("No excess tokens");
  });
});
