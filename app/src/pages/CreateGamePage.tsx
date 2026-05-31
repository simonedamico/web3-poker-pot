import { CircleDollarSign, Dices, Plus, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { AddressListInput } from "../components/AddressListInput";
import { TokenAmountInput } from "../components/TokenAmountInput";
import { allowlistedTokens } from "../contracts/pokerPot";
import { useEnsNameResolver } from "../hooks/useEnsNames";
import { usePokerPotWrites } from "../hooks/usePokerPot";
import { tokenDisplayLabel, tokenMetadataKey, useTokenMetadata } from "../hooks/useTokenMetadata";
import { resolveAddressList } from "../lib/address";
import { parseTokenAmount } from "../lib/tokenAmount";

const ERROR_ID = "create-game-error";
const NO_TOKENS_MESSAGE = "No allowlisted tokens are configured. Run deployment setup before creating a game.";
const LOCAL_TEST_BUY_IN_AMOUNT = "10";
const LOCAL_TEST_WHITELIST = [
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
].join("\n");

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
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const pokerPot = usePokerPotWrites();
  const tokenMetadata = useTokenMetadata(availableTokens);
  const resolveEnsName = useEnsNameResolver();

  const hasTokenOptions = availableTokens.length > 0;
  const formDisabled = !hasTokenOptions || pokerPot.isPending || isCreating;
  const showLocalTestHelper =
    hasTokenOptions && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  function showError(field: ErrorField, message: string) {
    setSubmitError({ field, message });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setCreateError(null);

    if (!hasTokenOptions) {
      return;
    }

    let parsedAmount: bigint;
    try {
      parsedAmount = parseTokenAmount(buyInAmount, 6);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Enter a valid token amount.";
      showError("buyInAmount", message);
      return;
    }

    if (!token || !availableTokens.some((availableToken) => availableToken === token)) {
      showError("token", "Select an allowlisted token.");
      return;
    }

    const whitelistResult = await resolveAddressList(whitelist, resolveEnsName);
    if (whitelistResult.errors.length > 0) {
      showError("whitelist", whitelistResult.errors[0]);
      return;
    }
    if (whitelistResult.addresses.length === 0) {
      showError("whitelist", "Add at least one whitelisted address.");
      return;
    }

    setIsCreating(true);
    try {
      const gameId = await pokerPot.createGame(token as `0x${string}`, parsedAmount, whitelistResult.addresses);
      onCreated(gameId);
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : "Could not create the game.");
    } finally {
      setIsCreating(false);
    }
  }

  function fillLocalTestTable() {
    if (!hasTokenOptions) return;

    setToken(availableTokens[0]);
    setBuyInAmount(LOCAL_TEST_BUY_IN_AMOUNT);
    setWhitelist(LOCAL_TEST_WHITELIST);
    setSubmitError(null);
    setCreateError(null);
  }

  return (
    <section className="panel setup-panel stack">
      <header className="panel-heading table-heading">
        <div className="dealer-button" aria-hidden="true">
          <Dices size={24} strokeWidth={2.4} />
        </div>
        <div>
          <p className="eyebrow">Game setup</p>
          <h1>Open a poker table</h1>
          <p className="muted">Set the stakes, invite the seats, and choose the token for tonight's pot.</p>
        </div>
      </header>
      <form className="stack setup-form" onSubmit={handleSubmit}>
        {showLocalTestHelper ? (
          <section className="local-test-panel">
            <div>
              <p className="eyebrow">Hardhat fixture</p>
              <p className="muted">Token, stakes, and three seats ready for a local table.</p>
            </div>
            <button className="secondary-button" type="button" onClick={fillLocalTestTable}>
              <Dices className="button-icon" size={17} aria-hidden="true" />
              Fill local test table
            </button>
          </section>
        ) : null}
        <div className="form-grid">
          <label className="field field-card">
            <span>
              <CircleDollarSign className="field-icon" size={17} aria-hidden="true" />
              Token
            </span>
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
                  {tokenDisplayLabel(
                    allowlistedToken,
                    tokenMetadata.metadataByAddress[tokenMetadataKey(allowlistedToken)],
                  )}
                </option>
              ))}
            </select>
          </label>
          <div className="field-card">
            <TokenAmountInput
              describedBy={submitError?.field === "buyInAmount" ? ERROR_ID : undefined}
              invalid={submitError?.field === "buyInAmount"}
              label="Buy-in amount"
              value={buyInAmount}
              onChange={setBuyInAmount}
            />
          </div>
        </div>
        {!hasTokenOptions ? <p className="error-text">{NO_TOKENS_MESSAGE}</p> : null}
        <div className="field-card">
          <div className="field-card-heading">
            <Users size={18} aria-hidden="true" />
            <span>Invited seats</span>
          </div>
          <AddressListInput
            describedBy={submitError?.field === "whitelist" ? ERROR_ID : undefined}
            invalid={submitError?.field === "whitelist"}
            label="Whitelist addresses"
            value={whitelist}
            onChange={setWhitelist}
          />
        </div>
        {submitError ? (
          <p className="error-text" id={ERROR_ID} role="alert">
            {submitError.message}
          </p>
        ) : null}
        {!submitError && (createError || pokerPot.error) ? (
          <p className="error-text" role="alert">
            {createError ?? pokerPot.error}
          </p>
        ) : null}
        <button className="primary-button" type="submit" disabled={formDisabled}>
          <Plus className="button-icon" size={18} aria-hidden="true" />
          {pokerPot.isPending || isCreating ? "Creating game" : "Create game"}
        </button>
      </form>
    </section>
  );
}
