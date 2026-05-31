import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot game management", function () {
  async function deployFixture() {
    const [owner, organiser, playerA, playerB, outsider, token] =
      await ethers.getSigners();
    const PokerPot = await ethers.getContractFactory("PokerPot");
    const pokerPot = await PokerPot.deploy(owner.address);
    await pokerPot.setTokenAllowed(token.address, true);
    return { pokerPot, owner, organiser, playerA, playerB, outsider, token };
  }

  it("creates a game with an allowlisted token and initial whitelist", async function () {
    const { pokerPot, organiser, playerA, playerB, token } =
      await deployFixture();
    const buyInAmount = ethers.parseUnits("25", 6);

    await expect(
      pokerPot.connect(organiser).createGame(token.address, buyInAmount, [
        playerA.address,
        playerB.address,
      ])
    )
      .to.emit(pokerPot, "GameCreated")
      .withArgs(1n, organiser.address, token.address, buyInAmount);

    const game = await pokerPot.getGame(1);
    expect(game.organiser).to.equal(organiser.address);
    expect(game.token).to.equal(token.address);
    expect(game.buyInAmount).to.equal(buyInAmount);
    expect(game.status).to.equal(0);
    expect(game.totalPot).to.equal(0);
    expect(await pokerPot.getWhitelist(1)).to.deep.equal([
      playerA.address,
      playerB.address,
    ]);
    expect(await pokerPot.isWhitelisted(1, playerA.address)).to.equal(true);
    expect(await pokerPot.isWhitelisted(1, playerB.address)).to.equal(true);
  });

  it("rejects game creation with a non-allowlisted token", async function () {
    const { pokerPot, organiser, playerA, outsider } = await deployFixture();

    await expect(
      pokerPot
        .connect(organiser)
        .createGame(outsider.address, 1n, [playerA.address])
    ).to.be.revertedWithCustomError(pokerPot, "TokenNotAllowed");
  });

  it("rejects zero buy-in amount and empty whitelist", async function () {
    const { pokerPot, organiser, playerA, token } = await deployFixture();

    await expect(
      pokerPot.connect(organiser).createGame(token.address, 0n, [
        playerA.address,
      ])
    ).to.be.revertedWithCustomError(pokerPot, "InvalidBuyInAmount");

    await expect(
      pokerPot.connect(organiser).createGame(token.address, 1n, [])
    ).to.be.revertedWithCustomError(pokerPot, "EmptyWhitelist");
  });

  it("lets only the organiser update whitelist while open", async function () {
    const { pokerPot, organiser, playerA, playerB, outsider, token } =
      await deployFixture();
    await pokerPot
      .connect(organiser)
      .createGame(token.address, 1n, [playerA.address]);

    await expect(
      pokerPot.connect(outsider).setWhitelist(1, playerB.address, true)
    ).to.be.revertedWithCustomError(pokerPot, "OnlyOrganiser");

    await expect(
      pokerPot.connect(organiser).setWhitelist(1, playerB.address, true)
    )
      .to.emit(pokerPot, "WhitelistUpdated")
      .withArgs(1n, playerB.address, true);

    expect(await pokerPot.getWhitelist(1)).to.deep.equal([
      playerA.address,
      playerB.address,
    ]);

    await expect(
      pokerPot.connect(organiser).setWhitelist(1, playerA.address, false)
    )
      .to.emit(pokerPot, "WhitelistUpdated")
      .withArgs(1n, playerA.address, false);

    expect(await pokerPot.isWhitelisted(1, playerA.address)).to.equal(false);
    expect(await pokerPot.getWhitelist(1)).to.deep.equal([playerB.address]);
  });

  it("rejects zero-address entries during game creation", async function () {
    const { pokerPot, organiser, token } = await deployFixture();

    await expect(
      pokerPot
        .connect(organiser)
        .createGame(token.address, 1n, [ethers.ZeroAddress])
    ).to.be.revertedWithCustomError(pokerPot, "InvalidAddress");
  });

  it("rejects zero-address whitelist updates", async function () {
    const { pokerPot, organiser, playerA, token } = await deployFixture();
    await pokerPot
      .connect(organiser)
      .createGame(token.address, 1n, [playerA.address]);

    await expect(
      pokerPot.connect(organiser).setWhitelist(1, ethers.ZeroAddress, true)
    ).to.be.revertedWithCustomError(pokerPot, "InvalidAddress");
  });

  it("deduplicates repeated initial whitelist entries", async function () {
    const { pokerPot, organiser, playerA, playerB, token } =
      await deployFixture();

    await pokerPot.connect(organiser).createGame(token.address, 1n, [
      playerA.address,
      playerB.address,
      playerA.address,
      playerB.address,
    ]);

    expect(await pokerPot.getWhitelist(1)).to.deep.equal([
      playerA.address,
      playerB.address,
    ]);
  });

  it("keeps whitelist stable for duplicate adds and non-member removals", async function () {
    const { pokerPot, organiser, playerA, playerB, outsider, token } =
      await deployFixture();
    await pokerPot
      .connect(organiser)
      .createGame(token.address, 1n, [playerA.address]);

    await pokerPot.connect(organiser).setWhitelist(1, playerB.address, true);
    await pokerPot.connect(organiser).setWhitelist(1, playerB.address, true);

    expect(await pokerPot.getWhitelist(1)).to.deep.equal([
      playerA.address,
      playerB.address,
    ]);

    await pokerPot.connect(organiser).setWhitelist(1, outsider.address, false);

    expect(await pokerPot.getWhitelist(1)).to.deep.equal([
      playerA.address,
      playerB.address,
    ]);
  });

  it("rejects missing game IDs", async function () {
    const { pokerPot, organiser, playerA } = await deployFixture();

    await expect(pokerPot.getGame(999)).to.be.revertedWithCustomError(
      pokerPot,
      "GameNotFound"
    );
    await expect(pokerPot.getWhitelist(999)).to.be.revertedWithCustomError(
      pokerPot,
      "GameNotFound"
    );
    await expect(
      pokerPot.connect(organiser).setWhitelist(999, playerA.address, true)
    ).to.be.revertedWithCustomError(pokerPot, "GameNotFound");
  });

  it("repairs whitelist indexes after removing a middle member", async function () {
    const { pokerPot, organiser, playerA, playerB, outsider, token } =
      await deployFixture();
    await pokerPot.connect(organiser).createGame(token.address, 1n, [
      playerA.address,
      playerB.address,
      outsider.address,
    ]);

    await pokerPot.connect(organiser).setWhitelist(1, playerB.address, false);

    expect(await pokerPot.getWhitelist(1)).to.deep.equal([
      playerA.address,
      outsider.address,
    ]);
    expect(await pokerPot.isWhitelisted(1, playerB.address)).to.equal(false);

    await pokerPot.connect(organiser).setWhitelist(1, outsider.address, false);

    expect(await pokerPot.getWhitelist(1)).to.deep.equal([playerA.address]);
    expect(await pokerPot.isWhitelisted(1, outsider.address)).to.equal(false);
  });
});
