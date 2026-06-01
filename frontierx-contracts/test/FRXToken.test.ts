import { expect } from "chai";
import { ethers } from "hardhat";

describe("FRXToken", function () {
  async function deployFixture() {
    const [owner, treasury, staking, user] = await ethers.getSigners();
    const FRXToken = await ethers.getContractFactory("FRXToken");
    const frxToken = await FRXToken.deploy(treasury.address);

    return { frxToken, owner, treasury, staking, user };
  }

  it("sets token metadata and treasury wallet", async function () {
    const { frxToken, treasury } = await deployFixture();

    expect(await frxToken.name()).to.equal("FrontierX Token");
    expect(await frxToken.symbol()).to.equal("FRX");
    expect(await frxToken.treasuryWallet()).to.equal(treasury.address);
  });

  it("only owner can set the staking contract", async function () {
    const { frxToken, staking, user } = await deployFixture();

    await expect(frxToken.connect(user).setStakingContract(staking.address)).to.be.revertedWithCustomError(
      frxToken,
      "OwnableUnauthorizedAccount",
    );

    await expect(frxToken.setStakingContract(staking.address))
      .to.emit(frxToken, "StakingContractUpdated")
      .withArgs(staking.address);
  });

  it("only the staking contract can mint", async function () {
    const { frxToken, staking, user } = await deployFixture();
    const amount = ethers.parseEther("100");

    await expect(frxToken.connect(user).mint(user.address, amount)).to.be.revertedWith("Only staking contract");

    await frxToken.setStakingContract(staking.address);

    await expect(frxToken.connect(staking).mint(user.address, amount))
      .to.emit(frxToken, "TokensMinted")
      .withArgs(user.address, amount);

    expect(await frxToken.balanceOf(user.address)).to.equal(amount);
    expect(await frxToken.totalMinted()).to.equal(amount);
  });

  it("allows holders to burn their own tokens", async function () {
    const { frxToken, staking, user } = await deployFixture();
    const minted = ethers.parseEther("100");
    const burned = ethers.parseEther("25");

    await frxToken.setStakingContract(staking.address);
    await frxToken.connect(staking).mint(user.address, minted);

    await expect(frxToken.connect(user).burn(burned))
      .to.emit(frxToken, "TokensBurned")
      .withArgs(user.address, burned);

    expect(await frxToken.balanceOf(user.address)).to.equal(minted - burned);
    expect(await frxToken.totalBurned()).to.equal(burned);
  });

  it("tracks treasury deposits and circulating supply", async function () {
    const { frxToken, staking, treasury, user } = await deployFixture();
    const minted = ethers.parseEther("100");
    const treasuryDeposit = ethers.parseEther("10");
    const burned = ethers.parseEther("5");

    await frxToken.setStakingContract(staking.address);
    await frxToken.connect(staking).mint(user.address, minted);

    await expect(frxToken.connect(user).depositToTreasury(treasuryDeposit))
      .to.emit(frxToken, "TreasuryDeposit")
      .withArgs(user.address, treasuryDeposit);

    await frxToken.connect(user).burn(burned);

    expect(await frxToken.balanceOf(treasury.address)).to.equal(treasuryDeposit);
    expect(await frxToken.treasuryBalance()).to.equal(treasuryDeposit);
    expect(await frxToken.totalTreasuryDeposited()).to.equal(treasuryDeposit);
    expect(await frxToken.circulatingSupply()).to.equal(minted - treasuryDeposit - burned);
  });
});
