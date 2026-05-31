import { Fuel } from "lucide-react";
import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { localChainId } from "../contracts/pokerPot";

const HARDHAT_RPC_URL = "http://127.0.0.1:8545";
const GAS_BALANCE_HEX = `0x${(100n * 10n ** 18n).toString(16)}`;

export function HardhatGasButton() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const isLocalHardhat = chainId === localChainId;
  const disabled = !address || !isLocalHardhat || status === "loading";
  const label = !address
    ? "Connect wallet for gas"
    : !isLocalHardhat
      ? "Switch to Hardhat for gas"
      : status === "loading"
        ? "Loading gas"
        : "Get hardhat gas";

  async function handleClick() {
    if (!address || !isLocalHardhat) return;

    setStatus("loading");
    try {
      const response = await fetch(HARDHAT_RPC_URL, {
        body: JSON.stringify({
          id: "hardhat-gas",
          jsonrpc: "2.0",
          method: "hardhat_setBalance",
          params: [address, GAS_BALANCE_HEX],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok || payload.error) {
        throw new Error(payload.error?.message ?? "Could not load hardhat gas.");
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="gas-faucet">
      <button className="secondary-button chip-button" type="button" disabled={disabled} onClick={handleClick}>
        <Fuel className="button-icon" size={17} aria-hidden="true" />
        {label}
      </button>
      {status === "success" ? <span className="faucet-status">Gas loaded</span> : null}
      {status === "error" ? <span className="error-text">Gas failed</span> : null}
    </div>
  );
}
