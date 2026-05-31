import { getAddress, isAddress } from "viem";

export type AddressListResult = {
  addresses: `0x${string}`[];
  errors: string[];
};

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
      const key = checksum.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        addresses.push(checksum);
      }
    });

  return { addresses, errors };
}
