import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pokerPotAddress } from "../contracts/pokerPot";
import { usePokerPotGame, usePokerPotWrites } from "./usePokerPot";

const mocks = vi.hoisted(() => ({
  address: undefined as `0x${string}` | undefined,
  invalidateQueries: vi.fn(),
  parseEventLogs: vi.fn(),
  useReadContract: vi.fn(),
  useReadContracts: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  writeContractAsync: vi.fn(),
}));

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    parseEventLogs: mocks.parseEventLogs,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
  }),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: mocks.address }),
  usePublicClient: () => ({
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
  }),
  useReadContract: mocks.useReadContract,
  useReadContracts: mocks.useReadContracts,
  useWriteContract: () => ({
    writeContractAsync: mocks.writeContractAsync,
    isPending: false,
    error: null,
  }),
}));

describe("usePokerPot", () => {
  beforeEach(() => {
    mocks.address = undefined;
    mocks.invalidateQueries.mockReset();
    mocks.parseEventLogs.mockReset();
    mocks.useReadContract.mockReset();
    mocks.useReadContract.mockReturnValue({});
    mocks.useReadContracts.mockReset();
    mocks.useReadContracts.mockReturnValue({ data: [] });
    mocks.waitForTransactionReceipt.mockReset();
    mocks.writeContractAsync.mockReset();
  });

  it("waits for createGame to mine, parses the GameCreated event, and invalidates reads", async () => {
    mocks.writeContractAsync.mockResolvedValue("0xabc");
    mocks.waitForTransactionReceipt.mockResolvedValue({ logs: [{ data: "0x" }] });
    mocks.parseEventLogs.mockReturnValue([{ eventName: "GameCreated", args: { gameId: 42n } }]);

    const { result } = renderHook(() => usePokerPotWrites());
    let gameId: bigint | undefined;
    await act(async () => {
      gameId = await result.current.createGame(
        "0x0000000000000000000000000000000000000002",
        25_000_000n,
        ["0x0000000000000000000000000000000000000001"],
      );
    });

    expect(gameId).toBe(42n);
    expect(mocks.writeContractAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "createGame",
      }),
    );
    expect(mocks.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: "0xabc" });
    expect(mocks.invalidateQueries).toHaveBeenCalled();
  });

  it("throws when a mined create receipt does not contain GameCreated", async () => {
    mocks.writeContractAsync.mockResolvedValue("0xabc");
    mocks.waitForTransactionReceipt.mockResolvedValue({ logs: [] });
    mocks.parseEventLogs.mockReturnValue([]);

    const { result } = renderHook(() => usePokerPotWrites());

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.createGame("0x0000000000000000000000000000000000000002", 25_000_000n, [
          "0x0000000000000000000000000000000000000001",
        ]);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe("GameCreated event was not found in the transaction receipt.");
  });

  it("throws and exposes an error when a mined receipt reverted", async () => {
    mocks.writeContractAsync.mockResolvedValue("0xabc");
    mocks.waitForTransactionReceipt.mockResolvedValue({ logs: [], status: "reverted" });

    const { result } = renderHook(() => usePokerPotWrites());

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.createGame("0x0000000000000000000000000000000000000002", 25_000_000n, [
          "0x0000000000000000000000000000000000000001",
        ]);
      } catch (error) {
        caughtError = error;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe("Transaction reverted.");
    expect(result.current.error).toBe("Transaction reverted.");
    expect(mocks.parseEventLogs).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it("omits connected buy-in count args when no wallet is connected", () => {
    renderHook(() => usePokerPotGame(7n));

    expect(mocks.useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: pokerPotAddress,
        functionName: "buyInCount",
        args: undefined,
      }),
    );
  });

  it("surfaces failed participant buy-in count reads", () => {
    const participant = "0x0000000000000000000000000000000000000001";
    mocks.useReadContract.mockImplementation(({ functionName }) =>
      functionName === "getParticipants" ? { data: [participant] } : {},
    );
    mocks.useReadContracts.mockReturnValue({
      data: [{ status: "failure", error: new Error("Count read reverted.") }],
      error: null,
    });

    const { result } = renderHook(() => usePokerPotGame(7n));

    expect(result.current.participantBuyIns.error).toHaveProperty("message", "Count read reverted.");
    expect(result.current.participantBuyIns.data).toEqual([undefined]);
  });
});
