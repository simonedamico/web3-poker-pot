import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

const pokerPotWrites = vi.hoisted(() => ({
  createGame: vi.fn(),
  isPending: false,
  error: null,
}));

vi.mock("./hooks/usePokerPot", () => ({
  usePokerPotWrites: () => pokerPotWrites,
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
});
