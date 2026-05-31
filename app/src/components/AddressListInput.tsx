type AddressListInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function AddressListInput({ label, value, onChange }: AddressListInputProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        aria-label={label}
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
