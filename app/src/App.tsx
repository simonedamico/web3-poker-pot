import { useMemo, useState } from "react";
import { CreateGamePage } from "./pages/CreateGamePage";
import { GamePage } from "./pages/GamePage";
import "./styles.css";

export function App() {
  const [gameId, setGameId] = useState<bigint | undefined>();
  const routeGameId = useMemo(() => {
    const match = window.location.pathname.match(/^\/game\/(\d+)$/);
    return match ? BigInt(match[1]) : gameId;
  }, [gameId]);

  return (
    <main className="app-shell">
      {routeGameId ? (
        <GamePage gameId={routeGameId} />
      ) : (
        <CreateGamePage onCreated={(createdGameId) => setGameId(createdGameId)} />
      )}
    </main>
  );
}
