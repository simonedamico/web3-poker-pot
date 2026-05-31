import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const [deployer] = await ethers.getSigners();

  const PokerPot = await ethers.getContractFactory("PokerPot");
  const pokerPot = await PokerPot.deploy(deployer.address);
  await pokerPot.waitForDeployment();

  const pokerPotAddress = await pokerPot.getAddress();
  const allowedTokens = (process.env.ALLOWLIST_TOKEN_ADDRESSES ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  let mockTokenAddress = "";
  if (network.name === "localhost" || network.name === "hardhat") {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Poker USD", "PUSD", 6);
    await mockToken.waitForDeployment();
    mockTokenAddress = await mockToken.getAddress();
    allowedTokens.push(mockTokenAddress);
  }

  for (const token of allowedTokens) {
    const tx = await pokerPot.setTokenAllowed(token, true);
    await tx.wait();
  }

  const output = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    pokerPot: pokerPotAddress,
    mockToken: mockTokenAddress,
    allowlistedTokens: allowedTokens
  };

  const outputPath = path.join(process.cwd(), "app", "src", "contracts", "deployments.local.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
