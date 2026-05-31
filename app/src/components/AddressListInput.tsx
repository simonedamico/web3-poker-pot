type AddressListInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

export function AddressListInput({ label, value, onChange, invalid, describedBy }: AddressListInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={invalid ? "true" : undefined}
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
