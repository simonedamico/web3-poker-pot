type GamePageProps = {
  gameId: bigint;
};

export function GamePage({ gameId }: GamePageProps) {
  return (
    <section className="panel stack">
      <h1>Game #{gameId.toString()}</h1>
    </section>
  );
}
