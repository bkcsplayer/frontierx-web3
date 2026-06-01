import { expect } from "chai";
import { ethers } from "hardhat";

describe("FrontierPass", function () {
  const mintPrice = ethers.parseEther("0.003");
  const placeholderUri = "ipfs://placeholder/metadata.json";
  const baseUri = "ipfs://metadata/";

  async function deployFixture() {
    const [owner, royaltyReceiver, user, secondUser] = await ethers.getSigners();
    const FrontierPass = await ethers.getContractFactory("FrontierPass");
    const frontierPass = await FrontierPass.deploy(mintPrice, placeholderUri, royaltyReceiver.address);

    return { frontierPass, owner, royaltyReceiver, user, secondUser };
  }

  it("sets collection metadata, mint price, and default royalty", async function () {
    const { frontierPass, royaltyReceiver } = await deployFixture();

    expect(await frontierPass.name()).to.equal("Frontier Access Pass");
    expect(await frontierPass.symbol()).to.equal("FAP");
    expect(await frontierPass.MAX_SUPPLY()).to.equal(100n);
    expect(await frontierPass.mintPrice()).to.equal(mintPrice);

    const [receiver, royaltyAmount] = await frontierPass.royaltyInfo(1, 10_000n);
    expect(receiver).to.equal(royaltyReceiver.address);
    expect(royaltyAmount).to.equal(500n);
  });

  it("mints with sufficient payment and tracks ownership helpers", async function () {
    const { frontierPass, user } = await deployFixture();

    await expect(frontierPass.connect(user).mint({ value: mintPrice }))
      .to.emit(frontierPass, "NFTMinted")
      .withArgs(user.address, 1n);

    expect(await frontierPass.totalSupply()).to.equal(1n);
    expect(await frontierPass.holdsPass(user.address)).to.equal(true);
    expect(await frontierPass.tokensOfOwner(user.address)).to.deep.equal([1n]);
  });

  it("rejects incorrect payment", async function () {
    const { frontierPass, user } = await deployFixture();

    await expect(frontierPass.connect(user).mint({ value: mintPrice - 1n })).to.be.revertedWith("Incorrect payment");
    await expect(frontierPass.connect(user).mint({ value: mintPrice + 1n })).to.be.revertedWith("Incorrect payment");
  });

  it("does not mint beyond max supply", async function () {
    const { frontierPass, user } = await deployFixture();

    for (let i = 0; i < 100; i++) {
      await frontierPass.connect(user).mint({ value: mintPrice });
    }

    await expect(frontierPass.connect(user).mint({ value: mintPrice })).to.be.revertedWith("Max supply reached");
  });

  it("uses placeholder token URI before reveal and rarity folder after reveal", async function () {
    const { frontierPass, user } = await deployFixture();

    await frontierPass.connect(user).mint({ value: mintPrice });
    expect(await frontierPass.tokenURI(1)).to.equal(placeholderUri);

    await expect(frontierPass.reveal(baseUri)).to.emit(frontierPass, "Revealed").withArgs(baseUri);

    const rarity = await frontierPass.tokenRarity(1);
    const rarityFolder = ["common", "rare", "epic", "legendary"][Number(rarity)];
    expect(await frontierPass.tokenURI(1)).to.equal(`${baseUri}${rarityFolder}/1.json`);
  });

  it("assigns a fixed rarity pool during reveal", async function () {
    const { frontierPass, user } = await deployFixture();

    for (let i = 0; i < 100; i++) {
      await frontierPass.connect(user).mint({ value: mintPrice });
    }

    await frontierPass.reveal(baseUri);

    const rarityCounts = [0, 0, 0, 0];
    for (let tokenId = 1; tokenId <= 100; tokenId++) {
      rarityCounts[Number(await frontierPass.tokenRarity(tokenId))]++;
    }

    expect(rarityCounts).to.deep.equal([60, 25, 10, 5]);
  });

  it("closes minting after reveal", async function () {
    const { frontierPass, user } = await deployFixture();

    await frontierPass.connect(user).mint({ value: mintPrice });
    await frontierPass.reveal(baseUri);

    await expect(frontierPass.connect(user).mint({ value: mintPrice })).to.be.revertedWith("Sale closed after reveal");
  });

  it("only owner can reveal or withdraw mint proceeds", async function () {
    const { frontierPass, owner, user, secondUser } = await deployFixture();

    await expect(frontierPass.connect(user).reveal(baseUri)).to.be.revertedWithCustomError(
      frontierPass,
      "OwnableUnauthorizedAccount",
    );

    await frontierPass.connect(user).mint({ value: mintPrice });
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const tx = await frontierPass.withdraw();
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;

    expect(await ethers.provider.getBalance(owner.address)).to.equal(ownerBalanceBefore + mintPrice - gasCost);

    await expect(frontierPass.connect(secondUser).withdraw()).to.be.revertedWithCustomError(
      frontierPass,
      "OwnableUnauthorizedAccount",
    );
  });
});
