import { FinalizeForm } from "../components/FinalizeForm";

type GamePageProps = {
  gameId: bigint;
};

export function GamePage({ gameId }: GamePageProps) {
  return (
    <section className="panel stack">
      <div>
        <h1>Game #{gameId.toString()}</h1>
        <p className="muted">Open poker pot</p>
      </div>

      <section className="stack">
        <h2>Buy in</h2>
        <p>Buy-ins: 0</p>
        <button className="primary-button" type="button">
          Buy in
        </button>
      </section>

      <section className="stack">
        <h2>Whitelist</h2>
        <p className="muted">Organiser controls appear when the connected wallet owns this game.</p>
      </section>

      <FinalizeForm pot={0n} decimals={6} onFinalize={() => undefined} />
    </section>
  );
}
