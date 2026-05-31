import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot finalization", function () {
  async function deployFixture() {
    const [owner, organiser, playerA, playerB, winner, outsider] =
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
    await token.mint(playerA.address, buyInAmount * 3n);
    await token.mint(playerB.address, buyInAmount * 3n);
    await token
      .connect(playerA)
      .approve(await pokerPot.getAddress(), buyInAmount * 2n);
    await token.connect(playerB).approve(await pokerPot.getAddress(), buyInAmount);
    await pokerPot.connect(playerA).buyIn(1, 2);
    await pokerPot.connect(playerB).buyIn(1, 1);
    const pot = buyInAmount * 3n;
    return {
      pokerPot,
      token,
      organiser,
      playerA,
      playerB,
      winner,
      outsider,
      buyInAmount,
      pot,
    };
  }

  it("lets only the organiser finalize exact full-pot payouts", async function () {
    const { pokerPot, token, organiser, winner, outsider, pot } =
      await deployFixture();

    await expect(
      pokerPot.connect(outsider).finalize(1, [winner.address], [pot])
    ).to.be.revertedWithCustomError(pokerPot, "OnlyOrganiser");

    await expect(pokerPot.connect(organiser).finalize(1, [winner.address], [pot]))
      .to.emit(pokerPot, "GameFinalized")
      .withArgs(1n, pot);

    expect(await token.balanceOf(winner.address)).to.equal(pot);
    const game = await pokerPot.getGame(1);
    expect(game.status).to.equal(1);
    const payouts = await pokerPot.getPayouts(1);
    expect(payouts.recipients).to.deep.equal([winner.address]);
    expect(payouts.amounts).to.deep.equal([pot]);
  });

  it("rejects payout totals below or above the pot", async function () {
    const { pokerPot, organiser, winner, playerA, pot } = await deployFixture();

    await expect(
      pokerPot.connect(organiser).finalize(1, [winner.address], [pot - 1n])
    ).to.be.revertedWithCustomError(pokerPot, "PayoutTotalMismatch");

    await expect(
      pokerPot.connect(organiser).finalize(1, [winner.address], [pot + 1n])
    ).to.be.revertedWithCustomError(pokerPot, "PayoutTotalMismatch");

    await expect(
      pokerPot
        .connect(organiser)
        .finalize(1, [winner.address, playerA.address], [pot - 1n, 1n])
    ).to.emit(pokerPot, "GameFinalized");
  });

  it("rejects malformed payout arrays and zero-recipient payouts", async function () {
    const { pokerPot, organiser, winner, pot } = await deployFixture();

    await expect(
      pokerPot.connect(organiser).finalize(1, [winner.address], [])
    ).to.be.revertedWithCustomError(pokerPot, "InvalidPayouts");

    await expect(
      pokerPot.connect(organiser).finalize(1, [ethers.ZeroAddress], [pot])
    ).to.be.revertedWithCustomError(pokerPot, "InvalidAddress");
  });

  it("locks finalized games against further changes", async function () {
    const { pokerPot, token, organiser, playerA, winner, pot, buyInAmount } =
      await deployFixture();
    await pokerPot.connect(organiser).finalize(1, [winner.address], [pot]);

    await expect(
      pokerPot.connect(organiser).setWhitelist(1, playerA.address, false)
    ).to.be.revertedWithCustomError(pokerPot, "GameClosed");

    await token.mint(playerA.address, buyInAmount);
    await token.connect(playerA).approve(await pokerPot.getAddress(), buyInAmount);
    await expect(
      pokerPot.connect(playerA).buyIn(1, 1)
    ).to.be.revertedWithCustomError(pokerPot, "GameClosed");

    await expect(
      pokerPot.connect(organiser).finalize(1, [winner.address], [1n])
    ).to.be.revertedWithCustomError(pokerPot, "GameClosed");
  });

  it("finalizes one same-token game without paying another game's pot", async function () {
    const {
      pokerPot,
      token,
      organiser,
      playerB,
      winner,
      buyInAmount,
      pot,
    } = await deployFixture();
    const secondGamePot = buyInAmount * 2n;

    await pokerPot
      .connect(organiser)
      .createGame(await token.getAddress(), buyInAmount, [playerB.address]);
    await token
      .connect(playerB)
      .approve(await pokerPot.getAddress(), secondGamePot);
    await pokerPot.connect(playerB).buyIn(2, 2);

    await pokerPot.connect(organiser).finalize(1, [winner.address], [pot]);

    expect(await token.balanceOf(winner.address)).to.equal(pot);
    expect(await token.balanceOf(await pokerPot.getAddress())).to.equal(
      secondGamePot
    );

    const firstGame = await pokerPot.getGame(1);
    expect(firstGame.status).to.equal(1);
    expect(firstGame.totalPot).to.equal(pot);

    const secondGame = await pokerPot.getGame(2);
    expect(secondGame.status).to.equal(0);
    expect(secondGame.totalPot).to.equal(secondGamePot);
  });
});
