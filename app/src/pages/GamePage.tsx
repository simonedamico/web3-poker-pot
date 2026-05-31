import { type FormEvent, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useAccount } from "wagmi";
import { FinalizeForm } from "../components/FinalizeForm";
import { type GameData, usePokerPotGame, usePokerPotWrites } from "../hooks/usePokerPot";
import { normalizeAddressList } from "../lib/address";
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
  const { address: connected } = useAccount();
  const { game, whitelist, participants, participantBuyIns, connectedBuyInCount, allowance, payouts } =
    usePokerPotGame(gameId);
  const writes = usePokerPotWrites();

  const gameData = game.data as GameData | undefined;
  const whitelistAddresses = (whitelist.data ?? []) as `0x${string}`[];
  const participantAddresses = (participants.data ?? []) as `0x${string}`[];
  const participantCounts = participantBuyIns.data ?? [];
  const isOpen = gameData ? gameData[3] === 0 : false;
  const isConnectedWhitelisted = whitelistAddresses.some((account) => sameAddress(account, connected));
  const permissions = gameData
    ? deriveGamePermissions({
        connected,
        organiser: gameData[0],
        isOpen,
        isWhitelisted: isConnectedWhitelisted,
        totalPot: gameData[4],
      })
    : { canBuyIn: false, canManageWhitelist: false, canFinalize: false };

  function handleWhitelistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWhitelistError(null);
    const result = normalizeAddressList(whitelistAccount);

    if (result.errors.length > 0) {
      setWhitelistError(result.errors[0]);
      return;
    }
    if (result.addresses.length === 0) {
      setWhitelistError("Enter a whitelist address.");
      return;
    }

    writes.setWhitelist(gameId, result.addresses[0], true);
    setWhitelistAccount("");
  }

  function handleBuyIn() {
    if (!gameData) return;
    if ((allowance.data ?? 0n) < gameData[2]) {
      writes.approve(gameData[1], gameData[2]);
      return;
    }
    writes.buyIn(gameId, 1n);
  }

  return (
    <section className="panel stack">
      <div>
        <h1>Game #{gameId.toString()}</h1>
        <p className="muted">{game.isLoading ? "Loading game..." : "Poker pot contract state"}</p>
      </div>

      {game.error ? <p className="error-text" role="alert">{game.error.message}</p> : null}

      {gameData ? (
        <section className="stack">
          <h2>Game details</h2>
          <p>Organiser: {gameData[0]}</p>
          <p>Token: {gameData[1]}</p>
          <p>Buy-in amount: {formatTokenAmount(gameData[2], TOKEN_DECIMALS)}</p>
          <p>Status: {statusLabel(gameData[3])}</p>
          <p>Total pot: {formatTokenAmount(gameData[4], TOKEN_DECIMALS)}</p>
        </section>
      ) : null}

      {permissions.canBuyIn ? (
        <section className="stack">
          <h2>Buy in</h2>
          <p>Your buy-ins: {((connectedBuyInCount.data as bigint | undefined) ?? 0n).toString()}</p>
          <button className="primary-button" type="button" disabled={writes.isPending} onClick={handleBuyIn}>
            {(allowance.data ?? 0n) < (gameData?.[2] ?? 0n) ? "Approve buy-in" : "Buy in"}
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
                {account}
                {permissions.canManageWhitelist ? (
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={writes.isPending}
                    onClick={() => writes.setWhitelist(gameId, account, false)}
                  >
                    Remove {account}
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
        {participantAddresses.length > 0 ? (
          <ul>
            {participantAddresses.map((participant) => (
              <li key={participant}>
                <span>{participant}</span>
                <span>Buy-ins: {participantCounts.find((row) => sameAddress(row.account, participant))?.count.toString() ?? "0"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No participants yet.</p>
        )}
      </section>

      {gameData?.[3] === 1 && payouts.data ? (
        <section className="stack">
          <h2>Final payouts</h2>
          <ul>
            {(payouts.data as readonly [`0x${string}`[], bigint[]])[0].map((recipient, index) => (
              <li key={`${recipient}-${index}`}>
                {recipient}:{" "}
                {formatTokenAmount((payouts.data as readonly [`0x${string}`[], bigint[]])[1][index] ?? 0n, TOKEN_DECIMALS)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {permissions.canFinalize && gameData ? (
        <FinalizeForm
          pot={gameData[4]}
          decimals={TOKEN_DECIMALS}
          disabled={writes.isPending}
          error={writes.error}
          isPending={writes.isPending}
          onFinalize={(rows) =>
            writes.finalize(
              gameId,
              rows.map((row) => row.recipient),
              rows.map((row) => row.amount),
            )
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
