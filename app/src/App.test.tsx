import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const pokerPotWrites = vi.hoisted(() => ({
  createGame: vi.fn(),
  isPending: false,
  error: null,
}));

vi.mock("./hooks/usePokerPot", () => ({
  usePokerPotWrites: () => pokerPotWrites,
}));

vi.mock("./hooks/useTokenMetadata", () => ({
  useTokenMetadata: () => ({
    metadataByAddress: {},
  }),
  tokenDisplayLabel: (address: `0x${string}`) => address,
  tokenMetadataKey: (address: `0x${string}`) => address.toLowerCase(),
}));

vi.mock("./hooks/useEnsNames", () => ({
  useEnsNameResolver: () => vi.fn().mockResolvedValue(null),
}));

vi.mock("./pages/GamePage", () => ({
  GamePage: ({ gameId }: { gameId: bigint }) => <h1>Game #{gameId.toString()}</h1>,
}));

vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: () => <button type="button">Connect wallet</button>,
}));

vi.mock("./components/HardhatGasButton", () => ({
  HardhatGasButton: () => <button type="button">Get hardhat gas</button>,
}));

vi.mock("./components/LocalTokenMintButton", () => ({
  LocalTokenMintButton: () => <button type="button">Get buy-in tokens</button>,
}));

describe("App", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    pokerPotWrites.createGame.mockReset();
    pokerPotWrites.createGame.mockResolvedValue(42n);
    pokerPotWrites.isPending = false;
    pokerPotWrites.error = null;
  });

  it("renders the create-game view by default", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Open a poker table" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buy-in amount")).toBeInTheDocument();
  });

  it("renders a wallet connect control", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeInTheDocument();
  });

  it("renders the local hardhat gas control", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Get hardhat gas" })).toBeInTheDocument();
  });

  it("renders the local buy-in token control", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Get buy-in tokens" })).toBeInTheDocument();
  });

  it("uses poker table branding in the toolbar", () => {
    render(<App />);

    expect(screen.getByText("Poker Pot Table")).toBeInTheDocument();
    expect(screen.getByText("Table stakes, buy-ins, and final chip splits onchain")).toBeInTheDocument();
  });

  it("updates the URL to the shareable game route after creation", async () => {
    render(<App />);

    const tokenSelect = screen.getByLabelText("Token") as HTMLSelectElement;
    fireEvent.change(tokenSelect, { target: { value: tokenSelect.options[1].value } });
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), {
      target: { value: "0x0000000000000000000000000000000000000001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    await waitFor(() => expect(window.location.pathname).toBe("/game/42"));
    expect(screen.getByRole("heading", { name: "Game #42" })).toBeInTheDocument();
  });

  it("returns to the create-game route when the browser path returns home", async () => {
    render(<App />);

    const tokenSelect = screen.getByLabelText("Token") as HTMLSelectElement;
    fireEvent.change(tokenSelect, { target: { value: tokenSelect.options[1].value } });
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), {
      target: { value: "0x0000000000000000000000000000000000000001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Game #42" })).toBeInTheDocument());

    act(() => {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => expect(screen.getByRole("heading", { name: "Open a poker table" })).toBeInTheDocument());
  });
});
