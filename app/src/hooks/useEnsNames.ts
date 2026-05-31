import { useCallback, useEffect, useState } from "react";
import { getAddress, isAddress } from "viem";
import { usePublicClient } from "wagmi";
import { type EnsNameResolver } from "../lib/address";

export function ensAddressKey(address: `0x${string}`): string {
  return address.toLowerCase();
}

export function addressDisplayLabel(address: `0x${string}`, ensName?: string): string {
  return ensName ? `${address} (${ensName})` : address;
}

export function useEnsNameResolver(): EnsNameResolver {
  const publicClient = usePublicClient();

  return useCallback(
    async (name: string) => {
      if (!publicClient) return null;

      try {
        const resolved = await publicClient.getEnsAddress({ name });
        return resolved && isAddress(resolved) ? getAddress(resolved) : null;
      } catch {
        return null;
      }
    },
    [publicClient],
  );
}

export function useEnsReverseNames(addresses: readonly (`0x${string}` | undefined)[]) {
  const publicClient = usePublicClient();
  const [namesByAddress, setNamesByAddress] = useState<Record<string, string>>({});
  const addressKey = addresses
    .filter((address): address is `0x${string}` => Boolean(address))
    .map((address) => address.toLowerCase())
    .sort()
    .join("|");

  useEffect(() => {
    const uniqueAddresses = Array.from(
      new Set(
        addresses
          .filter((address): address is `0x${string}` => Boolean(address))
          .map((address) => getAddress(address)),
      ),
    );

    if (!publicClient || uniqueAddresses.length === 0) {
      setNamesByAddress({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      uniqueAddresses.map(async (address) => {
        try {
          const name = await publicClient.getEnsName({ address });
          return name ? ([ensAddressKey(address), name] as const) : undefined;
        } catch {
          return undefined;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;

      setNamesByAddress(
        rows.reduce<Record<string, string>>((names, row) => {
          if (row) {
            names[row[0]] = row[1];
          }
          return names;
        }, {}),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [addressKey, publicClient]);

  return namesByAddress;
}
