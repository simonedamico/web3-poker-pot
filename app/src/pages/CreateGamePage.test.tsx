import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateGamePage } from "./CreateGamePage";

describe("CreateGamePage", () => {
  it("blocks creation when buy-in amount is invalid", () => {
    render(<CreateGamePage onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), {
      target: { value: "0x0000000000000000000000000000000000000001" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByText("Amount must be greater than zero.")).toBeInTheDocument();
  });

  it("blocks creation when whitelist contains invalid addresses", () => {
    render(<CreateGamePage onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: "bad-address" } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByText("Line 1 is not a valid EVM address.")).toBeInTheDocument();
  });
});
