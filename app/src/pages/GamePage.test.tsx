import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GamePage } from "./GamePage";

const addresses = vi.hoisted(() => ({
  organiser: "0x0000000000000000000000000000000000000001" as const,
  token: "0x0000000000000000000000000000000000000002" as const,
  participant: "0x0000000000000000000000000000000000000003" as const,
  other: "0x0000000000000000000000000000000000000004" as const,
}));

const hookState = vi.hoisted(() => ({
  account: addresses.participant as `0x${string}` | undefined,
  game: {
    data: [addresses.organiser, addresses.token, 25_000_000n, 0, 50_000_000n] as readonly [
      `0x${string}`,
      `0x${string}`,
      bigint,
      number,
      bigint,
    ],
    isLoading: false,
    error: null as Error | null,
  },
  whitelist: { data: [addresses.participant] as `0x${string}`[], isLoading: false, error: null as Error | null },
  participants: { data: [addresses.participant] as `0x${string}`[], isLoading: false, error: null as Error | null },
  participantBuyIns: {
    data: [{ account: addresses.participant, count: 2n }] as ({ account: `0x${string}`; count: bigint } | undefined)[] | undefined,
    isLoading: false,
    error: null as Error | null,
  },
  connectedBuyInCount: { data: 2n as bigint | undefined, isLoading: false, error: null as Error | null },
  allowance: { data: 0n as bigint | undefined, isLoading: false, error: null as Error | null },
  payouts: {
    data: undefined as readonly [`0x${string}`[], bigint[]] | undefined,
    isLoading: false,
    error: null as Error | null,
  },
  writes: {
    approve: vi.fn(),
    buyIn: vi.fn(),
    setWhitelist: vi.fn(),
    finalize: vi.fn(),
    isPending: false,
    error: null as string | null,
  },
}));
const tokenMetadataState = vi.hoisted(() => ({
  metadataByAddress: {} as Record<string, { address: `0x${string}`; name?: string; symbol?: string }>,
}));
const ensState = vi.hoisted(() => ({
  reverseNames: {} as Record<string, string>,
  resolveEnsName: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: hookState.account }),
}));

vi.mock("../hooks/usePokerPot", () => ({
  usePokerPotGame: () => ({
    game: hookState.game,
    whitelist: hookState.whitelist,
    participants: hookState.participants,
    participantBuyIns: hookState.participantBuyIns,
    connectedBuyInCount: hookState.connectedBuyInCount,
    allowance: hookState.allowance,
    payouts: hookState.payouts,
  }),
  usePokerPotWrites: () => hookState.writes,
}));

vi.mock("../hooks/useTokenMetadata", () => ({
  useTokenMetadata: () => ({
    metadataByAddress: tokenMetadataState.metadataByAddress,
  }),
  tokenSummaryLabel: (
    address: `0x${string}`,
    metadata?: { address: `0x${string}`; name?: string; symbol?: string },
  ) => (metadata?.name && metadata?.symbol ? `${metadata.name} (${metadata.symbol})` : address),
  tokenMetadataKey: (address: `0x${string}`) => address.toLowerCase(),
}));

vi.mock("../hooks/useEnsNames", () => ({
  addressDisplayLabel: (address: `0x${string}`, ensName?: string) => (ensName ? `${address} (${ensName})` : address),
  ensAddressKey: (address: `0x${string}`) => address.toLowerCase(),
  useEnsNameResolver: () => ensState.resolveEnsName,
  useEnsReverseNames: () => ensState.reverseNames,
}));

describe("GamePage", () => {
  beforeEach(() => {
    hookState.account = addresses.participant;
    hookState.game.data = [addresses.organiser, addresses.token, 25_000_000n, 0, 50_000_000n];
    hookState.game.isLoading = false;
    hookState.game.error = null;
    hookState.whitelist.data = [addresses.participant];
    hookState.participants.data = [addresses.participant];
    hookState.participantBuyIns.data = [{ account: addresses.participant, count: 2n }];
    hookState.participantBuyIns.isLoading = false;
    hookState.participantBuyIns.error = null;
    hookState.connectedBuyInCount.data = 2n;
    hookState.allowance.data = 0n;
    hookState.allowance.isLoading = false;
    hookState.allowance.error = null;
    hookState.payouts.data = undefined;
    hookState.payouts.isLoading = false;
    hookState.payouts.error = null;
    hookState.writes.approve.mockReset();
    hookState.writes.buyIn.mockReset();
    hookState.writes.setWhitelist.mockReset();
    hookState.writes.finalize.mockReset();
    hookState.writes.isPending = false;
    hookState.writes.error = null;
    tokenMetadataState.metadataByAddress = {};
    ensState.reverseNames = {};
    ensState.resolveEnsName.mockReset();
    ensState.resolveEnsName.mockResolvedValue(null);
  });

  it("renders live game metadata, whitelist, participants, and buy-in counts", () => {
    render(<GamePage gameId={1n} />);

    expect(screen.getByRole("heading", { name: "Game #1" })).toBeInTheDocument();
    expect(screen.getByText(`Organiser: ${addresses.organiser}`)).toBeInTheDocument();
    expect(screen.getByText(`Token: ${addresses.token}`)).toBeInTheDocument();
    expect(screen.getByText("Buy-in amount: 25")).toBeInTheDocument();
    expect(screen.getByText("Status: Open")).toBeInTheDocument();
    expect(screen.getByText("Total pot: 50")).toBeInTheDocument();
    expect(screen.getByText("Whitelisted addresses: 1")).toBeInTheDocument();
    expect(screen.getAllByText(addresses.participant)).toHaveLength(2);
    expect(screen.getByText("Buy-ins: 2")).toBeInTheDocument();
    expect(screen.getByText("Your buy-ins: 2")).toBeInTheDocument();
  });

  it("shows token name, symbol, and address in game details", () => {
    tokenMetadataState.metadataByAddress = {
      [addresses.token.toLowerCase()]: { address: addresses.token, name: "Poker USD", symbol: "PUSD" },
    };

    render(<GamePage gameId={1n} />);

    expect(screen.getByText("Token: Poker USD (PUSD)")).toBeInTheDocument();
    expect(screen.getByText(`Token address: ${addresses.token}`)).toBeInTheDocument();
  });

  it("shows reverse ENS names beside known addresses", () => {
    ensState.reverseNames = {
      [addresses.organiser.toLowerCase()]: "dealer.eth",
      [addresses.participant.toLowerCase()]: "player.eth",
    };

    render(<GamePage gameId={1n} />);

    expect(screen.getByText(`Organiser: ${addresses.organiser} (dealer.eth)`)).toBeInTheDocument();
    expect(screen.getAllByText(`${addresses.participant} (player.eth)`).length).toBeGreaterThanOrEqual(2);
  });

  it("copies a shareable game link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.history.pushState({}, "", "/game/1");
    render(<GamePage gameId={1n} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy game link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/game/1`);
    expect(await screen.findByText("Game link copied")).toBeInTheDocument();
  });

  it("does not render missing participant buy-in counts as zero", () => {
    hookState.participantBuyIns.data = undefined;
    hookState.participantBuyIns.isLoading = true;

    render(<GamePage gameId={1n} />);

    expect(screen.getByText("Loading participant buy-ins...")).toBeInTheDocument();
    expect(screen.queryByText("Buy-ins: 0")).not.toBeInTheDocument();
  });

  it("surfaces participant buy-in count read errors", () => {
    hookState.participantBuyIns.data = undefined;
    hookState.participantBuyIns.error = new Error("Buy-in count read failed.");

    render(<GamePage gameId={1n} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Buy-in count read failed.");
    expect(screen.queryByText("Buy-ins: 0")).not.toBeInTheDocument();
  });

  it("asks a whitelisted user to approve before buying in when allowance is insufficient", () => {
    render(<GamePage gameId={1n} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve buy-in" }));

    expect(hookState.writes.approve).toHaveBeenCalledWith(addresses.token, 25_000_000n);
    expect(hookState.writes.buyIn).not.toHaveBeenCalled();
  });

  it("disables buy-in actions while allowance is still loading", () => {
    hookState.allowance.data = undefined;
    hookState.allowance.isLoading = true;

    render(<GamePage gameId={1n} />);

    const button = screen.getByRole("button", { name: "Checking allowance" });
    expect(button).toBeDisabled();
    fireEvent.click(button);

    expect(hookState.writes.approve).not.toHaveBeenCalled();
    expect(hookState.writes.buyIn).not.toHaveBeenCalled();
  });

  it("lets a whitelisted user buy in when allowance is sufficient", () => {
    hookState.allowance.data = 25_000_000n;

    render(<GamePage gameId={1n} />);

    fireEvent.click(screen.getByRole("button", { name: "Buy in" }));

    expect(hookState.writes.buyIn).toHaveBeenCalledWith(1n, 1n);
    expect(hookState.writes.approve).not.toHaveBeenCalled();
  });

  it("does not render missing connected buy-in count as zero while loading", () => {
    hookState.connectedBuyInCount.data = undefined;
    hookState.connectedBuyInCount.isLoading = true;

    render(<GamePage gameId={1n} />);

    expect(screen.getByText("Loading your buy-ins...")).toBeInTheDocument();
    expect(screen.queryByText("Your buy-ins: 0")).not.toBeInTheDocument();
  });

  it("surfaces connected buy-in count read errors", () => {
    hookState.connectedBuyInCount.data = undefined;
    hookState.connectedBuyInCount.error = new Error("Connected count read failed.");

    render(<GamePage gameId={1n} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Connected count read failed.");
    expect(screen.queryByText("Your buy-ins: 0")).not.toBeInTheDocument();
  });

  it("hides restricted controls from non-whitelisted non-organiser users", () => {
    hookState.account = addresses.other;
    hookState.whitelist.data = [addresses.participant];

    render(<GamePage gameId={1n} />);

    expect(screen.queryByRole("button", { name: "Buy in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve buy-in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to whitelist" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finalize payouts" })).not.toBeInTheDocument();
  });

  it("lets the organiser update whitelist entries and finalize parsed payout rows", async () => {
    hookState.account = addresses.organiser;

    render(<GamePage gameId={1n} />);

    fireEvent.change(screen.getByLabelText("Whitelist account"), { target: { value: addresses.other } });
    fireEvent.click(screen.getByRole("button", { name: "Add to whitelist" }));
    fireEvent.click(screen.getByRole("button", { name: `Remove ${addresses.participant}` }));
    fireEvent.change(screen.getByLabelText("Recipient 1"), { target: { value: addresses.participant } });
    fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Finalize payouts" }));

    await waitFor(() => expect(hookState.writes.setWhitelist).toHaveBeenCalledWith(1n, addresses.other, true));
    expect(hookState.writes.setWhitelist).toHaveBeenCalledWith(1n, addresses.participant, false);
    expect(hookState.writes.finalize).toHaveBeenCalledWith(1n, [addresses.participant], [50_000_000n]);
  });

  it("resolves ENS names before adding whitelist accounts", async () => {
    hookState.account = addresses.organiser;
    ensState.resolveEnsName.mockResolvedValue(addresses.other);

    render(<GamePage gameId={1n} />);

    fireEvent.change(screen.getByLabelText("Whitelist account"), { target: { value: "guest.eth" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to whitelist" }));

    expect(ensState.resolveEnsName).toHaveBeenCalledWith("guest.eth");
    await waitFor(() => expect(hookState.writes.setWhitelist).toHaveBeenCalledWith(1n, addresses.other, true));
  });

  it("renders final payouts only after the game is finalized", () => {
    hookState.payouts.data = [[addresses.participant], [50_000_000n]];
    const { rerender } = render(<GamePage gameId={1n} />);

    expect(screen.queryByRole("heading", { name: "Final payouts" })).not.toBeInTheDocument();

    hookState.game.data = [addresses.organiser, addresses.token, 25_000_000n, 1, 50_000_000n];
    rerender(<GamePage gameId={1n} />);

    expect(screen.getByRole("heading", { name: "Final payouts" })).toBeInTheDocument();
    expect(screen.getByText(`${addresses.participant}: 50`)).toBeInTheDocument();
  });

  it("renders finalized payout loading and error states", () => {
    hookState.game.data = [addresses.organiser, addresses.token, 25_000_000n, 1, 50_000_000n];
    hookState.payouts.isLoading = true;
    const { rerender } = render(<GamePage gameId={1n} />);

    expect(screen.getByText("Loading final payouts...")).toBeInTheDocument();

    hookState.payouts.isLoading = false;
    hookState.payouts.error = new Error("Payout read reverted.");
    rerender(<GamePage gameId={1n} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Payout read reverted.");
  });
});
