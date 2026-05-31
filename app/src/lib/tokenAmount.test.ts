import { describe, expect, it } from "vitest";
import { formatTokenAmount, parseTokenAmount, sumPayoutRows } from "./tokenAmount";

describe("token amount helpers", () => {
  it("parses and formats decimal token values", () => {
    expect(parseTokenAmount("25.5", 6)).toEqual(25_500_000n);
    expect(formatTokenAmount(25_500_000n, 6)).toEqual("25.5");
  });

  it("rejects empty, zero, negative, and over-precision values", () => {
    expect(() => parseTokenAmount("", 6)).toThrow("Enter a token amount.");
    expect(() => parseTokenAmount("0", 6)).toThrow("Amount must be greater than zero.");
    expect(() => parseTokenAmount("-1", 6)).toThrow("Amount must be greater than zero.");
    expect(() => parseTokenAmount("1.0000001", 6)).toThrow("Token amount has too many decimal places.");
  });

  it.each(["abc", "1.2.3", "1e3", "1,2"])(
    "rejects malformed token amount input %s",
    (value) => {
      expect(() => parseTokenAmount(value, 6)).toThrow("Enter a valid token amount.");
    }
  );

  it("parses and formats whole token values with zero decimals", () => {
    expect(parseTokenAmount("25", 0)).toEqual(25n);
    expect(formatTokenAmount(25n, 0)).toEqual("25");
  });

  it("sums payout row amounts", () => {
    expect(sumPayoutRows([{ amount: 1n }, { amount: 2n }, { amount: 3n }])).toEqual(6n);
  });

  it("returns zero for empty payout rows", () => {
    expect(sumPayoutRows([])).toEqual(0n);
  });
});
