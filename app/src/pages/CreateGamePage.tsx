type CreateGamePageProps = {
  onCreated: (gameId: bigint) => void;
};

export function CreateGamePage({ onCreated }: CreateGamePageProps) {
  return (
    <section className="panel stack">
      <h1>Create poker pot</h1>
      <label className="field">
        <span>Buy-in amount</span>
        <input name="buyInAmount" />
      </label>
      <button className="primary-button" type="button" onClick={() => onCreated(1n)}>
        Create
      </button>
    </section>
  );
}
