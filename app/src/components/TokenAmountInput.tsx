type TokenAmountInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

export function TokenAmountInput({ label, value, onChange, invalid, describedBy }: TokenAmountInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={invalid ? "true" : undefined}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
