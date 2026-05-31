import { formatUnits, parseUnits } from "viem";

const TOKEN_AMOUNT_PATTERN = /^\d+(?:\.\d+)?$/;

export type PayoutAmountRow = {
  amount: bigint;
};

export function parseTokenAmount(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a token amount.");
  if (trimmed.startsWith("-")) throw new Error("Amount must be greater than zero.");
  if (!TOKEN_AMOUNT_PATTERN.test(trimmed)) throw new Error("Enter a valid token amount.");

  const [, fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) {
    throw new Error("Token amount has too many decimal places.");
  }

  const parsed = parseUnits(trimmed, decimals);
  if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
  return parsed;
}

export function formatTokenAmount(value: bigint, decimals: number): string {
  const formatted = formatUnits(value, decimals);
  return formatted.replace(/\.0$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function sumPayoutRows(rows: PayoutAmountRow[]): bigint {
  return rows.reduce((total, row) => total + row.amount, 0n);
}
