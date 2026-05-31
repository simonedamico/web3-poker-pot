import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GamePage } from "./GamePage";

describe("GamePage", () => {
  it("shows the game id and buy-in controls", () => {
    render(<GamePage gameId={1n} />);

    expect(screen.getByRole("heading", { name: "Game #1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy in" })).toBeInTheDocument();
  });
});
