import { type FormEvent, useMemo, useState } from "react";
import { getAddress, isAddress, zeroAddress } from "viem";
import { formatTokenAmount, parseTokenAmount } from "../lib/tokenAmount";

type PayoutInput = { recipient: `0x${string}`; amount: bigint };
type DraftRow = { recipient: string; amount: string };
type FinalizeFormProps = {
  pot: bigint;
  decimals: number;
  disabled?: boolean;
  error?: string | null;
  isPending?: boolean;
  onFinalize: (rows: PayoutInput[]) => void;
};

type ParsedRow = {
  recipient?: `0x${string}`;
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
  } else if (!isAddress(recipient)) {
    parsed.recipientError = "Enter a valid recipient address.";
  } else {
    const normalized = getAddress(recipient);
    if (normalized.toLowerCase() === zeroAddress) {
      parsed.recipientError = "Recipient cannot be the zero address.";
    } else {
      parsed.recipient = normalized;
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
  onFinalize,
}: FinalizeFormProps) {
  const [rows, setRows] = useState<DraftRow[]>([EMPTY_ROW]);

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
  const rowsValid = activeRows.every((row) => row.parsed.recipient && row.parsed.amount !== undefined);
  const formDisabled = disabled || isPending;
  const canFinalize = !formDisabled && activeRows.length > 0 && rowsValid && total === pot;

  function updateRow(index: number, field: keyof DraftRow, value: string) {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canFinalize) return;

    onFinalize(
      activeRows.map((row) => ({
        recipient: row.parsed.recipient!,
        amount: row.parsed.amount!,
      })),
    );
  }

  return (
    <section className="stack">
      <div>
        <h2>Finalize payouts</h2>
        <p className="muted">Pot: {formatTokenAmount(pot, decimals)}</p>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        {rows.map((row, index) => {
          const rowNumber = index + 1;
          const parsedRow = parsedRows[index];
          const rowIsBlank = isBlankRow(row);
          const recipientErrorId = `finalize-recipient-error-${rowNumber}`;
          const amountErrorId = `finalize-amount-error-${rowNumber}`;
          const showRecipientError = !rowIsBlank && parsedRow.recipientError;
          const showAmountError = !rowIsBlank && parsedRow.amountError;

          return (
            <div className="stack" key={rowNumber}>
              <label className="field">
                <span>Recipient {rowNumber}</span>
                <input
                  aria-label={`Recipient ${rowNumber}`}
                  aria-describedby={showRecipientError ? recipientErrorId : undefined}
                  aria-invalid={showRecipientError ? "true" : undefined}
                  disabled={formDisabled}
                  value={row.recipient}
                  onChange={(event) => updateRow(index, "recipient", event.target.value)}
                />
              </label>
              {showRecipientError ? (
                <p className="error-text" id={recipientErrorId} role="alert">
                  {parsedRow.recipientError}
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
                  Remove payout {rowNumber}
                </button>
              ) : null}
            </div>
          );
        })}

        <div className="button-row">
          <button className="secondary-button" type="button" disabled={formDisabled} onClick={addRow}>
            Add payout
          </button>
          <button className="primary-button" type="submit" disabled={!canFinalize}>
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
