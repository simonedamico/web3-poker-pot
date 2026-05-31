import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useMemo, useState } from "react";
import { HardhatGasButton } from "./components/HardhatGasButton";
import { LocalTokenMintButton } from "./components/LocalTokenMintButton";
import { CreateGamePage } from "./pages/CreateGamePage";
import { GamePage } from "./pages/GamePage";
import "./styles.css";

export function App() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const routeGameId = useMemo(() => {
    const match = pathname.match(/^\/game\/(\d+)$/);
    return match ? BigInt(match[1]) : undefined;
  }, [pathname]);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleGameCreated(createdGameId: bigint) {
    const gamePath = `/game/${createdGameId.toString()}`;
    window.history.pushState({ gameId: createdGameId.toString() }, "", gamePath);
    setPathname(gamePath);
  }

  return (
    <main className="app-shell">
      <header className="app-toolbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span>A</span>
            <span>K</span>
          </div>
          <div className="brand-copy">
            <span className="app-title">Poker Pot Table</span>
            <span className="app-subtitle">Table stakes, buy-ins, and final chip splits onchain</span>
          </div>
        </div>
        <div className="app-actions">
          <HardhatGasButton />
          <LocalTokenMintButton />
          <ConnectButton />
        </div>
      </header>
      {routeGameId ? (
        <GamePage gameId={routeGameId} />
      ) : (
        <CreateGamePage onCreated={handleGameCreated} />
      )}
    </main>
  );
}
