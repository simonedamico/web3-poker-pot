import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HardhatGasButton } from "./HardhatGasButton";

const walletState = vi.hoisted(() => ({
  address: undefined as `0x${string}` | undefined,
  chainId: 31337,
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: walletState.address }),
  useChainId: () => walletState.chainId,
}));

describe("HardhatGasButton", () => {
  beforeEach(() => {
    walletState.address = "0x0000000000000000000000000000000000000001";
    walletState.chainId = 31337;
    vi.restoreAllMocks();
  });

  it("requests local hardhat gas for the connected wallet", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ result: true }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HardhatGasButton />);

    fireEvent.click(screen.getByRole("button", { name: "Get hardhat gas" }));

    await waitFor(() => expect(screen.getByText("Gas loaded")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8545",
      expect.objectContaining({
        body: expect.stringContaining("hardhat_setBalance"),
        method: "POST",
      }),
    );
    expect(fetchMock.mock.calls[0][1].body).toContain(walletState.address);
  });

  it("disables the faucet when no wallet is connected", () => {
    walletState.address = undefined;

    render(<HardhatGasButton />);

    expect(screen.getByRole("button", { name: "Connect wallet for gas" })).toBeDisabled();
  });

  it("disables the faucet away from the hardhat chain", () => {
    walletState.chainId = 1;

    render(<HardhatGasButton />);

    expect(screen.getByRole("button", { name: "Switch to Hardhat for gas" })).toBeDisabled();
  });
});
