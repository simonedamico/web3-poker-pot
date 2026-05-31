import { erc20Abi } from "viem";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
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

  const connectedBuyInCount = useReadContract({
    address: pokerPotAddress,
    abi: pokerPotAbi,
    functionName: "buyInCount",
    args: [gameId, address],
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
    data: participantAddresses.map((participant, index) => ({
      account: participant,
      count: (participantBuyInReads.data?.[index]?.result as bigint | undefined) ?? 0n,
    })),
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
  const pokerPotWrite = useWriteContract();
  const tokenWrite = useWriteContract();

  return {
    isPending: pokerPotWrite.isPending || tokenWrite.isPending,
    error: errorMessage(pokerPotWrite.error) ?? errorMessage(tokenWrite.error),
    createGame: (token: `0x${string}`, buyInAmount: bigint, whitelist: `0x${string}`[]) =>
      pokerPotWrite.writeContract({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName: "createGame",
        args: [token, buyInAmount, whitelist],
      }),
    buyIn: (gameId: bigint, count: bigint) =>
      pokerPotWrite.writeContract({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName: "buyIn",
        args: [gameId, count],
      }),
    setWhitelist: (gameId: bigint, account: `0x${string}`, allowed: boolean) =>
      pokerPotWrite.writeContract({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName: "setWhitelist",
        args: [gameId, account, allowed],
      }),
    finalize: (gameId: bigint, recipients: `0x${string}`[], amounts: bigint[]) =>
      pokerPotWrite.writeContract({
        address: pokerPotAddress,
        abi: pokerPotAbi,
        functionName: "finalize",
        args: [gameId, recipients, amounts],
      }),
    approve: (token: `0x${string}`, amount: bigint) =>
      tokenWrite.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [pokerPotAddress, amount],
      }),
  };
}
