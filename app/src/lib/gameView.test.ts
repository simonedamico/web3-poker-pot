import { describe, expect, it } from "vitest";
import { deriveGamePermissions } from "./gameView";

describe("deriveGamePermissions", () => {
  const organiser = "0x0000000000000000000000000000000000000001";
  const player = "0x0000000000000000000000000000000000000002";

  it("enables organiser controls for open games", () => {
    expect(deriveGamePermissions({ connected: organiser, organiser, isOpen: true, isWhitelisted: false, totalPot: 1n }))
      .toEqual({ canBuyIn: false, canManageWhitelist: true, canFinalize: true });
  });

  it("enables buy-in controls for whitelisted non-organisers", () => {
    expect(deriveGamePermissions({ connected: player, organiser, isOpen: true, isWhitelisted: true, totalPot: 0n }))
      .toEqual({ canBuyIn: true, canManageWhitelist: false, canFinalize: false });
  });

  it("disables all actions for closed games and disconnected users", () => {
    expect(deriveGamePermissions({ connected: undefined, organiser, isOpen: true, isWhitelisted: true, totalPot: 1n }))
      .toEqual({ canBuyIn: false, canManageWhitelist: false, canFinalize: false });
    expect(deriveGamePermissions({ connected: organiser, organiser, isOpen: false, isWhitelisted: true, totalPot: 1n }))
      .toEqual({ canBuyIn: false, canManageWhitelist: false, canFinalize: false });
  });

  it("fails closed for malformed addresses", () => {
    expect(deriveGamePermissions({ connected: "not-an-address", organiser, isOpen: true, isWhitelisted: true, totalPot: 1n }))
      .toEqual({ canBuyIn: false, canManageWhitelist: false, canFinalize: false });
    expect(deriveGamePermissions({ connected: organiser, organiser: "not-an-address", isOpen: true, isWhitelisted: true, totalPot: 1n }))
      .toEqual({ canBuyIn: false, canManageWhitelist: false, canFinalize: false });
  });
});
