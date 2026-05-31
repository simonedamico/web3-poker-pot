import { useReadContracts } from "wagmi";

export type TokenMetadata = {
  address: `0x${string}`;
  name?: string;
  symbol?: string;
};

const tokenMetadataAbi = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function tokenMetadataKey(address: `0x${string}`): string {
  return address.toLowerCase();
}

export function tokenSummaryLabel(address: `0x${string}`, metadata?: TokenMetadata): string {
  if (metadata?.name && metadata.symbol) {
    return `${metadata.name} (${metadata.symbol})`;
  }
  if (metadata?.name) {
    return metadata.name;
  }
  if (metadata?.symbol) {
    return metadata.symbol;
  }
  return address;
}

export function tokenDisplayLabel(address: `0x${string}`, metadata?: TokenMetadata): string {
  const summary = tokenSummaryLabel(address, metadata);
  return summary === address ? address : `${summary} - ${address}`;
}

export function useTokenMetadata(tokens: readonly `0x${string}`[]) {
  const metadataReads = useReadContracts({
    contracts: tokens.flatMap((address) => [
      {
        address,
        abi: tokenMetadataAbi,
        functionName: "name",
      },
      {
        address,
        abi: tokenMetadataAbi,
        functionName: "symbol",
      },
    ]),
    query: {
      enabled: tokens.length > 0,
    },
  });

  const metadataByAddress = tokens.reduce<Record<string, TokenMetadata>>((metadata, address, index) => {
    const nameResult = metadataReads.data?.[index * 2];
    const symbolResult = metadataReads.data?.[index * 2 + 1];
    const name = nameResult?.status === "success" && typeof nameResult.result === "string" ? nameResult.result : undefined;
    const symbol =
      symbolResult?.status === "success" && typeof symbolResult.result === "string" ? symbolResult.result : undefined;

    if (name || symbol) {
      metadata[tokenMetadataKey(address)] = { address, name, symbol };
    }

    return metadata;
  }, {});

  return {
    ...metadataReads,
    metadataByAddress,
  };
}
