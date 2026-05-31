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

describe("App", () => {
  it("renders the create-game view by default", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Create poker pot" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buy-in amount")).toBeInTheDocument();
  });

  it("renders a wallet connect control", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeInTheDocument();
  });
});
