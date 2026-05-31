import { expect } from "chai";
import { ethers } from "hardhat";

describe("PokerPot token allowlist", function () {
  async function deployFixture() {
    const [owner, other, token] = await ethers.getSigners();
    const PokerPot = await ethers.getContractFactory("PokerPot");
    const pokerPot = await PokerPot.deploy(owner.address);
    return { pokerPot, owner, other, token };
  }

  it("lets the owner allowlist and remove a token", async function () {
    const { pokerPot, token } = await deployFixture();

    await expect(pokerPot.setTokenAllowed(token.address, true))
      .to.emit(pokerPot, "TokenAllowlistUpdated")
      .withArgs(token.address, true);

    expect(await pokerPot.isTokenAllowed(token.address)).to.equal(true);

    await expect(pokerPot.setTokenAllowed(token.address, false))
      .to.emit(pokerPot, "TokenAllowlistUpdated")
      .withArgs(token.address, false);

    expect(await pokerPot.isTokenAllowed(token.address)).to.equal(false);
  });

  it("rejects allowlist changes from non-owners", async function () {
    const { pokerPot, other, token } = await deployFixture();

    await expect(
      pokerPot.connect(other).setTokenAllowed(token.address, true)
    ).to.be.revertedWithCustomError(pokerPot, "OwnableUnauthorizedAccount");
  });

  it("rejects the zero address token", async function () {
    const { pokerPot } = await deployFixture();

    await expect(
      pokerPot.setTokenAllowed(ethers.ZeroAddress, true)
    ).to.be.revertedWithCustomError(pokerPot, "InvalidToken");
  });
});
