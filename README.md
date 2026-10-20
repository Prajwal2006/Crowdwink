# Crowdwink

**Know your people. Beat the crowd.**

Crowdwink is a free multiplayer party game for 2–8 friends. Each round everyone answers a two-option question in secret, then predicts which option most of the room picked. Guess the majority, score a point. No accounts, no ads, no AI: just a link and your friends.

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS 4** + **shadcn/ui** components
- **Neon PostgreSQL** + **Drizzle ORM** (schema and SQL migrations in `drizzle/`)
- **Pusher Channels** for real-time sync (without it: Server-Sent Events on a single server and in local dev, short polling on Vercel)
- 169 hand-written questions across 10 categories, stored in `src/data/questions/`

---

## How it works

| Phase | What happens |
| --- | --- |
| Countdown | 3-second "get ready" with the round number and category. |
| Vote | Everyone secretly picks A or B. Others see *that* you voted, never *what*. |
| Predict | Pick which option most of the room chose. Your own vote counts. |
| Reveal | When everyone is done (or the 60s timer ends, or the host reveals early), results flip for everyone at once. |
| Leaderboard | Rankings, points, accuracy and rank changes. The host starts the next round. |
| Final | Winner celebration, podium, closest rivals, shareable results card (PNG), rematch. |

**Modes:** the host picks one when creating the room (and can switch it in the lobby between games).

- **Read the room** (default): predict the option *most* of the room picked.
- **Underdog**: predict the option *fewer* people picked.

The mode is stored in `rooms.settings.mode` (rooms created before modes existed play "Read the room"). Rounds always record the majority option as `round_results.winner`; `scoringOption()` in `src/lib/game/scoring.ts` flips it for Underdog mode.

**Scoring:** +1 for correctly predicting the majority (or the minority in Underdog mode), 0 otherwise. An exact tie means nobody scores that round. Accuracy = correct predictions ÷ predictions made in rounds that had a majority. Standings are by total points; equal points share a rank.

All scoring happens on the server inside a database transaction. Clients only ever send "I vote A" or "I predict B".

---

## Quick start (local)

Requirements: Node.js 20.9+ and a Postgres database (a free Neon project, or local Postgres).

```bash
npm install
cp .env.example .env.local   # Next.js reads this
cp .env.example .env         # drizzle-kit and scripts read this
# edit both: set DATABASE_URL (Pusher vars can stay empty locally)
npm run db:migrate           # apply migrations in ./drizzle
npm run dev                  # http://localhost:3000
```

With the Pusher variables empty, real-time updates use the built-in SSE channel, which works with `npm run dev` and with `npm run start` on a single server.

> Local Postgres instead of Neon? Any `postgres://` URL works. The app uses the Neon serverless driver for `*.neon.tech` hosts and `node-postgres` for everything else (override with `DATABASE_DRIVER=neon|pg`).

### Testing multiplayer on one machine

Each **browser tab** is its own player: identity is kept per tab (sessionStorage), so one browser can seat several players.

1. Open `http://localhost:3000`, create a room. You're the host.
2. Copy the invite link (lobby → **Copy link**) and open it in a second tab, a private window, or another browser. Pick a different nickname.
3. Repeat for more players (up to 8). Start the game from the host tab.
4. Phones on the same Wi-Fi: run `DEV_ALLOWED_ORIGINS=<your-computer-ip> npm run dev -- -H 0.0.0.0` (Next.js blocks dev assets for unknown hostnames otherwise), or `npm run build && npm run start -- -H 0.0.0.0`. Open `http://<your-computer-ip>:3000` on the host device so the lobby's link and QR code use that address, then scan the QR code from the phones.

Refreshing a tab keeps your seat. If you close a tab and reopen the link, the join screen offers **Continue as &lt;name&gt;**; choose "join as someone new" to add another player instead.

### Automated checks

```bash
npm run lint
npm run typecheck
npm test                         # unit tests: scoring, question bank, codes, validation
npm run build

# End-to-end: 3 headless browsers create, join, play a full game, rematch, leave.
npm run dev                      # in one terminal
node tests/e2e/multiplayer.mjs   # in another (needs a Chromium: set CHROMIUM_PATH, or `npx playwright install chromium`)
```

To exercise the Pusher code path without a Pusher account, run `node tests/e2e/mock-pusher-server.mjs` and put the variables printed at the top of that file into `.env.local` (put `NEXT_PUBLIC_*` variables in `.env.local` rather than the shell; Next's dev server can get stuck in a reload loop when they come from the shell).

---

## Configuration

All configuration is via environment variables. See [`.env.example`](.env.example).

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Neon **pooled** connection string. Server-only. |
| `DATABASE_URL_UNPOOLED` | no | Direct connection for `drizzle-kit migrate`. Falls back to `DATABASE_URL`. |
| `PUSHER_APP_ID`, `PUSHER_SECRET` | prod | Pusher Channels server credentials. Server-only. |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | prod | Public Pusher key and cluster (safe in the browser). |
| `PUSHER_HOST/PORT/USE_TLS`, `NEXT_PUBLIC_PUSHER_HOST/PORT/USE_TLS` | no | Only for self-hosted Pusher-compatible servers such as Soketi. |
| `CRON_SECRET` | prod | Protects `/api/cron/cleanup`. Vercel Cron sends it automatically. |
| `RATE_LIMIT_SALT` | recommended | Salt for hashing IPs in the rate-limit table. |
| `NEXT_PUBLIC_APP_URL` | no | Fallback base URL for invite links. |
| `NEXT_PUBLIC_REALTIME` | no | Force the real-time transport: `pusher`, `sse` or `poll`. Default: Pusher if configured, else `poll` on Vercel, `sse` elsewhere. |
| `SKIP_DB_MIGRATIONS` | no | `1` stops the Vercel build from running `drizzle-kit migrate`. |

No secret is exposed to the browser: the database URL and Pusher secret are only read in server code (`src/db`, `src/lib/server`). Only `NEXT_PUBLIC_*` values reach the client.

### Neon setup

1. Create a project at [neon.tech](https://neon.tech) (the free tier is plenty).
2. In **Connection details**, copy the **pooled** string into `DATABASE_URL`, and the direct (unpooled) one into `DATABASE_URL_UNPOOLED`.
3. Run `npm run db:migrate`. Migrations are plain SQL in `drizzle/`; the app never changes the schema at runtime.
4. After editing `src/db/schema.ts`, run `npm run db:generate` to create a new migration, then `npm run db:migrate`.

### Real-time setup (Pusher Channels)

Neon stores everything; Pusher only delivers "room changed" pings.

1. Create a free **Channels** app at [dashboard.pusher.com](https://dashboard.pusher.com).
2. Copy **app_id**, **key**, **secret** and **cluster** into `PUSHER_APP_ID`, `NEXT_PUBLIC_PUSHER_KEY`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_CLUSTER`.
3. No other dashboard settings are needed. Crowdwink uses presence channels (`presence-room-<CODE>`) authorized by `/api/realtime/auth`, which checks the player's room membership.

Self-hosting instead? [Soketi](https://soketi.app) speaks the same protocol. Point `PUSHER_HOST`/`PORT` (server) and `NEXT_PUBLIC_PUSHER_HOST`/`PORT` (browser) at it.

---

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: Next.js; `vercel.json` sets it).
2. Database: add the **Neon** integration from the Vercel Marketplace (it sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you), or paste your own Neon strings into the project's environment variables.
3. Add `CRON_SECRET` and `RATE_LIMIT_SALT` (any long random strings). Optionally add the four Pusher variables.
4. Deploy. The build command (`npm run vercel-build`) applies pending migrations from `drizzle/` before `next build`, so there is no manual migration step. Set `SKIP_DB_MIGRATIONS=1` for an environment that shouldn't migrate (for example previews that share the production database).
5. `vercel.json` registers a daily cron for `/api/cron/cleanup`; Vercel sends `CRON_SECRET` automatically.

**Real-time on Vercel.** With Pusher configured, updates are pushed instantly over WebSockets. Without Pusher, a Vercel build automatically switches to **polling**: each client checks a tiny `/api/rooms/:code/version` endpoint every 1.5s (10s while the tab is hidden) and fetches full state only when it changes. That works out of the box with just Neon, at the cost of slightly slower updates and more function invocations, so Pusher is still recommended for busy deployments. Override the choice with `NEXT_PUBLIC_REALTIME=pusher|sse|poll`. Changing Pusher or `NEXT_PUBLIC_*` variables requires a redeploy, since they're baked in at build time.

Keep your Vercel function region close to your Neon region (Project → Settings → Functions) for snappier rounds.

Other hosts: any Node.js host works. On a **single** long-running server (Fly, Railway, Render, a VPS) you can skip Pusher and use the SSE fallback; with multiple instances, configure Pusher.

---

## Architecture

```
Browser                         Next.js route handlers                  Neon Postgres
───────                         ──────────────────────                  ─────────────
POST /api/rooms           ──▶   create room + host player     ──▶      rooms, players
POST /api/rooms/:code/join ─▶   seat a player (lock room row) ──▶      players
POST /api/rooms/:code/action ▶  validate → mutate in a TX     ──▶      votes, predictions, rounds,
                                bump room.version                       round_results, game_summaries
                                     │
                                     └──▶ Pusher (or SSE): "sync v=N" ──▶ every client in the room
GET  /api/rooms/:code/state ◀── client refetches its own view (votes hidden until reveal)
```

- **Server-authoritative.** Every action runs in a transaction that locks the room row (`SELECT … FOR UPDATE`), checks membership, host rights and phase, then bumps `rooms.version`.
- **Realtime messages carry no game data**, only a version number. Each client then fetches its personal view, so votes and predictions are never broadcast before the reveal.
- **Exactly-once scoring.** `finalizeRound` locks the round row and only scores rounds still in `answering`; `round_results.round_id` is a primary key as a second guard. Concurrent reveal requests can't double-award points.
- **One vote / one prediction per player per round**, enforced by composite primary keys on `votes` and `predictions`. Inserts use `ON CONFLICT DO NOTHING`, so changing an answer is impossible.
- **Recovery.** Clients refetch on reconnect, on tab focus, and when a 20-second heartbeat reports a newer version. Timers are enforced lazily: the first request after a round's deadline closes it.
- **Disconnects.** Presence comes from the realtime channel. Players silent for 60s stop blocking a round from auto-advancing. If the host disappears for 90s, hosting passes to the longest-seated connected player. When the host leaves, it passes immediately.

### Identity

No accounts. Joining returns a random 256-bit token; only its SHA-256 hash is stored. The browser keeps `playerId.token` in sessionStorage (per tab) and localStorage (to offer "Continue as …") and sends it as a bearer token.

### Database schema (`src/db/schema.ts`)

| Table | Purpose |
| --- | --- |
| `rooms` | code (unique), host, settings JSON, status, game number (rematches), current round, version, timestamps |
| `players` | room membership, nickname (unique per room among active players), avatar, token hash, score, correct/predicted counts, ready, last seen, removal |
| `rounds` | room, game number, round number (unique together), question id, phase, start/deadline/reveal times |
| `votes` | (round, player) primary key, choice |
| `predictions` | (round, player) primary key, predicted majority |
| `round_results` | per-round tally, winner and leaderboard snapshot (for rank-change arrows) |
| `game_summaries` | final standings per completed game (powers the share card) |
| `rate_limits` | fixed-window counters keyed by hashed IP |

### Room expiry and cleanup

A room expires after **24 hours without activity**. Expired rooms reject all requests with a friendly "room expired" screen. Deletion runs from:

- `GET /api/cron/cleanup` (daily via Vercel Cron, `Authorization: Bearer $CRON_SECRET`), or
- `npm run db:cleanup` from any machine with `DATABASE_URL`.

Deleting a room cascades to its players, rounds, votes, predictions, results and summaries. Stale rate-limit rows are removed at the same time.

### Security notes

- All input is validated with Zod on the server (nicknames, room names, categories, rounds, actions). Unknown fields are dropped; there is no endpoint that accepts scores.
- Room codes: 6 characters from a 31-symbol alphabet via `crypto.randomInt` (~887M combinations), with lookup and join rate limits to stop guessing.
- Rate limits (per hashed IP): 15 room creations / 10 min, 40 joins / 10 min, 120 room lookups / 10 min. Stored in Postgres so they hold across serverless instances. Set `DISABLE_RATE_LIMIT=1` to turn them off in development.
- Host-only actions (settings, start, kick, reveal, next, rematch) are checked on the server.

---

## Adding questions

Questions live in `src/data/questions/<category>.ts`:

```ts
["food-018", "Breakfast in bed or brunch out?", "Breakfast in bed", "Brunch out"],
```

- Ids must be unique and never reused or renumbered (old rounds reference them). Use the category prefix plus the next number.
- Keep options short (≤ 32 characters) and the question genuinely debatable, with no objectively correct answer.
- A new category: add its id to `CategoryId` in `types.ts`, an entry in `categories.ts`, a file, and spread it into `QUESTIONS` in `index.ts`. The game engine needs no changes.
- `npm test` checks ids, duplicates, option lengths and per-category counts.

---

## Project layout

```
drizzle/                 SQL migrations (generated by drizzle-kit)
src/app/                 pages (/, /create, /join, /r/[code]) and API route handlers
src/components/game/     lobby, question, reveal, leaderboard, final results, etc.
src/components/ui/       shadcn/ui-style primitives (button, input, dialog, sheet, badge…)
src/components/home/developer-story.tsx  "story behind it" section and "Made with 💛 by" credit
public/prajwal-nh.jpg    developer photo
src/data/questions/      the question bank
src/db/                  Drizzle schema and database client
src/lib/game/            pure game logic: scoring, ranking, codes, question picking
src/lib/server/          engine (mutations), views, auth, realtime, rate limiting, cleanup
src/lib/client/          API client, identity storage, realtime subscription, useRoom hook
tests/unit/              Vitest unit tests
tests/e2e/               Playwright multiplayer script and a mock Pusher server
```

## External services still to configure

- **Neon**: create a project, set `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`), run `npm run db:migrate`.
- **Pusher Channels**: create an app and set the four Pusher variables (required for Vercel or any multi-instance host).
- **Vercel**: add the env vars and `CRON_SECRET`; migrations run during the build and the cleanup cron is already declared in `vercel.json`.
