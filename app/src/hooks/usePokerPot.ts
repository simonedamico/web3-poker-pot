import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { erc20Abi, parseEventLogs, type Hash, type TransactionReceipt } from "viem";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { pokerPotAbi, pokerPotAddress } from "../contracts/pokerPot";

export type GameData = readonly [
  organiser: `0x${string}`,
  token: `0x${string}`,
  buyInAmount: bigint,
  status: number,
  totalPot: bigint,
];

export type ParticipantBuyIn = {
  account: `0x${string}`;
  count: bigint;
};

function errorMessage(error: Error | null | undefined): string | null {
  return error?.message ?? null;
}

function gameCreatedId(receipt: TransactionReceipt): bigint {
  const logs = parseEventLogs({
    abi: pokerPotAbi,
    eventName: "GameCreated",
    logs: receipt.logs,
  });
  const created = logs.find((log) => log.eventName === "GameCreated");
  const gameId = (created?.args as { gameId?: bigint } | undefined)?.gameId;

  if (gameId === undefined) {
    throw new Error("GameCreated event was not found in the transaction receipt.");
  }

  return gameId;
}

export function usePokerPotGame(gameId: bigint) {
  const { address } = useAccount();

  const game = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "getGame",
    args: [gameId],
  });
  const gameData = game.data as GameData | undefined;

  const whitelist = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "getWhitelist",
    args: [gameId],
  });

  const participants = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "getParticipants",
    args: [gameId],
  });
  const participantAddresses = (participants.data as `0x${string}`[] | undefined) ?? [];

  const payouts = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "getPayouts",
    args: [gameId],
  });

  const participantBuyInReads = useReadContracts({
    contracts: participantAddresses.map((participant) => ({
      address: pokerPotAddress,
      abi: pokerPotAbi,
      functionName: "buyInCount",
      args: [gameId, participant],
    })),
    query: {
      enabled: participantAddresses.length > 0,
    },
  });
  const failedParticipantBuyIn = participantBuyInReads.data?.find((row) => row.status === "failure");

  const connectedBuyInCount = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "buyInCount",
    args: address ? [gameId, address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const allowance = useReadContract({
    address: gameData?.[1],
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, pokerPotAddress] : undefined,
    query: {
      enabled: Boolean(address && gameData?.[1]),
    },
  });

  const participantBuyIns = {
    ...participantBuyInReads,
    error:
      participantBuyInReads.error ??
      (failedParticipantBuyIn
        ? failedParticipantBuyIn.error instanceof Error
          ? failedParticipantBuyIn.error
          : new Error("Could not load one or more participant buy-in counts.")
        : null),
    data:
      participantBuyInReads.data && participantBuyInReads.data.length === participantAddresses.length
        ? participantAddresses.map((participant, index) => {
            const row = participantBuyInReads.data[index];
            return row.status === "success"
              ? {
                  account: participant,
                  count: row.result as bigint,
                }
              : undefined;
          })
        : undefined,
  };

  return {
    game,
    whitelist,
    participants,
    payouts,
    participantBuyIns,
    connectedBuyInCount,
    allowance,
  };
}

export function usePokerPotWrites() {
  const [miningCount, setMiningCount] = useState(0);
  const [miningError, setMiningError] = useState<Error | null>(null);
  const [operationError, setOperationError] = useState<Error | null>(null);
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const pokerPotWrite = useWriteContract();
  const tokenWrite = useWriteContract();

  async function waitForReceipt(hash: Hash) {
    if (!publicClient) {
      throw new Error("Wallet client is not connected to a public RPC client.");
    }

    setMiningCount((count) => count + 1);
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      await queryClient.invalidateQueries();
      return receipt;
    } catch (caughtError) {
      const error = caughtError instanceof Error ? caughtError : new Error("Transaction failed.");
      setMiningError(error);
      throw error;
    } finally {
      setMiningCount((count) => Math.max(0, count - 1));
    }
  }

  async function writePokerPot(functionName: string, args: readonly unknown[]) {
    setMiningError(null);
    setOperationError(null);
    try {
      const hash = await pokerPotWrite.writeContractAsync({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName,
        args,
      });
      return await waitForReceipt(hash);
    } catch (caughtError) {
      const error = caughtError instanceof Error ? caughtError : new Error("Transaction failed.");
      setOperationError(error);
      throw error;
    }
  }

  async function writeToken(token: `0x${string}`, amount: bigint) {
    setMiningError(null);
    setOperationError(null);
    try {
      const hash = await tokenWrite.writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [pokerPotAddress, amount],
      });
      await waitForReceipt(hash);
    } catch (caughtError) {
      const error = caughtError instanceof Error ? caughtError : new Error("Transaction failed.");
      setOperationError(error);
      throw error;
    }
  }

  return {
    isPending: pokerPotWrite.isPending || tokenWrite.isPending || miningCount > 0,
    error:
      errorMessage(pokerPotWrite.error) ??
      errorMessage(tokenWrite.error) ??
      errorMessage(operationError) ??
      errorMessage(miningError),
    createGame: async (token: `0x${string}`, buyInAmount: bigint, whitelist: `0x${string}`[]) => {
      const receipt = await writePokerPot("createGame", [token, buyInAmount, whitelist]);
      return gameCreatedId(receipt);
    },
    buyIn: async (gameId: bigint, count: bigint) => {
      await writePokerPot("buyIn", [gameId, count]);
    },
    setWhitelist: async (gameId: bigint, account: `0x${string}`, allowed: boolean) => {
      await writePokerPot("setWhitelist", [gameId, account, allowed]);
    },
    finalize: async (gameId: bigint, recipients: `0x${string}`[], amounts: bigint[]) => {
      await writePokerPot("finalize", [gameId, recipients, amounts]);
    },
    approve: writeToken,
  };
}
