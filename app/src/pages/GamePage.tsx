import { type FormEvent, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";
import { FinalizeForm } from "../components/FinalizeForm";
import { addressDisplayLabel, ensAddressKey, useEnsNameResolver, useEnsReverseNames } from "../hooks/useEnsNames";
import { type GameData, usePokerPotGame, usePokerPotWrites } from "../hooks/usePokerPot";
import { tokenMetadataKey, tokenSummaryLabel, useTokenMetadata } from "../hooks/useTokenMetadata";
import { resolveAddressInput } from "../lib/address";
import { deriveGamePermissions } from "../lib/gameView";
import { formatTokenAmount } from "../lib/tokenAmount";

type GamePageProps = {
  gameId: bigint;
};

const TOKEN_DECIMALS = 6;

function sameAddress(left?: string, right?: string): boolean {
  if (!left || !right || !isAddress(left) || !isAddress(right)) return false;
  return getAddress(left) === getAddress(right);
}

function statusLabel(status?: number): string {
  return status === 1 ? "Finalized" : "Open";
}

export function GamePage({ gameId }: GamePageProps) {
  const [whitelistAccount, setWhitelistAccount] = useState("");
  const [whitelistError, setWhitelistError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const { address: connected } = useAccount();
  const { game, whitelist, participants, participantBuyIns, connectedBuyInCount, allowance, payouts } =
    usePokerPotGame(gameId);
  const writes = usePokerPotWrites();

  const gameData = game.data as GameData | undefined;
  const activeToken = gameData?.[1];
  const tokenMetadata = useTokenMetadata(activeToken ? [activeToken] : []);
  const activeTokenMetadata = activeToken ? tokenMetadata.metadataByAddress[tokenMetadataKey(activeToken)] : undefined;
  const whitelistAddresses = (whitelist.data ?? []) as `0x${string}`[];
  const participantAddresses = (participants.data ?? []) as `0x${string}`[];
  const payoutData = payouts.data as readonly [`0x${string}`[], bigint[]] | undefined;
  const payoutRecipients = payoutData?.[0] ?? [];
  const ensNames = useEnsReverseNames([gameData?.[0], ...whitelistAddresses, ...participantAddresses, ...payoutRecipients]);
  const resolveEnsName = useEnsNameResolver();
  const participantCounts = participantBuyIns.data;
  const connectedBuyInCountData = connectedBuyInCount.data as bigint | undefined;
  const isOpen = gameData ? gameData[3] === 0 : false;
  const isConnectedWhitelisted = whitelistAddresses.some((account) => sameAddress(account, connected));
  const allowanceAmount = allowance.data as bigint | undefined;
  const allowanceReady = allowanceAmount !== undefined;
  const buyInAmount = gameData?.[2] ?? 0n;
  const buyInButtonLabel = !allowanceReady
    ? "Checking allowance"
    : allowanceAmount < buyInAmount
      ? "Approve buy-in"
      : "Buy in";
  const permissions = gameData
    ? deriveGamePermissions({
        connected,
        organiser: gameData[0],
        isOpen,
        isWhitelisted: isConnectedWhitelisted,
        totalPot: gameData[4],
      })
    : { canBuyIn: false, canManageWhitelist: false, canFinalize: false };
  const gameLink = `${window.location.origin}/game/${gameId.toString()}`;

  function labelAddress(address: `0x${string}`): string {
    return addressDisplayLabel(address, ensNames[ensAddressKey(address)]);
  }

  async function handleWhitelistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWhitelistError(null);
    if (!whitelistAccount.trim()) {
      setWhitelistError("Enter a whitelist address.");
      return;
    }

    const result = await resolveAddressInput(whitelistAccount, resolveEnsName);

    if (result.error || !result.address) {
      const message =
        result.error === "zero"
          ? "Whitelist account cannot be the zero address."
          : result.error === "ens-unresolved"
            ? "ENS name could not be resolved."
            : "Enter a valid whitelist address or ENS name.";
      setWhitelistError(message);
      return;
    }

    void Promise.resolve(writes.setWhitelist(gameId, result.address, true)).catch(() => undefined);
    setWhitelistAccount("");
  }

  async function copyGameLink() {
    try {
      await navigator.clipboard.writeText(gameLink);
      setCopyMessage("Game link copied");
    } catch {
      setCopyMessage("Could not copy game link.");
    }
  }

  function handleBuyIn() {
    if (!gameData || allowanceAmount === undefined) return;
    if (allowanceAmount < gameData[2]) {
      void Promise.resolve(writes.approve(gameData[1], gameData[2])).catch(() => undefined);
      return;
    }
    void Promise.resolve(writes.buyIn(gameId, 1n)).catch(() => undefined);
  }

  return (
    <section className="panel stack">
      <div>
        <h1>Game #{gameId.toString()}</h1>
        <p className="muted">{game.isLoading ? "Loading game..." : "Poker pot contract state"}</p>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={copyGameLink}>
            Copy game link
          </button>
          <span className="muted">{gameLink}</span>
        </div>
        {copyMessage ? <p className="muted">{copyMessage}</p> : null}
      </div>

      {game.error ? <p className="error-text" role="alert">{game.error.message}</p> : null}

      {gameData ? (
        <section className="stack">
          <h2>Game details</h2>
          <p>Organiser: {labelAddress(gameData[0])}</p>
          <p>Token: {tokenSummaryLabel(gameData[1], activeTokenMetadata)}</p>
          {activeTokenMetadata ? <p className="muted">Token address: {gameData[1]}</p> : null}
          <p>Buy-in amount: {formatTokenAmount(gameData[2], TOKEN_DECIMALS)}</p>
          <p>Status: {statusLabel(gameData[3])}</p>
          <p>Total pot: {formatTokenAmount(gameData[4], TOKEN_DECIMALS)}</p>
        </section>
      ) : null}

      {permissions.canBuyIn ? (
        <section className="stack">
          <h2>Buy in</h2>
          {connectedBuyInCount.error ? (
            <p className="error-text" role="alert">
              {connectedBuyInCount.error.message}
            </p>
          ) : connectedBuyInCount.isLoading ? (
            <p className="muted">Loading your buy-ins...</p>
          ) : connectedBuyInCountData !== undefined ? (
            <p>Your buy-ins: {connectedBuyInCountData.toString()}</p>
          ) : (
            <p className="muted">Your buy-ins unavailable.</p>
          )}
          <button className="primary-button" type="button" disabled={writes.isPending || !allowanceReady} onClick={handleBuyIn}>
            {buyInButtonLabel}
          </button>
        </section>
      ) : null}

      <section className="stack">
        <h2>Whitelist</h2>
        <p>Whitelisted addresses: {whitelistAddresses.length}</p>
        {whitelist.error ? <p className="error-text" role="alert">{whitelist.error.message}</p> : null}
        {whitelistAddresses.length > 0 ? (
          <ul>
            {whitelistAddresses.map((account) => (
              <li key={account}>
                {labelAddress(account)}
                {permissions.canManageWhitelist ? (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={writes.isPending}
                    onClick={() =>
                      void Promise.resolve(writes.setWhitelist(gameId, account, false)).catch(() => undefined)
                    }
                  >
                    Remove {labelAddress(account)}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No whitelisted addresses loaded.</p>
        )}
        {permissions.canManageWhitelist ? (
          <form className="button-row" onSubmit={handleWhitelistSubmit}>
            <label className="field">
              <span>Whitelist account</span>
              <input
                aria-label="Whitelist account"
                value={whitelistAccount}
                onChange={(event) => setWhitelistAccount(event.target.value)}
              />
            </label>
            <button className="secondary-button" type="submit" disabled={writes.isPending}>
              Add to whitelist
            </button>
            {whitelistError ? <p className="error-text" role="alert">{whitelistError}</p> : null}
          </form>
        ) : null}
      </section>

      <section className="stack">
        <h2>Participants</h2>
        {participants.error ? <p className="error-text" role="alert">{participants.error.message}</p> : null}
        {participantBuyIns.error ? <p className="error-text" role="alert">{participantBuyIns.error.message}</p> : null}
        {participantAddresses.length > 0 && participantBuyIns.isLoading ? (
          <p className="muted">Loading participant buy-ins...</p>
        ) : participantAddresses.length > 0 && participantBuyIns.error ? null : participantAddresses.length > 0 ? (
          <ul>
            {participantAddresses.map((participant) => (
              <li key={participant}>
                <span>{labelAddress(participant)}</span>
                {participantCounts?.find((row) => row && sameAddress(row.account, participant)) ? (
                  <span>
                    Buy-ins:{" "}
                    {participantCounts.find((row) => row && sameAddress(row.account, participant))?.count.toString()}
                  </span>
                ) : (
                  <span className="muted">Buy-ins unavailable</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No participants yet.</p>
        )}
      </section>

      {gameData?.[3] === 1 ? (
        payouts.isLoading ? (
          <p className="muted">Loading final payouts...</p>
        ) : payouts.error ? (
          <p className="error-text" role="alert">
            {payouts.error.message}
          </p>
        ) : payouts.data ? (
          <section className="stack">
            <h2>Final payouts</h2>
            <ul>
              {(payouts.data as readonly [`0x${string}`[], bigint[]])[0].map((recipient, index) => (
                <li key={`${recipient}-${index}`}>
                  {labelAddress(recipient)}:{" "}
                  {formatTokenAmount(
                    (payouts.data as readonly [`0x${string}`[], bigint[]])[1][index] ?? 0n,
                    TOKEN_DECIMALS,
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null
      ) : null}

      {permissions.canFinalize && gameData ? (
        <FinalizeForm
          pot={gameData[4]}
          decimals={TOKEN_DECIMALS}
          disabled={writes.isPending}
          error={writes.error}
          isPending={writes.isPending}
          resolveEnsName={resolveEnsName}
          onFinalize={(rows) =>
            void Promise.resolve(
              writes.finalize(
                gameId,
                rows.map((row) => row.recipient),
                rows.map((row) => row.amount),
              ),
            ).catch(() => undefined)
          }
        />
      ) : null}

      {writes.error && !permissions.canFinalize ? (
        <p className="error-text" role="alert">
          {writes.error}
        </p>
      ) : null}
    </section>
  );
}
