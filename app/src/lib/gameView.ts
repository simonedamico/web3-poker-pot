import { getAddress } from "viem";

type PermissionInput = {
  connected?: string;
  organiser: string;
  isOpen: boolean;
  isWhitelisted: boolean;
  totalPot: bigint;
};

export type GamePermissions = {
  canBuyIn: boolean;
  canManageWhitelist: boolean;
  canFinalize: boolean;
};

function sameAddress(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  return getAddress(left) === getAddress(right);
}

export function deriveGamePermissions(input: PermissionInput): GamePermissions {
  if (!input.connected || !input.isOpen) {
    return { canBuyIn: false, canManageWhitelist: false, canFinalize: false };
  }

  const isOrganiser = sameAddress(input.connected, input.organiser);

  return {
    canBuyIn: input.isWhitelisted,
    canManageWhitelist: isOrganiser,
    canFinalize: isOrganiser && input.totalPot > 0n
  };
}
