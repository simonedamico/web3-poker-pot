import { Coins } from "lucide-react";
import { useState } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { localChainId, localMockToken } from "../contracts/pokerPot";

const MINT_AMOUNT = 1_000n * 10n ** 6n;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const mockErc20MintAbi = [
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

function isLocalBrowser() {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function LocalTokenMintButton() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const tokenWrite = useWriteContract();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  if (!isLocalBrowser() || localMockToken === ZERO_ADDRESS) {
    return null;
  }

  const isLocalHardhat = chainId === localChainId;
  const disabled = !address || !isLocalHardhat || status === "loading" || tokenWrite.isPending;
  const label = !address
    ? "Connect wallet for tokens"
    : !isLocalHardhat
      ? "Switch to Hardhat for tokens"
      : status === "loading" || tokenWrite.isPending
        ? "Minting tokens"
        : "Get buy-in tokens";

  async function handleClick() {
    if (!address || !isLocalHardhat) return;

    setStatus("loading");
    try {
      if (!publicClient) {
        throw new Error("Wallet client is not connected to a public RPC client.");
      }
      const hash = await tokenWrite.writeContractAsync({
        address: localMockToken,
        abi: mockErc20MintAbi,
        functionName: "mint",
        args: [address, MINT_AMOUNT],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "reverted") {
        throw new Error("Token mint reverted.");
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="token-faucet">
      <button className="secondary-button chip-button" type="button" disabled={disabled} onClick={handleClick}>
        <Coins className="button-icon" size={17} aria-hidden="true" />
        {label}
      </button>
      {status === "success" ? <span className="faucet-status">Tokens loaded</span> : null}
      {status === "error" ? <span className="error-text">Token mint failed</span> : null}
    </div>
  );
}
