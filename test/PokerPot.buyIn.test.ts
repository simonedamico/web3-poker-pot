import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot buy-ins", function () {
  async function deployFixture() {
    const [owner, organiser, playerA, playerB, outsider] =
      await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("Poker USD", "PUSD", 6);
    const PokerPot = await ethers.getContractFactory("PokerPot");
    const pokerPot = await PokerPot.deploy(owner.address);
    await pokerPot.setTokenAllowed(await token.getAddress(), true);
    const buyInAmount = ethers.parseUnits("25", 6);
    await pokerPot
      .connect(organiser)
      .createGame(await token.getAddress(), buyInAmount, [
        playerA.address,
        playerB.address,
      ]);
    await token.mint(playerA.address, ethers.parseUnits("250", 6));
    await token.mint(playerB.address, ethers.parseUnits("250", 6));
    await token.mint(outsider.address, ethers.parseUnits("250", 6));
    return {
      pokerPot,
      token,
      organiser,
      playerA,
      playerB,
      outsider,
      buyInAmount,
    };
  }

  it("lets a whitelisted participant buy in once", async function () {
    const { pokerPot, token, playerA, buyInAmount } = await deployFixture();
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount);

    await expect(pokerPot.connect(playerA).buyIn(1, 1))
      .to.emit(pokerPot, "BuyIn")
      .withArgs(1n, playerA.address, 1n, buyInAmount);

    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(1);
    expect(await pokerPot.getParticipants(1)).to.deep.equal([playerA.address]);
    const game = await pokerPot.getGame(1);
    expect(game.totalPot).to.equal(buyInAmount);
  });

  it("lets a whitelisted participant buy in multiple times in one transaction", async function () {
    const { pokerPot, token, playerA, buyInAmount } = await deployFixture();
    await token
      .connect(playerA)
      .approve(await pokerPot.getAddress(), buyInAmount * 3n);

    await pokerPot.connect(playerA).buyIn(1, 3);

    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(3);
    expect(await pokerPot.getParticipants(1)).to.deep.equal([playerA.address]);
    const game = await pokerPot.getGame(1);
    expect(game.totalPot).to.equal(buyInAmount * 3n);
  });

  it("tracks multiple participants without duplicates", async function () {
    const { pokerPot, token, playerA, playerB, buyInAmount } =
      await deployFixture();
    await token
      .connect(playerA)
      .approve(await pokerPot.getAddress(), buyInAmount * 2n);
    await token.connect(playerB).approve(await pokerPot.getAddress(), buyInAmount);

    await pokerPot.connect(playerA).buyIn(1, 1);
    await pokerPot.connect(playerA).buyIn(1, 1);
    await pokerPot.connect(playerB).buyIn(1, 1);

    expect(await pokerPot.getParticipants(1)).to.deep.equal([
      playerA.address,
      playerB.address,
    ]);
    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(2);
    expect(await pokerPot.buyInCount(1, playerB.address)).to.equal(1);
  });

  it("rejects non-whitelisted, removed, and zero-count buy-ins", async function () {
    const { pokerPot, token, organiser, playerA, outsider, buyInAmount } =
      await deployFixture();
    await token.connect(outsider).approve(await pokerPot.getAddress(), buyInAmount);

    await expect(
      pokerPot.connect(outsider).buyIn(1, 1)
    ).to.be.revertedWithCustomError(pokerPot, "NotWhitelisted");

    await pokerPot.connect(organiser).setWhitelist(1, playerA.address, false);
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount);
    await expect(
      pokerPot.connect(playerA).buyIn(1, 1)
    ).to.be.revertedWithCustomError(pokerPot, "NotWhitelisted");

    await expect(
      pokerPot.connect(playerA).buyIn(1, 0)
    ).to.be.revertedWithCustomError(pokerPot, "InvalidBuyInCount");
  });
});
