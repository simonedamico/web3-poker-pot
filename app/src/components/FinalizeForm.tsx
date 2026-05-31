import { type FormEvent, useMemo, useState } from "react";
import { getAddress, isAddress, zeroAddress } from "viem";
import { formatTokenAmount, parseTokenAmount } from "../lib/tokenAmount";

type PayoutInput = { recipient: `0x${string}`; amount: bigint };
type DraftRow = { recipient: string; amount: string };
type FinalizeFormProps = {
  pot: bigint;
  decimals: number;
  onFinalize: (rows: PayoutInput[]) => void;
};

type ParsedRow = {
  recipient?: `0x${string}`;
  amount?: bigint;
  recipientError?: string;
  amountError?: string;
};

const EMPTY_ROW: DraftRow = { recipient: "", amount: "" };

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

export function FinalizeForm({ pot, decimals, onFinalize }: FinalizeFormProps) {
  const [rows, setRows] = useState<DraftRow[]>([EMPTY_ROW]);

  const parsedRows = useMemo(() => rows.map((row) => parseDraftRow(row, decimals)), [decimals, rows]);
  const total = parsedRows.reduce((sum, row) => sum + (row.amount ?? 0n), 0n);
  const remaining = pot - total;
  const rowsValid = parsedRows.every((row) => row.recipient && row.amount !== undefined);
  const canFinalize = rowsValid && total === pot;

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
      parsedRows.map((row) => ({
        recipient: row.recipient!,
        amount: row.amount!,
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
          const recipientErrorId = `finalize-recipient-error-${rowNumber}`;
          const amountErrorId = `finalize-amount-error-${rowNumber}`;
          const showRecipientError = row.recipient.trim().length > 0 && parsedRow.recipientError;
          const showAmountError = row.amount.trim().length > 0 && parsedRow.amountError;

          return (
            <div className="stack" key={rowNumber}>
              <label className="field">
                <span>Recipient {rowNumber}</span>
                <input
                  aria-label={`Recipient ${rowNumber}`}
                  aria-describedby={showRecipientError ? recipientErrorId : undefined}
                  aria-invalid={showRecipientError ? "true" : undefined}
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
                <button className="secondary-button" type="button" onClick={() => removeRow(index)}>
                  Remove payout {rowNumber}
                </button>
              ) : null}
            </div>
          );
        })}

        <div className="button-row">
          <button className="secondary-button" type="button" onClick={addRow}>
            Add payout
          </button>
          <button className="primary-button" type="submit" disabled={!canFinalize}>
            Finalize payouts
          </button>
        </div>

        {remaining < 0n ? (
          <p className="error-text">Over by: {formatTokenAmount(-remaining, decimals)}</p>
        ) : (
          <p className="muted">Remaining: {formatTokenAmount(remaining, decimals)}</p>
        )}
      </form>
    </section>
  );
}
