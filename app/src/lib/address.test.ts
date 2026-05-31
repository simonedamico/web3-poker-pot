import { describe, expect, it } from "vitest";
import { normalizeAddressList, resolveAddressList } from "./address";

describe("normalizeAddressList", () => {
  it("keeps valid addresses, removes duplicates, and preserves first-seen order", () => {
    const result = normalizeAddressList(`
      0x0000000000000000000000000000000000000001
      0x0000000000000000000000000000000000000002
      0x0000000000000000000000000000000000000001
    `);

    expect(result).toEqual({
      addresses: [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002"
      ],
      errors: []
    });
  });

  it("reports invalid address rows", () => {
    const result = normalizeAddressList("not-an-address");

    expect(result.addresses).toEqual([]);
    expect(result.errors).toEqual(["Line 1 is not a valid EVM address."]);
  });

  it("rejects the zero address", () => {
    const result = normalizeAddressList("0x0000000000000000000000000000000000000000");

    expect(result.addresses).toEqual([]);
    expect(result.errors).toEqual(["Line 1 is the zero address."]);
  });

  it("resolves ENS names while normalizing address lists", async () => {
    const result = await resolveAddressList("alice.eth, 0x0000000000000000000000000000000000000002", async (name) =>
      name === "alice.eth" ? "0x0000000000000000000000000000000000000001" : null,
    );

    expect(result).toEqual({
      addresses: [
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002",
      ],
      errors: [],
    });
  });

  it("reports unresolved ENS names by line", async () => {
    const result = await resolveAddressList("missing.eth", async () => null);

    expect(result.addresses).toEqual([]);
    expect(result.errors).toEqual(["Line 1 ENS name could not be resolved."]);
  });
});
