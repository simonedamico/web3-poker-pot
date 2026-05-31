type TokenAmountInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function TokenAmountInput({ label, value, onChange }: TokenAmountInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
