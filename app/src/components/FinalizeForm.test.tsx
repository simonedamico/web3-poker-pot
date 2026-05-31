import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinalizeForm } from "./FinalizeForm";

describe("FinalizeForm", () => {
  it("disables finalization when payout total does not equal pot", () => {
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Recipient 1"), {
      target: { value: "0x0000000000000000000000000000000000000001" },
    });
    fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "0.000099" } });

    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeDisabled();
    expect(screen.getByText("Remaining: 0.000001")).toBeInTheDocument();
  });

  it("submits parsed payout rows when total equals pot", () => {
    const onFinalize = vi.fn();
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={onFinalize} />);

    fireEvent.change(screen.getByLabelText("Recipient 1"), {
      target: { value: "0x0000000000000000000000000000000000000001" },
    });
    fireEvent.change(screen.getByLabelText("Amount 1"), { target: { value: "0.0001" } });
    fireEvent.click(screen.getByRole("button", { name: "Finalize payouts" }));

    expect(onFinalize).toHaveBeenCalledWith([
      {
        recipient: "0x0000000000000000000000000000000000000001",
        amount: 100n,
      },
    ]);
  });
});
