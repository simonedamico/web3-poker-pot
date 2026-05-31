import { type FormEvent, useState } from "react";
import { AddressListInput } from "../components/AddressListInput";
import { TokenAmountInput } from "../components/TokenAmountInput";
import { allowlistedTokens } from "../contracts/pokerPot";
import { normalizeAddressList } from "../lib/address";
import { parseTokenAmount } from "../lib/tokenAmount";

const ERROR_ID = "create-game-error";
const NO_TOKENS_MESSAGE = "No allowlisted tokens are configured. Run deployment setup before creating a game.";

type ErrorField = "token" | "buyInAmount" | "whitelist";

type SubmitError = {
  field: ErrorField;
  message: string;
};

type CreateGamePageProps = {
  onCreated: (gameId: bigint) => void;
  availableTokens?: `0x${string}`[];
};

export function CreateGamePage({ onCreated, availableTokens = allowlistedTokens }: CreateGamePageProps) {
  const [token, setToken] = useState("");
  const [buyInAmount, setBuyInAmount] = useState("");
  const [whitelist, setWhitelist] = useState("");
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  const hasTokenOptions = availableTokens.length > 0;

  function showError(field: ErrorField, message: string) {
    setSubmitError({ field, message });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!hasTokenOptions) {
      return;
    }

    try {
      parseTokenAmount(buyInAmount, 6);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Enter a valid token amount.";
      showError("buyInAmount", message);
      return;
    }

    const whitelistResult = normalizeAddressList(whitelist);
    if (whitelistResult.errors.length > 0) {
      showError("whitelist", whitelistResult.errors[0]);
      return;
    }
    if (whitelistResult.addresses.length === 0) {
      showError("whitelist", "Add at least one whitelisted address.");
      return;
    }

    if (!token || !availableTokens.some((availableToken) => availableToken === token)) {
      showError("token", "Select an allowlisted token.");
      return;
    }

    onCreated(1n);
  }

  return (
    <section className="panel stack">
      <h1>Create poker pot</h1>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Token</span>
          <select
            aria-describedby={submitError?.field === "token" ? ERROR_ID : undefined}
            aria-invalid={submitError?.field === "token" ? "true" : undefined}
            aria-label="Token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          >
            <option value="">Select token</option>
            {availableTokens.map((allowlistedToken) => (
              <option key={allowlistedToken} value={allowlistedToken}>
                {allowlistedToken}
              </option>
            ))}
          </select>
        </label>
        {!hasTokenOptions ? <p className="error-text">{NO_TOKENS_MESSAGE}</p> : null}
        <TokenAmountInput
          describedBy={submitError?.field === "buyInAmount" ? ERROR_ID : undefined}
          invalid={submitError?.field === "buyInAmount"}
          label="Buy-in amount"
          value={buyInAmount}
          onChange={setBuyInAmount}
        />
        <AddressListInput
          describedBy={submitError?.field === "whitelist" ? ERROR_ID : undefined}
          invalid={submitError?.field === "whitelist"}
          label="Whitelist addresses"
          value={whitelist}
          onChange={setWhitelist}
        />
        {submitError ? (
          <p className="error-text" id={ERROR_ID} role="alert">
            {submitError.message}
          </p>
        ) : null}
        <button className="primary-button" type="submit" disabled={!hasTokenOptions}>
          Create game
        </button>
      </form>
    </section>
  );
}
