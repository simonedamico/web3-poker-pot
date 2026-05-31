import fs from "node:fs";
import path from "node:path";

async function main() {
  const artifactPath = path.join(process.cwd(), "artifacts", "contracts", "PokerPot.sol", "PokerPot.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const outputPath = path.join(process.cwd(), "app", "src", "contracts", "PokerPot.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({ abi: artifact.abi }, null, 2) + "\n");
  console.log(`Exported PokerPot ABI to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
