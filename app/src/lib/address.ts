import { getAddress, isAddress } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type EnsNameResolver = (name: string) => Promise<`0x${string}` | null | undefined>;

export type AddressListResult = {
  addresses: `0x${string}`[];
  errors: string[];
};

export type AddressInputError = "invalid" | "zero" | "ens-unresolved";

export type ParsedAddressInput =
  | { kind: "address"; address: `0x${string}` }
  | { kind: "ens"; name: string }
  | { kind: "error"; error: AddressInputError };

function isZeroAddress(address: `0x${string}`): boolean {
  return address.toLowerCase() === ZERO_ADDRESS;
}

export function isPotentialEnsName(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.includes(".") && !/\s|,/.test(trimmed);
}

export function parseAddressInput(input: string): ParsedAddressInput {
  const trimmed = input.trim();

  if (isAddress(trimmed)) {
    const checksum = getAddress(trimmed);
    return isZeroAddress(checksum) ? { kind: "error", error: "zero" } : { kind: "address", address: checksum };
  }

  if (isPotentialEnsName(trimmed)) {
    return { kind: "ens", name: trimmed };
  }

  return { kind: "error", error: "invalid" };
}

export async function resolveAddressInput(
  input: string,
  resolveEnsName: EnsNameResolver,
): Promise<{ address?: `0x${string}`; error?: AddressInputError }> {
  const parsed = parseAddressInput(input);

  if (parsed.kind === "address") {
    return { address: parsed.address };
  }
  if (parsed.kind === "error") {
    return { error: parsed.error };
  }

  let resolved: `0x${string}` | null | undefined;
  try {
    resolved = await resolveEnsName(parsed.name);
  } catch {
    return { error: "ens-unresolved" };
  }

  if (!resolved || !isAddress(resolved)) {
    return { error: "ens-unresolved" };
  }

  const checksum = getAddress(resolved);
  return isZeroAddress(checksum) ? { error: "zero" } : { address: checksum };
}

function lineError(lineNumber: number, error: AddressInputError): string {
  if (error === "zero") {
    return `Line ${lineNumber} is the zero address.`;
  }
  if (error === "ens-unresolved") {
    return `Line ${lineNumber} ENS name could not be resolved.`;
  }
  return `Line ${lineNumber} is not a valid EVM address or ENS name.`;
}

export function normalizeAddressList(input: string): AddressListResult {
  const seen = new Set<string>();
  const addresses: `0x${string}`[] = [];
  const errors: string[] = [];

  input
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line) return;
      if (!isAddress(line)) {
        errors.push(`Line ${index + 1} is not a valid EVM address.`);
        return;
      }
      const checksum = getAddress(line);
      if (isZeroAddress(checksum)) {
        errors.push(`Line ${index + 1} is the zero address.`);
        return;
      }
      const key = checksum.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        addresses.push(checksum);
      }
    });

  return { addresses, errors };
}

export async function resolveAddressList(input: string, resolveEnsName: EnsNameResolver): Promise<AddressListResult> {
  const seen = new Set<string>();
  const addresses: `0x${string}`[] = [];
  const errors: string[] = [];
  const lines = input.split(/\r?\n|,/).map((line) => line.trim());

  for (const [index, line] of lines.entries()) {
    if (!line) continue;

    const result = await resolveAddressInput(line, resolveEnsName);
    if (result.error || !result.address) {
      errors.push(lineError(index + 1, result.error ?? "invalid"));
      continue;
    }

    const key = result.address.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      addresses.push(result.address);
    }
  }

  return { addresses, errors };
}
