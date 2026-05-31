import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateGamePage } from "./CreateGamePage";

const TOKEN = "0x0000000000000000000000000000000000000002" as const;
const OTHER_TOKEN = "0x0000000000000000000000000000000000000003" as const;
const WHITELIST_ADDRESS = "0x0000000000000000000000000000000000000001";
const HARDHAT_ACCOUNT = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

const pokerPotWrites = vi.hoisted(() => ({
  createGame: vi.fn(),
  isPending: false,
  error: null as string | null,
}));
const tokenMetadataState = vi.hoisted(() => ({
  metadataByAddress: {} as Record<string, { address: `0x${string}`; name?: string; symbol?: string }>,
}));
const ensState = vi.hoisted(() => ({
  resolveEnsName: vi.fn(),
}));

vi.mock("../hooks/usePokerPot", () => ({
  usePokerPotWrites: () => pokerPotWrites,
}));

vi.mock("../hooks/useTokenMetadata", () => ({
  useTokenMetadata: () => ({
    metadataByAddress: tokenMetadataState.metadataByAddress,
  }),
  tokenDisplayLabel: (
    address: `0x${string}`,
    metadata?: { address: `0x${string}`; name?: string; symbol?: string },
  ) => (metadata?.name && metadata?.symbol ? `${metadata.name} (${metadata.symbol}) - ${address}` : address),
  tokenMetadataKey: (address: `0x${string}`) => address.toLowerCase(),
}));

vi.mock("../hooks/useEnsNames", () => ({
  useEnsNameResolver: () => ensState.resolveEnsName,
}));

describe("CreateGamePage", () => {
  beforeEach(() => {
    pokerPotWrites.createGame.mockReset();
    pokerPotWrites.isPending = false;
    pokerPotWrites.error = null;
    tokenMetadataState.metadataByAddress = {};
    ensState.resolveEnsName.mockReset();
    ensState.resolveEnsName.mockResolvedValue(null);
  });

  it("blocks creation when buy-in amount is invalid", () => {
    const onCreated = vi.fn();
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), {
      target: { value: WHITELIST_ADDRESS },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Amount must be greater than zero.");
    expect(screen.getByLabelText("Buy-in amount")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Buy-in amount")).toHaveAttribute("aria-describedby");
    expect(pokerPotWrites.createGame).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("blocks creation when whitelist contains invalid addresses", async () => {
    const onCreated = vi.fn();
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Token"), { target: { value: TOKEN } });
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: "bad-address" } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Line 1 is not a valid EVM address or ENS name.");
    expect(screen.getByLabelText("Whitelist addresses")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Whitelist addresses")).toHaveAttribute("aria-describedby");
    expect(pokerPotWrites.createGame).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows setup guidance and disables creation when no tokens are configured", () => {
    render(<CreateGamePage onCreated={vi.fn()} availableTokens={[]} />);

    expect(
      screen.getByText("No allowlisted tokens are configured. Run deployment setup before creating a game."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Buy-in amount")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fill local test table" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create game" })).toBeDisabled();
  });

  it("fills a valid local hardhat test table", () => {
    render(<CreateGamePage onCreated={vi.fn()} availableTokens={[TOKEN]} />);

    fireEvent.click(screen.getByRole("button", { name: "Fill local test table" }));

    expect(screen.getByLabelText("Token")).toHaveValue(TOKEN);
    expect(screen.getByLabelText("Buy-in amount")).toHaveValue("10");
    expect((screen.getByLabelText("Whitelist addresses") as HTMLTextAreaElement).value).toContain(HARDHAT_ACCOUNT);
  });

  it("shows the token name and symbol in token choices", () => {
    tokenMetadataState.metadataByAddress = {
      [TOKEN.toLowerCase()]: { address: TOKEN, name: "Poker USD", symbol: "PUSD" },
    };

    render(<CreateGamePage onCreated={vi.fn()} availableTokens={[TOKEN]} />);

    expect(screen.getByRole("option", { name: `Poker USD (PUSD) - ${TOKEN}` })).toBeInTheDocument();
  });

  it("blocks creation when no token is selected", () => {
    const onCreated = vi.fn();
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: WHITELIST_ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Select an allowlisted token.");
    expect(screen.getByLabelText("Token")).toHaveAttribute("aria-invalid", "true");
    expect(pokerPotWrites.createGame).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("blocks creation when selected token is not allowlisted", () => {
    const onCreated = vi.fn();
    const { rerender } = render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Token"), { target: { value: TOKEN } });
    rerender(<CreateGamePage onCreated={onCreated} availableTokens={[OTHER_TOKEN]} />);
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: WHITELIST_ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Select an allowlisted token.");
    expect(pokerPotWrites.createGame).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("routes to the mined game id from the GameCreated event", async () => {
    const onCreated = vi.fn();
    pokerPotWrites.createGame.mockResolvedValue(42n);
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Token"), { target: { value: TOKEN } });
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: WHITELIST_ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    await waitFor(() => expect(pokerPotWrites.createGame).toHaveBeenCalledWith(TOKEN, 25_000_000n, [WHITELIST_ADDRESS]));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(42n));
  });

  it("resolves ENS names in the whitelist before creating a game", async () => {
    const onCreated = vi.fn();
    ensState.resolveEnsName.mockResolvedValue(WHITELIST_ADDRESS);
    pokerPotWrites.createGame.mockResolvedValue(42n);
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Token"), { target: { value: TOKEN } });
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: "alice.eth" } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(ensState.resolveEnsName).toHaveBeenCalledWith("alice.eth");
    await waitFor(() => expect(pokerPotWrites.createGame).toHaveBeenCalledWith(TOKEN, 25_000_000n, [WHITELIST_ADDRESS]));
  });

  it("blocks creation when a whitelist ENS name cannot be resolved", async () => {
    render(<CreateGamePage onCreated={vi.fn()} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Token"), { target: { value: TOKEN } });
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: "missing.eth" } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Line 1 ENS name could not be resolved.");
    expect(pokerPotWrites.createGame).not.toHaveBeenCalled();
  });

  it("keeps the user on the create page and shows create errors", async () => {
    const onCreated = vi.fn();
    pokerPotWrites.createGame.mockRejectedValue(new Error("GameCreated event was not found in the transaction receipt."));
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Token"), { target: { value: TOKEN } });
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: WHITELIST_ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("GameCreated event was not found in the transaction receipt."),
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("disables creation while the wallet write is pending and displays write errors", () => {
    pokerPotWrites.isPending = true;
    pokerPotWrites.error = "User rejected the transaction.";

    render(<CreateGamePage onCreated={vi.fn()} availableTokens={[TOKEN]} />);

    expect(screen.getByRole("button", { name: "Creating game" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("User rejected the transaction.");
  });
});
