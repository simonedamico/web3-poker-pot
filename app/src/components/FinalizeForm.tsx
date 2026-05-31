import { Plus, Trophy, UserMinus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { type EnsNameResolver, parseAddressInput, resolveAddressInput } from "../lib/address";
import { formatTokenAmount, parseTokenAmount } from "../lib/tokenAmount";

type PayoutInput = { recipient: `0x${string}`; amount: bigint };
type DraftRow = { recipient: string; amount: string };
type FinalizeFormProps = {
  pot: bigint;
  decimals: number;
  disabled?: boolean;
  error?: string | null;
  isPending?: boolean;
  resolveEnsName?: EnsNameResolver;
  onFinalize: (rows: PayoutInput[]) => void;
};

type ParsedRow = {
  recipient?: `0x${string}`;
  ensName?: string;
  amount?: bigint;
  recipientError?: string;
  amountError?: string;
};

const EMPTY_ROW: DraftRow = { recipient: "", amount: "" };

function isBlankRow(row: DraftRow) {
  return row.recipient.trim().length === 0 && row.amount.trim().length === 0;
}

function parseDraftRow(row: DraftRow, decimals: number): ParsedRow {
  const parsed: ParsedRow = {};
  const recipient = row.recipient.trim();

  if (!recipient) {
    parsed.recipientError = "Enter a recipient address.";
  } else {
    const parsedRecipient = parseAddressInput(recipient);
    if (parsedRecipient.kind === "address") {
      parsed.recipient = parsedRecipient.address;
    } else if (parsedRecipient.kind === "ens") {
      parsed.ensName = parsedRecipient.name;
    } else if (parsedRecipient.error === "zero") {
      parsed.recipientError = "Recipient cannot be the zero address.";
    } else {
      parsed.recipientError = "Enter a valid recipient address or ENS name.";
    }
  }

  try {
    parsed.amount = parseTokenAmount(row.amount, decimals);
  } catch (caughtError) {
    parsed.amountError = caughtError instanceof Error ? caughtError.message : "Enter a valid token amount.";
  }

  return parsed;
}

export function FinalizeForm({
  pot,
  decimals,
  disabled = false,
  error,
  isPending = false,
  resolveEnsName = async () => null,
  onFinalize,
}: FinalizeFormProps) {
  const [rows, setRows] = useState<DraftRow[]>([EMPTY_ROW]);
  const [recipientSubmitErrors, setRecipientSubmitErrors] = useState<Record<number, string>>({});

  const parsedRows = useMemo(() => rows.map((row) => parseDraftRow(row, decimals)), [decimals, rows]);
  const activeRows = useMemo(
    () =>
      rows
        .map((row, index) => ({ draft: row, parsed: parsedRows[index] }))
        .filter(({ draft }) => !isBlankRow(draft)),
    [parsedRows, rows],
  );
  const total = activeRows.reduce((sum, row) => sum + (row.parsed.amount ?? 0n), 0n);
  const remaining = pot - total;
  const rowsValid = activeRows.every(
    (row) => (row.parsed.recipient || row.parsed.ensName) && row.parsed.amount !== undefined,
  );
  const formDisabled = disabled || isPending;
  const canFinalize = !formDisabled && activeRows.length > 0 && rowsValid && total === pot;

  function updateRow(index: number, field: keyof DraftRow, value: string) {
    setRecipientSubmitErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[index];
      return nextErrors;
    });
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, EMPTY_ROW]);
  }

  function removeRow(index: number) {
    setRows((currentRows) => currentRows.filter((_, rowIndex) => rowIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canFinalize) return;

    const resolvedRows: PayoutInput[] = [];
    const nextSubmitErrors: Record<number, string> = {};

    for (const row of activeRows) {
      const rowIndex = rows.indexOf(row.draft);
      if (row.parsed.recipient) {
        resolvedRows.push({ recipient: row.parsed.recipient, amount: row.parsed.amount! });
        continue;
      }

      const result = await resolveAddressInput(row.draft.recipient, resolveEnsName);
      if (result.error || !result.address) {
        nextSubmitErrors[rowIndex] =
          result.error === "zero" ? "Recipient cannot be the zero address." : "ENS name could not be resolved.";
        continue;
      }

      resolvedRows.push({ recipient: result.address, amount: row.parsed.amount! });
    }

    setRecipientSubmitErrors(nextSubmitErrors);
    if (Object.keys(nextSubmitErrors).length > 0) return;

    onFinalize(resolvedRows);
  }

  return (
    <section className="table-section finalize-section stack">
      <div className="section-heading">
        <Trophy size={19} aria-hidden="true" />
        <h2>Finalize payouts</h2>
      </div>
      <p className="pot-pill muted">Pot: {formatTokenAmount(pot, decimals)}</p>

      <form className="stack" onSubmit={handleSubmit}>
        {rows.map((row, index) => {
          const rowNumber = index + 1;
          const parsedRow = parsedRows[index];
          const rowIsBlank = isBlankRow(row);
          const recipientErrorId = `finalize-recipient-error-${rowNumber}`;
          const amountErrorId = `finalize-amount-error-${rowNumber}`;
          const showRecipientError = !rowIsBlank && parsedRow.recipientError;
          const recipientSubmitError = recipientSubmitErrors[index];
          const recipientError = showRecipientError ? parsedRow.recipientError : recipientSubmitError;
          const showAmountError = !rowIsBlank && parsedRow.amountError;

          return (
            <div className="payout-row stack" key={rowNumber}>
              <label className="field">
                <span>Recipient {rowNumber}</span>
                <input
                  aria-label={`Recipient ${rowNumber}`}
                  aria-describedby={recipientError ? recipientErrorId : undefined}
                  aria-invalid={recipientError ? "true" : undefined}
                  disabled={formDisabled}
                  value={row.recipient}
                  onChange={(event) => updateRow(index, "recipient", event.target.value)}
                />
              </label>
              {recipientError ? (
                <p className="error-text" id={recipientErrorId} role="alert">
                  {recipientError}
                </p>
              ) : null}

              <label className="field">
                <span>Amount {rowNumber}</span>
                <input
                  aria-label={`Amount ${rowNumber}`}
                  aria-describedby={showAmountError ? amountErrorId : undefined}
                  aria-invalid={showAmountError ? "true" : undefined}
                  inputMode="decimal"
                  disabled={formDisabled}
                  value={row.amount}
                  onChange={(event) => updateRow(index, "amount", event.target.value)}
                />
              </label>
              {showAmountError ? (
                <p className="error-text" id={amountErrorId} role="alert">
                  {parsedRow.amountError}
                </p>
              ) : null}

              {rows.length > 1 ? (
                <button className="secondary-button" type="button" disabled={formDisabled} onClick={() => removeRow(index)}>
                  <UserMinus className="button-icon" size={17} aria-hidden="true" />
                  Remove payout {rowNumber}
                </button>
              ) : null}
            </div>
          );
        })}

        <div className="button-row">
          <button className="secondary-button" type="button" disabled={formDisabled} onClick={addRow}>
            <Plus className="button-icon" size={17} aria-hidden="true" />
            Add payout
          </button>
          <button className="primary-button" type="submit" disabled={!canFinalize}>
            <Trophy className="button-icon" size={18} aria-hidden="true" />
            {isPending ? "Finalizing payouts" : "Finalize payouts"}
          </button>
        </div>

        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        {remaining < 0n ? (
          <p className="error-text" role="alert">
            Over by: {formatTokenAmount(-remaining, decimals)}
          </p>
        ) : (
          <p className="muted" aria-live="polite">
            Remaining: {formatTokenAmount(remaining, decimals)}
          </p>
        )}
      </form>
    </section>
  );
}
