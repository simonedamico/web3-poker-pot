import { expect } from "chai";
import { ethers } from "hardhat";
import { getDeploymentFileName, parseAllowlistTokens } from "../scripts/deploy";

describe("deployment script helpers", function () {
  it("normalizes and deduplicates allowlist token addresses", function () {
    const tokenA = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
    const tokenALower = tokenA.toLowerCase();
    const tokenB = "0x000000000000000000000000000000000000dEaD";

    expect(
      parseAllowlistTokens(` ${tokenALower}, ${tokenA}, ${tokenB} `)
    ).to.deep.equal([ethers.getAddress(tokenA), ethers.getAddress(tokenB)]);
  });

  it("rejects invalid allowlist token addresses before deployment", function () {
    expect(() => parseAllowlistTokens("not-an-address")).to.throw(
      "Invalid ALLOWLIST_TOKEN_ADDRESSES entry"
    );
  });

  it("rejects the zero address in allowlist token addresses", function () {
    expect(() => parseAllowlistTokens(ethers.ZeroAddress)).to.throw(
      "zero address"
    );
  });

  it("uses local metadata for local networks and network-specific metadata otherwise", function () {
    expect(getDeploymentFileName("localhost")).to.equal("deployments.local.json");
    expect(getDeploymentFileName("hardhat")).to.equal("deployments.local.json");
    expect(getDeploymentFileName("testnet")).to.equal("deployments.testnet.json");
  });
});
