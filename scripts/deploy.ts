import { ethers, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

function isLocalNetwork(networkName: string): boolean {
  return networkName === "localhost" || networkName === "hardhat";
}

export function getDeploymentFileName(networkName: string): string {
  return isLocalNetwork(networkName)
    ? "deployments.local.json"
    : `deployments.${networkName}.json`;
}

export function parseAllowlistTokens(raw: string): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }

    let tokenAddress: string;
    try {
      tokenAddress = ethers.getAddress(trimmed);
    } catch {
      throw new Error(`Invalid ALLOWLIST_TOKEN_ADDRESSES entry: ${trimmed}`);
    }

    if (tokenAddress === ethers.ZeroAddress) {
      throw new Error(
        "ALLOWLIST_TOKEN_ADDRESSES cannot include the zero address"
      );
    }

    const key = tokenAddress.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      tokens.push(tokenAddress);
    }
  }

  return tokens;
}

async function main() {
  const allowedTokens = parseAllowlistTokens(
    process.env.ALLOWLIST_TOKEN_ADDRESSES ?? ""
  );
  const [deployer] = await ethers.getSigners();

  const PokerPot = await ethers.getContractFactory("PokerPot");
  const pokerPot = await PokerPot.deploy(deployer.address);
  await pokerPot.waitForDeployment();

  const pokerPotAddress = await pokerPot.getAddress();

  let mockTokenAddress = ethers.ZeroAddress;
  if (isLocalNetwork(network.name)) {
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

  if (network.name === "hardhat") {
    console.warn("Warning: hardhat in-process deployment addresses are ephemeral.");
  }

  const outputPath = path.join(
    process.cwd(),
    "app",
    "src",
    "contracts",
    getDeploymentFileName(network.name)
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");

  console.log(JSON.stringify(output, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
