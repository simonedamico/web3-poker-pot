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

describe("App", () => {
  it("renders the create-game view by default", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Create poker pot" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buy-in amount")).toBeInTheDocument();
  });
});
