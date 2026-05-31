import type { Abi } from "viem";
import pokerPotArtifact from "./PokerPot.json";
import deployments from "./deployments.local.json";

export const pokerPotAbi = pokerPotArtifact.abi as Abi;
export const pokerPotAddress = deployments.pokerPot as `0x${string}`;
export const allowlistedTokens = deployments.allowlistedTokens as `0x${string}`[];
export const localMockToken = deployments.mockToken as `0x${string}`;
export const localChainId = deployments.chainId;
