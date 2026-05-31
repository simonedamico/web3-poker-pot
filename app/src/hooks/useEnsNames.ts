import { useCallback, useEffect, useState } from "react";
import { createPublicClient, getAddress, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { usePublicClient } from "wagmi";
import { type EnsNameResolver } from "../lib/address";

type EnsClient = {
  chain?: unknown;
  getEnsAddress: (parameters: { name: string }) => Promise<`0x${string}` | null>;
  getEnsName: (parameters: { address: `0x${string}` }) => Promise<string | null>;
};

const mainnetEnsClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export function ensAddressKey(address: `0x${string}`): string {
  return address.toLowerCase();
}

export function addressDisplayLabel(address: `0x${string}`, ensName?: string): string {
  return ensName ? `${address} (${ensName})` : address;
}

function chainSupportsEns(client: EnsClient | null | undefined): client is EnsClient {
  if (!client?.chain || typeof client.chain !== "object" || !("contracts" in client.chain)) {
    return false;
  }

  const contracts = (client.chain as { contracts?: unknown }).contracts;
  if (!contracts || typeof contracts !== "object") {
    return false;
  }

  return "ensRegistry" in contracts || "ensUniversalResolver" in contracts;
}

function ensClient(activeClient: EnsClient | null | undefined, fallbackClient: EnsClient = mainnetEnsClient): EnsClient {
  return chainSupportsEns(activeClient) ? activeClient : fallbackClient;
}

export function createEnsNameResolver(
  activeClient: EnsClient | null | undefined,
  fallbackClient: EnsClient = mainnetEnsClient,
): EnsNameResolver {
  return async (name: string) => {
    try {
      const resolved = await ensClient(activeClient, fallbackClient).getEnsAddress({ name });
      return resolved && isAddress(resolved) ? getAddress(resolved) : null;
    } catch {
      return null;
    }
  };
}

export async function loadEnsReverseNames(
  addresses: readonly `0x${string}`[],
  activeClient: EnsClient | null | undefined,
  fallbackClient: EnsClient = mainnetEnsClient,
) {
  const client = ensClient(activeClient, fallbackClient);
  const uniqueAddresses = Array.from(new Set(addresses.map((address) => getAddress(address))));
  const rows = await Promise.all(
    uniqueAddresses.map(async (address) => {
      try {
        const name = await client.getEnsName({ address });
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
  const publicClient = usePublicClient();
  return useCallback(createEnsNameResolver(publicClient), [publicClient]);
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
    const uniqueAddresses = addresses.filter((address): address is `0x${string}` => Boolean(address));

    if (uniqueAddresses.length === 0) {
      setNamesByAddress({});
      return;
    }

    let cancelled = false;
    void loadEnsReverseNames(uniqueAddresses, publicClient).then((names) => {
      if (cancelled) return;
      setNamesByAddress(names);
    });

    return () => {
      cancelled = true;
    };
  }, [addressKey, publicClient]);

  return namesByAddress;
}
