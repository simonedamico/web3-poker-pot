import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot buy-ins", function () {
  async function expectTokenCustodyMatchesPot(pokerPot: any, token: any) {
    const game = await pokerPot.getGame(1);
    expect(await token.balanceOf(await pokerPot.getAddress())).to.equal(
      game.totalPot
    );
  }

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
    const playerBalanceBefore = await token.balanceOf(playerA.address);
    const contractBalanceBefore = await token.balanceOf(
      await pokerPot.getAddress()
    );
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount);

    await expect(pokerPot.connect(playerA).buyIn(1, 1))
      .to.emit(pokerPot, "BuyIn")
      .withArgs(1n, playerA.address, 1n, buyInAmount);

    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(1);
    expect(await pokerPot.getParticipants(1)).to.deep.equal([playerA.address]);
    const game = await pokerPot.getGame(1);
    expect(game.totalPot).to.equal(buyInAmount);
    expect(await token.balanceOf(playerA.address)).to.equal(
      playerBalanceBefore - buyInAmount
    );
    expect(await token.balanceOf(await pokerPot.getAddress())).to.equal(
      contractBalanceBefore + buyInAmount
    );
    await expectTokenCustodyMatchesPot(pokerPot, token);
  });

  it("lets a whitelisted participant buy in multiple times in one transaction", async function () {
    const { pokerPot, token, playerA, buyInAmount } = await deployFixture();
    const playerBalanceBefore = await token.balanceOf(playerA.address);
    const contractBalanceBefore = await token.balanceOf(
      await pokerPot.getAddress()
    );
    await token
      .connect(playerA)
      .approve(await pokerPot.getAddress(), buyInAmount * 3n);

    await pokerPot.connect(playerA).buyIn(1, 3);

    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(3);
    expect(await pokerPot.getParticipants(1)).to.deep.equal([playerA.address]);
    const game = await pokerPot.getGame(1);
    expect(game.totalPot).to.equal(buyInAmount * 3n);
    expect(await token.balanceOf(playerA.address)).to.equal(
      playerBalanceBefore - buyInAmount * 3n
    );
    expect(await token.balanceOf(await pokerPot.getAddress())).to.equal(
      contractBalanceBefore + buyInAmount * 3n
    );
    await expectTokenCustodyMatchesPot(pokerPot, token);
  });

  it("tracks multiple participants without duplicates", async function () {
    const { pokerPot, token, playerA, playerB, buyInAmount } =
      await deployFixture();
    const playerABalanceBefore = await token.balanceOf(playerA.address);
    const playerBBalanceBefore = await token.balanceOf(playerB.address);
    const contractBalanceBefore = await token.balanceOf(
      await pokerPot.getAddress()
    );
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
    expect(await token.balanceOf(playerA.address)).to.equal(
      playerABalanceBefore - buyInAmount * 2n
    );
    expect(await token.balanceOf(playerB.address)).to.equal(
      playerBBalanceBefore - buyInAmount
    );
    expect(await token.balanceOf(await pokerPot.getAddress())).to.equal(
      contractBalanceBefore + buyInAmount * 3n
    );
    await expectTokenCustodyMatchesPot(pokerPot, token);
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

  it("rejects tokens that under-deliver buy-in custody", async function () {
    const [owner, organiser, playerA] = await ethers.getSigners();
    const MockFeeOnTransferERC20 = await ethers.getContractFactory(
      "MockFeeOnTransferERC20"
    );
    const token = await MockFeeOnTransferERC20.deploy("Fee Poker USD", "FPUSD", 6);
    const PokerPot = await ethers.getContractFactory("PokerPot");
    const pokerPot = await PokerPot.deploy(owner.address);
    await pokerPot.setTokenAllowed(await token.getAddress(), true);
    const buyInAmount = ethers.parseUnits("25", 6);
    await pokerPot
      .connect(organiser)
      .createGame(await token.getAddress(), buyInAmount, [playerA.address]);
    await token.mint(playerA.address, ethers.parseUnits("250", 6));
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount);
    const playerBalanceBefore = await token.balanceOf(playerA.address);
    const contractBalanceBefore = await token.balanceOf(
      await pokerPot.getAddress()
    );

    await expect(
      pokerPot.connect(playerA).buyIn(1, 1)
    ).to.be.revertedWithCustomError(pokerPot, "TokenTransferAmountMismatch");

    expect(await token.balanceOf(playerA.address)).to.equal(playerBalanceBefore);
    expect(await token.balanceOf(await pokerPot.getAddress())).to.equal(
      contractBalanceBefore
    );
    expect(await pokerPot.buyInCount(1, playerA.address)).to.equal(0);
    expect(await pokerPot.getParticipants(1)).to.deep.equal([]);
    const game = await pokerPot.getGame(1);
    expect(game.totalPot).to.equal(0);
    await expectTokenCustodyMatchesPot(pokerPot, token);
  });
});
