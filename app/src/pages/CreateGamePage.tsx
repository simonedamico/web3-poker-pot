import { FormEvent, useState } from "react";
import { AddressListInput } from "../components/AddressListInput";
import { TokenAmountInput } from "../components/TokenAmountInput";
import { allowlistedTokens } from "../contracts/pokerPot";
import { normalizeAddressList } from "../lib/address";
import { parseTokenAmount } from "../lib/tokenAmount";

type CreateGamePageProps = {
  onCreated: (gameId: bigint) => void;
};

export function CreateGamePage({ onCreated }: CreateGamePageProps) {
  const [token, setToken] = useState("");
  const [buyInAmount, setBuyInAmount] = useState("");
  const [whitelist, setWhitelist] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      parseTokenAmount(buyInAmount, 6);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Enter a valid token amount.");
      return;
    }

    const whitelistResult = normalizeAddressList(whitelist);
    if (whitelistResult.errors.length > 0) {
      setError(whitelistResult.errors[0]);
      return;
    }
    if (whitelistResult.addresses.length === 0) {
      setError("Add at least one whitelisted address.");
      return;
    }

    if (!token) {
      setError("Select an allowlisted token.");
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
          <select aria-label="Token" value={token} onChange={(event) => setToken(event.target.value)}>
            <option value="">Select token</option>
            {allowlistedTokens.map((allowlistedToken) => (
              <option key={allowlistedToken} value={allowlistedToken}>
                {allowlistedToken}
              </option>
            ))}
          </select>
        </label>
        <TokenAmountInput label="Buy-in amount" value={buyInAmount} onChange={setBuyInAmount} />
        <AddressListInput label="Whitelist addresses" value={whitelist} onChange={setWhitelist} />
        {error ? <p className="error-text">{error}</p> : null}
        <button className="primary-button" type="submit">
          Create game
        </button>
      </form>
    </section>
  );
}
