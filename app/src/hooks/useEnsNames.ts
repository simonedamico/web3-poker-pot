import { useCallback, useEffect, useState } from "react";
import { createPublicClient, fallback, getAddress, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { type EnsNameResolver } from "../lib/address";

type EnsClient = {
  chain?: unknown;
  getEnsAddress: (parameters: { name: string }) => Promise<`0x${string}` | null>;
  getEnsName: (parameters: { address: `0x${string}` }) => Promise<string | null>;
};

const MAINNET_ENS_RPC_URLS = ["https://ethereum.publicnode.com", "https://1rpc.io/eth"] as const;

const mainnetEnsClient = createPublicClient({
  chain: mainnet,
  transport: fallback(MAINNET_ENS_RPC_URLS.map((url) => http(url, { timeout: 8_000 }))),
});

export function ensAddressKey(address: `0x${string}`): string {
  return address.toLowerCase();
}

export function addressDisplayLabel(address: `0x${string}`, ensName?: string): string {
  return ensName ? `${address} (${ensName})` : address;
}

export function createEnsNameResolver(
  _activeClient: EnsClient | null | undefined,
  mainnetClient: EnsClient = mainnetEnsClient,
): EnsNameResolver {
  return async (name: string) => {
    try {
      const resolved = await mainnetClient.getEnsAddress({ name });
      return resolved && isAddress(resolved) ? getAddress(resolved) : null;
    } catch {
      return null;
    }
  };
}

export async function loadEnsReverseNames(
  addresses: readonly `0x${string}`[],
  _activeClient: EnsClient | null | undefined,
  mainnetClient: EnsClient = mainnetEnsClient,
) {
  const uniqueAddresses = Array.from(new Set(addresses.map((address) => getAddress(address))));
  const rows = await Promise.all(
    uniqueAddresses.map(async (address) => {
      try {
        const name = await mainnetClient.getEnsName({ address });
        return name ? ([ensAddressKey(address), name] as const) : undefined;
      } catch {
        return undefined;
      }
    }),
  );

  return rows.reduce<Record<string, string>>((names, row) => {
    if (row) {
      names[row[0]] = row[1];
    }
    return names;
  }, {});
}

export function useEnsNameResolver(): EnsNameResolver {
  return useCallback(createEnsNameResolver(undefined), []);
}

export function useEnsReverseNames(addresses: readonly (`0x${string}` | undefined)[]) {
  const [namesByAddress, setNamesByAddress] = useState<Record<string, string>>({});
  const addressKey = addresses
    .filter((address): address is `0x${string}` => Boolean(address))
    .map((address) => address.toLowerCase())
    .sort()
    .join("|");

  useEffect(() => {
    const uniqueAddresses = addresses.filter((address): address is `0x${string}` => Boolean(address));

    if (uniqueAddresses.length === 0) {
      setNamesByAddress({});
      return;
    }

    let cancelled = false;
    void loadEnsReverseNames(uniqueAddresses, undefined).then((names) => {
      if (cancelled) return;
      setNamesByAddress(names);
    });

    return () => {
      cancelled = true;
    };
  }, [addressKey]);

  return namesByAddress;
}
