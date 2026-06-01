import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("FRXStaking", function () {
  const mintPrice = ethers.parseEther("0.003");
  const placeholderUri = "ipfs://placeholder/metadata.json";
  const baseUri = "ipfs://metadata/";
  const baseRate = ethers.parseEther("100");
  const secondsPerDay = 86_400n;

  async function deployFixture() {
    const [owner, treasury, royaltyReceiver, user, secondUser] = await ethers.getSigners();

    const FRXToken = await ethers.getContractFactory("FRXToken");
    const frxToken = await FRXToken.deploy(treasury.address);

    const FrontierPass = await ethers.getContractFactory("FrontierPass");
    const frontierPass = await FrontierPass.deploy(mintPrice, placeholderUri, royaltyReceiver.address);

    const FRXStaking = await ethers.getContractFactory("FRXStaking");
    const frxStaking = await FRXStaking.deploy(await frxToken.getAddress(), await frontierPass.getAddress());

    await frxToken.setStakingContract(await frxStaking.getAddress());

    return { frxToken, frontierPass, frxStaking, owner, treasury, royaltyReceiver, user, secondUser };
  }

  async function mintRevealAndApprove(
    frontierPass: Awaited<ReturnType<typeof deployFixture>>["frontierPass"],
    frxStaking: Awaited<ReturnType<typeof deployFixture>>["frxStaking"],
    user: Awaited<ReturnType<typeof ethers.getSigners>>[number],
    count = 1,
  ) {
    for (let i = 0; i < count; i++) {
      await frontierPass.connect(user).mint({ value: mintPrice });
    }

    await frontierPass.reveal(baseUri);
    await frontierPass.connect(user).setApprovalForAll(await frxStaking.getAddress(), true);
  }

  function expectedDailyReward(rarity: bigint) {
    const multipliers = [10_000n, 15_000n, 25_000n, 50_000n];
    return (baseRate * multipliers[Number(rarity)]) / 10_000n;
  }

  it("sets token contracts and default rarity multipliers", async function () {
    const { frxToken, frontierPass, frxStaking } = await deployFixture();

    expect(await frxStaking.frxToken()).to.equal(await frxToken.getAddress());
    expect(await frxStaking.frontierPass()).to.equal(await frontierPass.getAddress());
    expect(await frxStaking.BASE_RATE()).to.equal(baseRate);
    expect(await frxStaking.rarityMultiplier(0)).to.equal(10_000n);
    expect(await frxStaking.rarityMultiplier(1)).to.equal(15_000n);
    expect(await frxStaking.rarityMultiplier(2)).to.equal(25_000n);
    expect(await frxStaking.rarityMultiplier(3)).to.equal(50_000n);
  });

  it("stakes a revealed NFT and transfers custody", async function () {
    const { frontierPass, frxStaking, user } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user);

    expect(await frxStaking.effectivePassHolder(user.address)).to.equal(true);

    const rarity = await frontierPass.tokenRarity(1);
    await expect(frxStaking.connect(user).stake(1)).to.emit(frxStaking, "Staked").withArgs(user.address, 1n, rarity);

    expect(await frontierPass.ownerOf(1)).to.equal(await frxStaking.getAddress());
    expect(await frxStaking.getStakedTokens(user.address)).to.deep.equal([1n]);
    expect(await frontierPass.holdsPass(user.address)).to.equal(false);
    expect(await frxStaking.hasStakedPass(user.address)).to.equal(true);
    expect(await frxStaking.effectivePassHolder(user.address)).to.equal(true);

    const stakeInfo = await frxStaking.stakes(1);
    expect(stakeInfo.owner).to.equal(user.address);
    expect(stakeInfo.rarity).to.equal(rarity);
  });

  it("rejects direct NFT transfers that bypass stake accounting", async function () {
    const { frontierPass, frxStaking, user } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user);

    await expect(
      frontierPass.connect(user)["safeTransferFrom(address,address,uint256)"](
        user.address,
        await frxStaking.getAddress(),
        1,
      ),
    ).to.be.revertedWith("Direct transfers not accepted");

    expect(await frontierPass.ownerOf(1)).to.equal(user.address);
    const stakeInfo = await frxStaking.stakes(1);
    expect(stakeInfo.owner).to.equal(ethers.ZeroAddress);
  });

  it("allows owner recovery for raw transfers that bypass receiver hooks", async function () {
    const { frontierPass, frxStaking, user, secondUser } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user);

    await frontierPass.connect(user).transferFrom(user.address, await frxStaking.getAddress(), 1);

    expect(await frontierPass.ownerOf(1)).to.equal(await frxStaking.getAddress());
    const stakeInfo = await frxStaking.stakes(1);
    expect(stakeInfo.owner).to.equal(ethers.ZeroAddress);

    await expect(frxStaking.connect(user).unstake(1)).to.be.revertedWith("Not staker");
    await expect(frxStaking.connect(user).recoverUntrackedPass(1, user.address)).to.be.revertedWithCustomError(
      frxStaking,
      "OwnableUnauthorizedAccount",
    );

    await expect(frxStaking.recoverUntrackedPass(1, secondUser.address))
      .to.emit(frxStaking, "UntrackedPassRecovered")
      .withArgs(1n, secondUser.address);

    expect(await frontierPass.ownerOf(1)).to.equal(secondUser.address);
  });

  it("does not allow recovery of an actively staked pass", async function () {
    const { frontierPass, frxStaking, user, secondUser } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user);
    await frxStaking.connect(user).stake(1);

    await expect(frxStaking.recoverUntrackedPass(1, secondUser.address)).to.be.revertedWith("Token is staked");
  });

  it("rejects staking before reveal or by a non-owner", async function () {
    const { frontierPass, frxStaking, user, secondUser } = await deployFixture();

    await frontierPass.connect(user).mint({ value: mintPrice });
    await frontierPass.connect(user).setApprovalForAll(await frxStaking.getAddress(), true);

    await expect(frxStaking.connect(user).stake(1)).to.be.revertedWith("Pass not revealed");

    await frontierPass.reveal(baseUri);

    await expect(frxStaking.connect(secondUser).stake(1)).to.be.revertedWith("Not owner");
  });

  it("calculates pending rewards from rarity multiplier", async function () {
    const { frontierPass, frxStaking, user } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user);
    await frxStaking.connect(user).stake(1);

    const rarity = await frontierPass.tokenRarity(1);
    await time.increase(Number(secondsPerDay));

    expect(await frxStaking.pendingRewards(1)).to.equal(expectedDailyReward(rarity));
    expect(await frxStaking.totalPendingRewards(user.address)).to.equal(expectedDailyReward(rarity));
  });

  it("calculates one-day rewards for every rarity tier", async function () {
    const { frontierPass, frxStaking, user } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user, 100);

    const tokenByRarity = new Map<number, number>();
    for (let tokenId = 1; tokenId <= 100; tokenId++) {
      const rarity = Number(await frontierPass.tokenRarity(tokenId));
      if (!tokenByRarity.has(rarity)) {
        tokenByRarity.set(rarity, tokenId);
      }
    }

    expect([...tokenByRarity.keys()].sort()).to.deep.equal([0, 1, 2, 3]);

    for (const tokenId of tokenByRarity.values()) {
      await frxStaking.connect(user).stake(tokenId);
    }

    await time.increase(Number(secondsPerDay));

    for (const [rarity, tokenId] of tokenByRarity.entries()) {
      const stakeInfo = await frxStaking.stakes(tokenId);
      const elapsed = BigInt(await time.latest()) - stakeInfo.lastClaimed;
      const expected = (expectedDailyReward(BigInt(rarity)) * elapsed) / secondsPerDay;
      expect(await frxStaking.pendingRewards(tokenId)).to.equal(expected);
    }
  });

  it("claims rewards without unstaking", async function () {
    const { frxToken, frontierPass, frxStaking, user } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user);
    await frxStaking.connect(user).stake(1);

    await time.increase(Number(secondsPerDay));

    await expect(frxStaking.connect(user).claim(1)).to.emit(frxStaking, "Claimed").withArgs(user.address, anyValue);

    expect(await frxToken.balanceOf(user.address)).to.be.greaterThan(0n);
    expect(await frontierPass.ownerOf(1)).to.equal(await frxStaking.getAddress());
    expect(await frxStaking.pendingRewards(1)).to.be.lessThanOrEqual(baseRate / secondsPerDay);
  });

  it("unstakes, claims pending rewards, and clears stake state", async function () {
    const { frxToken, frontierPass, frxStaking, user } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user);
    await frxStaking.connect(user).stake(1);

    await time.increase(Number(secondsPerDay));

    await expect(frxStaking.connect(user).unstake(1))
      .to.emit(frxStaking, "Unstaked")
      .withArgs(user.address, 1n);

    expect(await frontierPass.ownerOf(1)).to.equal(user.address);
    expect(await frxToken.balanceOf(user.address)).to.be.greaterThan(0n);
    expect(await frxStaking.getStakedTokens(user.address)).to.deep.equal([]);

    const stakeInfo = await frxStaking.stakes(1);
    expect(stakeInfo.owner).to.equal(ethers.ZeroAddress);
  });

  it("claims all rewards across multiple staked NFTs", async function () {
    const { frxToken, frontierPass, frxStaking, user } = await deployFixture();
    await mintRevealAndApprove(frontierPass, frxStaking, user, 2);

    await frxStaking.connect(user).stake(1);
    await frxStaking.connect(user).stake(2);
    await time.increase(Number(secondsPerDay));

    await expect(frxStaking.connect(user).claimAll()).to.emit(frxStaking, "Claimed").withArgs(user.address, anyValue);

    expect(await frxToken.balanceOf(user.address)).to.be.greaterThan(0n);
    expect(await frxStaking.pendingRewards(1)).to.be.lessThanOrEqual(baseRate / secondsPerDay);
    expect(await frxStaking.pendingRewards(2)).to.be.lessThanOrEqual(baseRate / secondsPerDay);
  });
});
