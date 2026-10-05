import { GamePage } from './pages/GamePage.tsx';
import { Home } from './pages/Home.tsx';
import { Lobby } from './pages/Lobby.tsx';
import { useRoom } from './hooks/useRoom.ts';

export function App() {
  const room = useRoom();

  if (room.restoring) {
    return (
      <main className="splash">
        <span className="brand brand--big">Jaipur</span>
        <p className="muted">Finding your seat…</p>
      </main>
    );
  }
  if (!room.view) return <Home room={room} />;
  if (room.view.status === 'waiting') return <Lobby view={room.view} onLeave={() => void room.leave()} />;
  return <GamePage key={room.view.roomId} room={room} />;
}
