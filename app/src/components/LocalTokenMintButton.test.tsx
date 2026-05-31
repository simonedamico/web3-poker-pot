import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { localMockToken } from "../contracts/pokerPot";
import { LocalTokenMintButton } from "./LocalTokenMintButton";

const walletState = vi.hoisted(() => ({
  address: undefined as `0x${string}` | undefined,
  chainId: 31337,
}));

const mocks = vi.hoisted(() => ({
  waitForTransactionReceipt: vi.fn(),
  writeContractAsync: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: walletState.address }),
  useChainId: () => walletState.chainId,
  usePublicClient: () => ({
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
  }),
  useWriteContract: () => ({
    isPending: false,
    writeContractAsync: mocks.writeContractAsync,
  }),
}));

describe("LocalTokenMintButton", () => {
  beforeEach(() => {
    walletState.address = "0x0000000000000000000000000000000000000001";
    walletState.chainId = 31337;
    mocks.writeContractAsync.mockReset();
    mocks.writeContractAsync.mockResolvedValue("0xabc");
    mocks.waitForTransactionReceipt.mockReset();
    mocks.waitForTransactionReceipt.mockResolvedValue({ status: "success" });
  });

  it("mints local buy-in tokens for the connected wallet", async () => {
    render(<LocalTokenMintButton />);

    fireEvent.click(screen.getByRole("button", { name: "Get buy-in tokens" }));

    await waitFor(() => expect(screen.getByText("Tokens loaded")).toBeInTheDocument());
    expect(mocks.writeContractAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        address: localMockToken,
        functionName: "mint",
        args: [walletState.address, 1_000_000_000n],
      }),
    );
    expect(mocks.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: "0xabc" });
  });

  it("disables the faucet when no wallet is connected", () => {
    walletState.address = undefined;

    render(<LocalTokenMintButton />);

    expect(screen.getByRole("button", { name: "Connect wallet for tokens" })).toBeDisabled();
  });

  it("disables the faucet away from the hardhat chain", () => {
    walletState.chainId = 1;

    render(<LocalTokenMintButton />);

    expect(screen.getByRole("button", { name: "Switch to Hardhat for tokens" })).toBeDisabled();
  });
});
