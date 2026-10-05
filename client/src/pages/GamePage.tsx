import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card, GameAction, PlayerIndex } from '../../../shared/types.ts';
import { ActionBar } from '../components/ActionBar.tsx';
import { GameLog } from '../components/GameLog.tsx';
import { Market } from '../components/Market.tsx';
import { OpponentArea } from '../components/OpponentArea.tsx';
import { PlayerArea } from '../components/PlayerArea.tsx';
import { RoundSummary } from '../components/RoundSummary.tsx';
import { RulesDrawer } from '../components/RulesDrawer.tsx';
import { Toasts, type Toast } from '../components/Toasts.tsx';
import { TokenBazaar } from '../components/TokenBazaar.tsx';
import { formatLog } from '../game/format.tsx';
import { EMPTY_SELECTION, computeIntent, type Selection } from '../game/intent.ts';
import { isMuted, play, setMuted } from '../game/sound.ts';
import { useFlip, type AnchorResolver } from '../hooks/useFlip.ts';
import type { RoomApi } from '../hooks/useRoom.ts';

export function GamePage({ room }: { room: RoomApi }) {
  const view = room.view!;
  const game = view.game!;
  const r = game.round;
  const you = view.you;
  const opp = (you === 0 ? 1 : 0) as PlayerIndex;
  const myTurn = game.phase === 'playing' && r.currentPlayer === you;
  const name = useCallback((p: PlayerIndex) => view.players[p]?.name ?? `Player ${p + 1}`, [view.players]);
  const oppName = name(opp);

  const [sel, setSel] = useState<Selection>(EMPTY_SELECTION);
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [peek, setPeek] = useState(false);
  const [summaryReady, setSummaryReady] = useState(game.phase !== 'playing');
  const [intro, setIntro] = useState<string | null>(() =>
    game.lastEvent?.type === 'roundStart' && game.log.length <= 2 ? `${name(r.startingPlayer)} opens the market` : null);
  const [leaveArmed, setLeaveArmed] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200);
  }, []);

  const intent = useMemo(() => computeIntent(game, sel), [game, sel]);

  // ---- reactions to new server state ---------------------------------------
  const prev = useRef({ version: game.version, phase: game.phase, round: r.number });
  useEffect(() => {
    const p = prev.current;
    prev.current = { version: game.version, phase: game.phase, round: r.number };
    if (p.version === game.version) return;
    setSel(EMPTY_SELECTION);
    const ev = game.lastEvent;
    if (ev) {
      const sfx = { takeGood: 'card', takeCamels: 'camel', exchange: 'swap', sell: 'coin', roundStart: 'join' } as const;
      play(sfx[ev.type]);
      if (ev.type === 'roundStart') {
        setIntro(`Round ${r.number} · ${ev.player === you ? 'you start' : `${name(ev.player)} starts`}`);
      }
    }
    if (game.phase !== 'playing' && p.phase === 'playing') {
      setSummaryReady(false);
      setTimeout(() => { setSummaryReady(true); play('seal'); }, 1100);
    }
    if (game.phase === 'playing') { setPeek(false); setSummaryReady(false); }
    if (game.phase === 'playing' && r.currentPlayer === you && ev?.player !== you) setTimeout(() => play('turn'), 380);
  }, [game.version]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => setIntro(null), 2200);
    return () => clearTimeout(t);
  }, [intro]);

  useEffect(() => { if (!leaveArmed) return; const t = setTimeout(() => setLeaveArmed(false), 2500); return () => clearTimeout(t); }, [leaveArmed]);

  // ---- FLIP animations ------------------------------------------------------
  const rootRef = useRef<HTMLDivElement>(null);
  const resolver: AnchorResolver = (id, dir, kind) => {
    const ev = game.lastEvent;
    if (!ev || (kind !== 'good' && kind !== 'camel')) return null;
    const mine = ev.player === you;
    if (dir === 'exit') {
      if (ev.type === 'sell') return 'discard';
      if (!mine) return kind === 'camel' ? 'opp-herd' : 'opp-hand';
      return null;
    }
    if (!r.market.some((c) => c.id === id)) return null;
    if (ev.type === 'exchange' && !mine) return kind === 'camel' ? 'opp-herd' : 'opp-hand';
    if (ev.type === 'takeGood' || ev.type === 'takeCamels') return 'deck';
    return null;
  };
  useFlip(rootRef, game.version, String(r.number), resolver);

  // ---- selection ------------------------------------------------------------
  const typeOf = (id: string) => r.market.find((c) => c.id === id)?.type ?? game.me.hand.find((c) => c.id === id)?.type;
  const camelMode = sel.market.length > 0 && sel.market.every((id) => typeOf(id) === 'camel');
  const notYourTurn = () => {
    if (game.phase === 'playing') toast(`It's ${oppName}'s turn.`);
    play('error');
  };

  const onMarketClick = (c: Card) => {
    if (!myTurn) return notYourTurn();
    if (c.type === 'camel') {
      setSel(camelMode ? EMPTY_SELECTION : { market: r.market.filter((x) => x.type === 'camel').map((x) => x.id), hand: [], camels: 0 });
      return;
    }
    setSel((s) => {
      const base = camelMode ? [] : s.market;
      const market = base.includes(c.id) ? base.filter((x) => x !== c.id) : [...base, c.id];
      return { market, hand: camelMode ? [] : s.hand, camels: market.length ? s.camels : 0 };
    });
  };

  const onHandClick = (c: Card) => {
    if (!myTurn) return notYourTurn();
    setSel((s) => {
      const market = camelMode ? [] : s.market;
      if (s.hand.includes(c.id)) return { ...s, market, hand: s.hand.filter((x) => x !== c.id) };
      // Selling is one goods type: clicking another type starts a new sale selection.
      const selling = market.length === 0 && s.camels === 0;
      const mixed = selling && s.hand.some((id) => typeOf(id) !== c.type);
      return { market, camels: s.camels, hand: mixed ? [c.id] : [...s.hand, c.id] };
    });
  };

  const takenTypes = new Set(sel.market.map(typeOf));
  const dimHand = (c: Card) => {
    if (!myTurn) return false;
    if (sel.market.length && !camelMode) return takenTypes.has(c.type);
    if (!sel.market.length && sel.hand.length) return typeOf(sel.hand[0]) !== c.type;
    return false;
  };
  const dimMarket = (c: Card) => myTurn && camelMode && c.type !== 'camel';

  // ---- actions --------------------------------------------------------------
  const inFlight = useRef(false);
  const submit = async (action?: GameAction) => {
    const a = action ?? (intent.kind !== 'idle' && intent.check.ok ? intent.action : null);
    if (!a || inFlight.current || !myTurn) return;
    inFlight.current = true;
    setBusy(true);
    const res = await room.act(a);
    inFlight.current = false;
    setBusy(false);
    if (!res.ok) { toast(res.error, 'error'); play('error'); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (rulesOpen || tag === 'INPUT') return;
      if (e.key === 'Escape') setSel(EMPTY_SELECTION);
      const onCard = (e.target as HTMLElement)?.classList?.contains('card');
      if (e.key === 'Enter' && (tag !== 'BUTTON' || onCard) && intent.kind !== 'idle') { e.preventDefault(); void submit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onContinue = async () => {
    const res = await room.continueGame();
    if (!res.ok) toast(res.error, 'error');
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(view.roomId); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500); } catch { /* ignore */ }
  };

  // ---- derived UI ----------------------------------------------------------
  const oppPlayer = view.players[opp];
  const lastOpp = [...game.log].reverse().find((e) => 'player' in e && e.player === opp && ['takeGood', 'takeCamels', 'exchange', 'sell'].includes(e.kind));
  const lastResult = game.results[game.results.length - 1];
  const showSummary = game.phase !== 'playing' && summaryReady && !peek && lastResult;
  const handAfter = intent.kind === 'takeGood' || intent.kind === 'exchange' ? intent.handAfter : intent.kind === 'sell' ? game.me.hand.length - intent.cards.length : null;
  const sellGood = intent.kind === 'sell' ? intent.good : null;

  return (
    <div className={`table ${myTurn ? 'is-my-turn' : ''}`} ref={rootRef}>
      <header className="topbar">
        <span className="brand">Jaipur</span>
        <button type="button" className="chip" onClick={copyCode} title="Copy room code">
          Room <b>{view.roomId}</b> {codeCopied ? '✓' : ''}
        </button>
        <span className="chip chip--plain">Round {r.number}</span>
        <span className="topbar__spacer" />
        <button type="button" className="icon-btn" onClick={() => { setMuted(!muted); setMutedState(!muted); }} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Sound off' : 'Sound on'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRulesOpen(true)}>Rules</button>
        <button type="button" className={`btn btn--ghost btn--sm ${leaveArmed ? 'is-armed' : ''}`} onClick={() => (leaveArmed ? room.leave() : setLeaveArmed(true))}>
          {leaveArmed ? 'Leave game?' : 'Leave'}
        </button>
      </header>

      {!room.connected && <div className="banner banner--warn">Connection lost. Reconnecting…</div>}
      {oppPlayer && !oppPlayer.connected && !oppPlayer.left && <div className="banner">{oppName} lost connection. Their seat is saved; the game resumes when they return.</div>}
      {oppPlayer?.left && game.phase === 'playing' && (
        <div className="banner banner--warn">{oppName} left the game. <button type="button" className="btn btn--link" onClick={() => room.leave()}>Back to lobby</button></div>
      )}

      <OpponentArea game={game} player={oppPlayer} active={game.phase === 'playing' && r.currentPlayer === opp} seals={game.seals[opp]} />

      <div className="board">
        <TokenBazaar round={r} highlight={sellGood} />
        <div className="board__center">
          <div className={`turn ${myTurn ? 'turn--mine' : 'turn--theirs'}`} aria-live="polite" key={`${r.currentPlayer}-${game.version}`}>
            <span className="turn__who">{game.phase !== 'playing' ? 'Round over' : myTurn ? 'Your turn' : `${oppName}'s turn`}</span>
            {lastOpp && myTurn && <span className="turn__last">{formatLog(lastOpp, name).text}</span>}
          </div>
          <Market round={r} selected={sel.market} dimmed={dimMarket} onCardClick={onMarketClick} myTurn={myTurn} />
        </div>
        <GameLog log={game.log} name={name} />
      </div>

      <ActionBar
        game={game}
        intent={intent}
        myTurn={myTurn}
        opponentName={oppName}
        busy={busy}
        onSubmit={() => void submit()}
        onClear={() => setSel(EMPTY_SELECTION)}
        onTakeCamels={() => void submit({ type: 'takeCamels' })}
      />

      <PlayerArea
        game={game}
        player={view.players[you]}
        active={myTurn}
        seals={game.seals[you]}
        selectedHand={sel.hand}
        giveCamels={sel.camels}
        exchangeMode={myTurn && sel.market.length > 0 && !camelMode}
        handAfter={handAfter}
        dimHand={dimHand}
        onHandClick={onHandClick}
        onCamels={(n) => setSel((s) => ({ ...s, camels: n }))}
      />

      {game.phase !== 'playing' && peek && (
        <button type="button" className="btn btn--primary peek-return" onClick={() => setPeek(false)}>Back to results</button>
      )}
      {showSummary && (
        <RoundSummary view={view} result={lastResult} onContinue={onContinue} onLeave={() => room.leave()} onPeek={() => setPeek(true)} />
      )}
      {intro && <div className="intro" key={intro}><span>{intro}</span></div>}
      <RulesDrawer open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <Toasts toasts={toasts} />
    </div>
  );
}
