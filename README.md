<p align="center"><b>English</b> · <a href="README.zh-CN.md">简体中文</a></p>

<p align="center">
  <a href="https://classic-cluedo-party-game.onrender.com"><img src="media/teaser.gif" alt="Who Killed the Guest? on the TV: turns, an accusation and the verdict" width="640"></a>
</p>

<h1 align="center">Who Killed the Guest?</h1>
<p align="center"><b>谁杀了客人？</b> · a Chinese New Year Cluedo for phones and a TV</p>
<p align="center"><i>“I know every one of your secrets.” Nobody is smiling now.</i></p>

<p align="center">
  <a href="https://classic-cluedo-party-game.onrender.com"><img src="https://img.shields.io/badge/%E2%96%B6%20Play%20now-in%20your%20browser-e8513f?style=for-the-badge" alt="Play now in your browser"></a>
  &nbsp;
  <a href="https://classic-cluedo-party-game.onrender.com/homepage/"><img src="https://img.shields.io/badge/Visit-the%20homepage-c9a24a?style=for-the-badge" alt="Visit the homepage"></a>
  &nbsp;
  <a href="docs/DESIGN.md"><img src="https://img.shields.io/badge/How%20it's-built-2b2f3a?style=for-the-badge" alt="How it's built"></a>
</p>
<p align="center"><sub>The server sleeps when idle: the first visit can take about a minute to wake it.</sub></p>

On the first night of Chinese New Year, a guest nobody recognises comes to dinner, and someone at the table kills him. Work out who, where and with what.
3 to 6 players join from their phones with a 4-digit code or a QR code; bots fill any empty seats. An optional TV shows the board, the turns and the big moments, never anyone's cards.
Every board is a theme pack, so a new mystery is a new folder of art and data, not new code.

<table>
  <tr>
    <td width="33%"><img src="media/screenshots/01-lobby.png" alt="Lobby: pick your character, fill with bots"></td>
    <td width="33%"><img src="media/screenshots/02-board.png" alt="Your turn: roll and move around the house"></td>
    <td width="33%"><img src="media/screenshots/03-reveal.png" alt="A wrong accusation shows the answer to the accuser only"></td>
  </tr>
  <tr>
    <td colspan="3"><img src="media/screenshots/04-tv-turn.png" alt="The TV: whose turn it is, for the whole room"></td>
  </tr>
  <tr>
    <td colspan="3"><img src="media/screenshots/05-tv-accuse.png" alt="The TV: an accusation and its verdict, never the guess"></td>
  </tr>
</table>

## How to play

| | |
|---|---|
| **Gather** | The host opens the game and creates a room. Everyone else joins with the 4-digit code or the share link. Put `/tv?code=1234` on a big screen if you have one. |
| **Your turn** | Roll the die and move through the house. Entering a room ends your move. |
| **Suggest** | In a room, name a suspect, that room and an object. The first player clockwise who holds one of those cards shows you one, privately. |
| **Accuse** | Once per game, on your turn. Right: you win. Wrong: you become a ghost, and still show cards to the others. |
| **Keep notes** | The Notes tab tracks what you've seen. Each turn has a timer. |

---

# For developers

## Folders

```
classic-cluedo-party-game/
├─ apps/
│  ├─ client/              React + TS + Vite (phone UI and /tv)
│  └─ server/              Node + Socket.IO (rooms, game, bots, timers, static /themes)
├─ packages/
│  ├─ engine/              pure rules: no I/O, no theme strings, no Socket.IO
│  ├─ protocol/            event names + zod schemas shared by client and server
│  └─ theme-sdk/           theme-pack types, schema, validator, board-graph compiler, CLI
├─ themes/
│  ├─ cny-guest/           the first theme pack (Who Killed the Guest?); its homepage/ is served at /homepage
│  └─ _fixtures/tiny-manor a 7×7 test board that proves the code is theme-agnostic
├─ e2e/smoke.mjs           a whole game in real Chrome (and the README screenshots)
├─ docs/
│  ├─ DESIGN.md            goals, rules, architecture, protocol, theme packs, engine, phases
│  └─ architecture/        C4 model.json + architecture.html
├─ media/                  teaser and screenshots for this README
├─ tools/                  art export, dev helpers
├─ prototype/              the design handoff (read-only reference)
├─ CLAUDE.md               rules for working on the code (start here)
├─ LICENSE                 MIT, for the code
└─ NOTICE                  the art, story and media: all rights reserved
```

## Run, test, deploy

Needs Node 22+ and pnpm 9.

```bash
pnpm install
pnpm dev                      # game server on :3001 + client on :5173 (reachable on your LAN)
pnpm test                     # every package: theme-sdk, engine, server (real sockets), client (jsdom)
pnpm typecheck
pnpm theme:check cny-guest    # validate a theme pack, exactly as the server does at boot
pnpm e2e                      # build the client and play a game in real Chrome
E2E_SHOTS=/tmp/shots pnpm e2e # the same, saving screenshots and a TV video
```

- **Phones:** `http://<your-ip>:5173`. **TV:** `http://<your-ip>:5173/tv?code=1234`, or scan its QR code.
- **Production:** `pnpm --filter @cluedo/client build`, then `pnpm --filter @cluedo/server start` serves everything on one port (`PORT`, default 3001).
- **Deploy:** [`render.yaml`](render.yaml) deploys `master` to Render's free plan after [CI](.github/workflows/ci.yml) passes. Rooms live in memory, so a deploy ends live games: work on branches and merge when nobody is playing. `E2E_URL=https://… node e2e/smoke.mjs` checks a deploy. Full walkthrough: [docs/DESIGN.md](docs/DESIGN.md#deploy-on-render-free-no-card).

Code: MIT. The art, story and media: all rights reserved. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

How it all fits together: [docs/DESIGN.md](docs/DESIGN.md) and the C4 diagram in [docs/architecture/architecture.html](docs/architecture/architecture.html).
