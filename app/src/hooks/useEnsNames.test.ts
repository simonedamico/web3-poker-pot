import { describe, expect, it, vi } from "vitest";
import { createEnsNameResolver, loadEnsReverseNames } from "./useEnsNames";

const RESOLVED_ADDRESS = "0x0000000000000000000000000000000000000001" as const;
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;

function ensClient(name?: string) {
  return {
    chain: {
      contracts: {
        ensRegistry: { address: ENS_REGISTRY },
      },
    },
    getEnsAddress: vi.fn().mockResolvedValue(RESOLVED_ADDRESS),
    getEnsName: vi.fn().mockResolvedValue(name),
  };
}

function localClient() {
  return {
    chain: { id: 31337 },
    getEnsAddress: vi.fn().mockResolvedValue(null),
    getEnsName: vi.fn().mockResolvedValue(null),
  };
}

describe("ENS helpers", () => {
  it("falls back to the mainnet ENS client when the active chain has no ENS registry", async () => {
    const activeClient = localClient();
    const fallbackClient = ensClient();
    const resolveEnsName = createEnsNameResolver(activeClient, fallbackClient);

    await expect(resolveEnsName("alice.eth")).resolves.toBe(RESOLVED_ADDRESS);
    expect(activeClient.getEnsAddress).not.toHaveBeenCalled();
    expect(fallbackClient.getEnsAddress).toHaveBeenCalledWith({ name: "alice.eth" });
  });

  it("uses the active client when the active chain supports ENS", async () => {
    const activeClient = ensClient();
    const fallbackClient = ensClient();
    const resolveEnsName = createEnsNameResolver(activeClient, fallbackClient);

    await expect(resolveEnsName("alice.eth")).resolves.toBe(RESOLVED_ADDRESS);
    expect(activeClient.getEnsAddress).toHaveBeenCalledWith({ name: "alice.eth" });
    expect(fallbackClient.getEnsAddress).not.toHaveBeenCalled();
  });

  it("loads reverse ENS names through the fallback client on local chains", async () => {
    const activeClient = localClient();
    const fallbackClient = ensClient("alice.eth");

    await expect(loadEnsReverseNames([RESOLVED_ADDRESS], activeClient, fallbackClient)).resolves.toEqual({
      [RESOLVED_ADDRESS.toLowerCase()]: "alice.eth",
    });
    expect(activeClient.getEnsName).not.toHaveBeenCalled();
    expect(fallbackClient.getEnsName).toHaveBeenCalledWith({ address: RESOLVED_ADDRESS });
  });
});
