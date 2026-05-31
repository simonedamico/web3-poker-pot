import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokenDisplayLabel, tokenSummaryLabel, useTokenMetadata } from "./useTokenMetadata";

const TOKEN = "0x0000000000000000000000000000000000000002" as const;
const OTHER_TOKEN = "0x0000000000000000000000000000000000000003" as const;

const mocks = vi.hoisted(() => ({
  useReadContracts: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useReadContracts: mocks.useReadContracts,
}));

describe("useTokenMetadata", () => {
  beforeEach(() => {
    mocks.useReadContracts.mockReset();
    mocks.useReadContracts.mockReturnValue({ data: [] });
  });

  it("maps ERC20 name and symbol reads by token address", () => {
    mocks.useReadContracts.mockReturnValue({
      data: [
        { status: "success", result: "Poker USD" },
        { status: "success", result: "PUSD" },
        { status: "success", result: "Night Chips" },
        { status: "failure", error: new Error("symbol reverted") },
      ],
    });

    const { result } = renderHook(() => useTokenMetadata([TOKEN, OTHER_TOKEN]));

    expect(result.current.metadataByAddress[TOKEN.toLowerCase()]).toEqual({
      address: TOKEN,
      name: "Poker USD",
      symbol: "PUSD",
    });
    expect(result.current.metadataByAddress[OTHER_TOKEN.toLowerCase()]).toEqual({
      address: OTHER_TOKEN,
      name: "Night Chips",
      symbol: undefined,
    });
  });

  it("formats token labels with metadata and address fallbacks", () => {
    expect(tokenDisplayLabel(TOKEN, { address: TOKEN, name: "Poker USD", symbol: "PUSD" })).toBe(
      `Poker USD (PUSD) - ${TOKEN}`,
    );
    expect(tokenSummaryLabel(TOKEN, { address: TOKEN, name: "Poker USD", symbol: "PUSD" })).toBe("Poker USD (PUSD)");
    expect(tokenDisplayLabel(TOKEN)).toBe(TOKEN);
    expect(tokenSummaryLabel(TOKEN)).toBe(TOKEN);
  });
});
