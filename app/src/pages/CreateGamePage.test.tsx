import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateGamePage } from "./CreateGamePage";

const TOKEN = "0x0000000000000000000000000000000000000002" as const;
const OTHER_TOKEN = "0x0000000000000000000000000000000000000003" as const;
const WHITELIST_ADDRESS = "0x0000000000000000000000000000000000000001";

describe("CreateGamePage", () => {
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
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("blocks creation when whitelist contains invalid addresses", () => {
    const onCreated = vi.fn();
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: "bad-address" } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Line 1 is not a valid EVM address.");
    expect(screen.getByLabelText("Whitelist addresses")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Whitelist addresses")).toHaveAttribute("aria-describedby");
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("shows setup guidance and disables creation when no tokens are configured", () => {
    render(<CreateGamePage onCreated={vi.fn()} availableTokens={[]} />);

    expect(
      screen.getByText("No allowlisted tokens are configured. Run deployment setup before creating a game."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Buy-in amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create game" })).toBeDisabled();
  });

  it("blocks creation when no token is selected", () => {
    const onCreated = vi.fn();
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: WHITELIST_ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Select an allowlisted token.");
    expect(screen.getByLabelText("Token")).toHaveAttribute("aria-invalid", "true");
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
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("creates a placeholder game after selecting an allowlisted token", () => {
    const onCreated = vi.fn();
    render(<CreateGamePage onCreated={onCreated} availableTokens={[TOKEN]} />);

    fireEvent.change(screen.getByLabelText("Token"), { target: { value: TOKEN } });
    fireEvent.change(screen.getByLabelText("Buy-in amount"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Whitelist addresses"), { target: { value: WHITELIST_ADDRESS } });
    fireEvent.click(screen.getByRole("button", { name: "Create game" }));

    expect(onCreated).toHaveBeenCalledWith(1n);
  });
});
