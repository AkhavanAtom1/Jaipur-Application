# Jaipur Online

A real-time, two-player web version of **Jaipur** (Sébastien Pauchon, Space Cowboys). Create a room, share the 5-character code, and play the full game (rounds, tokens, camel majority, Seals of Excellence) against a friend in another browser.

All artwork is original (CSS + inline SVG). No assets from the published game are used.

## Quick start (local)

Requires **Node.js 22.18+**.

```bash
npm install
npm run dev          # wrangler dev (Worker + Durable Object) on :8787 + Vite client on :5173
```

Open http://localhost:5173 in two browser tabs.

## Deploy to Cloudflare

```bash
npm install
npx wrangler login
npm run deploy       # builds the client, then `wrangler deploy`
```

Or connect the GitHub repo in Cloudflare (Workers & Pages -> Create application -> Import a repository) with
build command `npm run build` and deploy command `npx wrangler deploy`.

Server: `worker/index.ts` (Worker + `JaipurHub` Durable Object, plain WebSockets). Game and room logic in `server/` is unchanged and runtime-agnostic. Commands: `npm test`, `npm run typecheck`, `npm run build`, `npm run deploy`.

## Playing

1. **Create room**: the server allocates a unique code (e.g. `K7P4X`, no ambiguous 0/O/1/I/L). You become Player 1 and wait in the lobby. Copy the code or an invite link (`?room=K7P4X` pre-fills the join form).
2. **Join room**: the second player enters the code. Invalid, unknown and full rooms show clear errors. A third player can never join.
3. The game starts the instant Player 2 joins. The starting player of round 1 is random.
4. **On your turn**, click cards:
   - one market good → *Take 1 good*
   - any market camel → selects all camels → *Take camels*
   - 2+ market goods, then the same number of hand cards and/or camels (herd stepper) → *Exchange*
   - hand cards of one type → *Sell* (shows the tokens and bonus you'll receive)
   - `Enter` performs the highlighted action, `Esc` clears. Illegal selections explain why.
5. After a round both players press *Ready*; after the game, *Rematch*.

Refreshing or losing connection is fine: the tab keeps a secret seat token (sessionStorage) and silently reclaims its seat. The opponent sees a "lost connection" banner meanwhile. Rooms with nobody connected for 30 minutes are swept.

## Architecture

```
shared/            Types, official constants, pure rule checks, socket protocol (used by both sides)
server/
  game/            Authoritative engine: setup, actions, scoring, per-player view projection
  rooms/           RoomManager (create/join/rejoin/leave/act/continue), RoomStore interface, code gen
  socket/          Socket.IO adapter: events → RoomManager, per-player broadcasts
  tests/           node:test suites (engine, rooms, 300-game simulation)
  index.ts         Express + Socket.IO bootstrap, serves dist/client in production
client/src/
  net/             Socket.IO client + typed ack helpers, safe storage
  hooks/           useRoom (session + reconnection), useFlip (card/token motion), useCountUp
  game/            Selection → intent (UI pre-validation), log formatting, synthesized sound
  components/      Cards, tokens, market, bazaar, seats, action bar, ledger, rules, summary
  pages/           Home, Lobby, GamePage
  styles/          Single hand-written stylesheet (OKLCH palette, responsive)
```

### Server-authoritative sync

- The client only sends **intents**: `{ type: 'takeGood', cardId }`, `{ type: 'exchange', takeIds, giveIds, giveCamels }`, etc. Shapes are parsed defensively; every action is validated against turn, phase and rules with the same `shared/rules.ts` checks the UI uses for hints.
- After any change the server sends **each player their own projection** (`server/game/view.ts`): the opponent's hand is only a count, deck contents are never sent, opponent bonus token values are hidden, and the opponent herd is only a rough size hint. Tests assert that no hidden card id appears in a serialized view.
- Every state carries a `version` and a `lastEvent`; the client diffs element positions (FLIP) to animate cards and tokens between market, hand, herd, discard and purses.
- Rooms are plain JSON objects behind a `RoomStore` interface. `MemoryRoomStore` is used today; a Redis store would implement the same methods (make them async and add pub/sub via the Socket.IO Redis adapter for multiple nodes).

## Verified rules (and decisions)

Checked against the official English rulebook from Space Cowboys / Asmodee (2025 edition PDF on spacecowboys-games.com) and the 2009 rulebook text.

- **Cards (55)**: 6 diamonds, 6 gold, 6 silver, 8 cloth, 8 spice, 10 leather, 11 camels.
- **Goods tokens (38)**, stacked highest first: diamond 7 7 5 5 5 · gold 6 6 5 5 5 · silver 5×5 · cloth 5 3 3 2 2 1 1 · spice 5 3 3 2 2 1 1 · leather 4 3 2 1 1 1 1 1 1.
- **Bonus tokens (18)**, each stack shuffled, face down: 3-card 3 3 2 2 2 1 1 · 4-card 6 6 5 5 4 4 · 5-card 10 10 9 8 8. **Camel token** 5. **3 Seals**.
- **Setup**: 3 camels in the market, shuffle the rest, deal 5 each, 2 more to the market, camels from hands go to herds.
- **Turn**: take *or* sell. Take 1 good (refill); exchange 2+ goods for the same number of hand cards/camels (no same type both ways, never camels from the market, no refill); take **all** camels (refill).
- **Hand limit 7** at end of turn; camels don't count.
- **Sell** one type; tokens from the top; diamonds/gold/silver need 2+ cards even if one token is left; bonus for 3/4/5+ cards, still granted when goods tokens ran short.
- **Round end**: immediately when 3 goods token stacks are empty, or when the deck can't refill the market (an exact refill that empties the deck does not end it yet).
- **Scoring**: most camels takes the camel token, tie → nobody. Richest wins a seal; tie → more bonus tokens; still tied → more goods tokens.
- **Next round**: full re-setup, the round's loser starts. **Win**: first to 2 seals.

Implementation decisions where the rulebook is silent or physical:

- A perfect tie after every tie-break awards **no seal**; the other player starts the next round.
- Round 1's starting player is random; in a rematch the previous loser starts.
- The rulebook says players need not reveal their camel count, so opponents see only "a few / a herd / a caravan".
- A bonus stack that runs empty simply awards nothing further (practically unreachable).

## Tests

`npm test` covers deck composition, setup, token stacks, taking goods/camels, exchanges (every illegal variant), hand limit, selling and minimum sales, bonus tokens, token depletion, both round-end conditions, camel scoring, all tie-breaks, seals, next-round starter, game end, rematch, turn enforcement, malformed input, hidden-information projection, 300 random complete games with conservation invariants, unique room codes, exact-room joining, full/invalid rooms, two simultaneous independent rooms, disconnect/reconnect with seat tokens, leaving, and the ready-to-continue flow.


## Android application

This repository includes the Android/Capacitor preparation needed to package the same web game as a native Android app without moving the authoritative game server out of Cloudflare.

### First-time Android setup

1. Install Node.js 22+ and Android Studio with an Android SDK.
2. Create a local file named `client/.env.mobile` from `client/.env.mobile.example`.
3. Set `VITE_GAME_ORIGIN` to the public HTTPS origin of the live Cloudflare game, for example `https://game.example.com`.
4. Run:

```bash
npm install
npm run android:setup
```

The setup script installs Capacitor 8.5.2 and creates the `android/` project.

### Build/sync the Android app

```bash
npm run android:sync
```

Then open Android Studio:

```bash
npx cap open android
```

Or run directly on a connected Android device:

```bash
npm run android:run
```

The Android build loads the bundled web client locally while its WebSocket connection points to the public Cloudflare `/ws` endpoint. The production website remains unchanged.

### Important

Do not commit `client/.env.mobile`, Android build output, or release keystores. The checked-in `client/.env.mobile.example` is only a template.
