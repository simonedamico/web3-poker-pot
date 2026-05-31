import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FinalizeForm } from "./FinalizeForm";

const RECIPIENT_1 = "0x0000000000000000000000000000000000000001";
const RECIPIENT_2 = "0x0000000000000000000000000000000000000002";
const CHECKSUM_INPUT = "0x52908400098527886e0f7030069857d2e4169ee7";
const CHECKSUM_ADDRESS = "0x52908400098527886E0F7030069857D2E4169EE7";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function fillPayout(rowNumber: number, recipient: string, amount: string) {
  fireEvent.change(screen.getByLabelText(`Recipient ${rowNumber}`), {
    target: { value: recipient },
  });
  fireEvent.change(screen.getByLabelText(`Amount ${rowNumber}`), { target: { value: amount } });
}

describe("FinalizeForm", () => {
  it("disables finalization when payout total does not equal pot", () => {
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={vi.fn()} />);

    fillPayout(1, RECIPIENT_1, "0.000099");

    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeDisabled();
    expect(screen.getByText("Remaining: 0.000001")).toBeInTheDocument();
  });

  it("submits parsed payout rows when total equals pot", () => {
    const onFinalize = vi.fn();
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={onFinalize} />);

    fillPayout(1, RECIPIENT_1, "0.0001");
    fireEvent.click(screen.getByRole("button", { name: "Finalize payouts" }));

    expect(onFinalize).toHaveBeenCalledWith([
      {
        recipient: RECIPIENT_1,
        amount: 100n,
      },
    ]);
  });

  it("rejects the zero recipient address", () => {
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={vi.fn()} />);

    fillPayout(1, ZERO_ADDRESS, "0.0001");

    expect(screen.getByRole("alert")).toHaveTextContent("Recipient cannot be the zero address.");
    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeDisabled();
  });

  it("rejects zero payout amounts", () => {
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={vi.fn()} />);

    fillPayout(1, RECIPIENT_1, "0");

    expect(screen.getByRole("alert")).toHaveTextContent("Amount must be greater than zero.");
    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeDisabled();
  });

  it("announces over-allocation clearly", () => {
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={vi.fn()} />);

    fillPayout(1, RECIPIENT_1, "0.000101");

    expect(screen.getByRole("alert")).toHaveTextContent("Over by: 0.000001");
    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeDisabled();
  });

  it("submits multiple rows when their total exactly matches the pot", () => {
    const onFinalize = vi.fn();
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={onFinalize} />);

    fillPayout(1, RECIPIENT_1, "0.00004");
    fireEvent.click(screen.getByRole("button", { name: "Add payout" }));
    fillPayout(2, RECIPIENT_2, "0.00006");
    fireEvent.click(screen.getByRole("button", { name: "Finalize payouts" }));

    expect(onFinalize).toHaveBeenCalledWith([
      { recipient: RECIPIENT_1, amount: 40n },
      { recipient: RECIPIENT_2, amount: 60n },
    ]);
  });

  it("adds and removes payout rows", () => {
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add payout" }));
    expect(screen.getByLabelText("Recipient 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove payout 2" }));
    expect(screen.queryByLabelText("Recipient 2")).not.toBeInTheDocument();
  });

  it("submits checksum-normalized recipients", () => {
    const onFinalize = vi.fn();
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={onFinalize} />);

    fillPayout(1, CHECKSUM_INPUT, "0.0001");
    fireEvent.click(screen.getByRole("button", { name: "Finalize payouts" }));

    expect(onFinalize).toHaveBeenCalledWith([{ recipient: CHECKSUM_ADDRESS, amount: 100n }]);
  });

  it("ignores completely blank added payout rows", () => {
    const onFinalize = vi.fn();
    render(<FinalizeForm pot={100n} decimals={6} onFinalize={onFinalize} />);

    fillPayout(1, RECIPIENT_1, "0.0001");
    fireEvent.click(screen.getByRole("button", { name: "Add payout" }));

    expect(screen.getByText("Remaining: 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Finalize payouts" }));
    expect(onFinalize).toHaveBeenCalledWith([{ recipient: RECIPIENT_1, amount: 100n }]);
  });

  it("respects external disabled state", () => {
    const onFinalize = vi.fn();
    const { rerender } = render(<FinalizeForm pot={100n} decimals={6} onFinalize={onFinalize} />);

    fillPayout(1, RECIPIENT_1, "0.0001");
    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeEnabled();

    rerender(<FinalizeForm pot={100n} decimals={6} disabled onFinalize={onFinalize} />);
    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Finalize payouts" }));
    expect(onFinalize).not.toHaveBeenCalled();
  });

  it("shows pending state while a finalization is in flight", () => {
    const { rerender } = render(<FinalizeForm pot={100n} decimals={6} onFinalize={vi.fn()} />);

    fillPayout(1, RECIPIENT_1, "0.0001");
    expect(screen.getByRole("button", { name: "Finalize payouts" })).toBeEnabled();

    rerender(<FinalizeForm pot={100n} decimals={6} isPending onFinalize={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Finalizing payouts" })).toBeDisabled();
  });

  it("surfaces finalization write errors", () => {
    render(<FinalizeForm pot={100n} decimals={6} error="User rejected the transaction." onFinalize={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("User rejected the transaction.");
  });
});
