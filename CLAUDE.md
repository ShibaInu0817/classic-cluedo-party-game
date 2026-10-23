# CLAUDE.md: Who Killed the Guest? (CNY Cluedo)

An online Cluedo-style game: React + TypeScript (Vite) client, Node + Socket.IO server that holds the authoritative state. Read `docs/DESIGN.md` for the architecture, and `docs/architecture/architecture.html` for the C4 diagram, before changing structure.

## Rule #1: everything is a theme (customization)
The prototype contains the full game logic, but **this codebase must stay theme-agnostic**. The CNY family dinner is only the first theme pack. Design every change so that another Cluedo board can be added by **only providing a list of assets plus a data manifest** under `themes/<id>/`, with no code changes.

- **No theme content in code.** No suspect, room or object names, colours, glyphs, story text, award or sticker labels, tutorial copy, sounds or art paths in `packages/engine`, `apps/server` or `apps/client`. They live in `themes/<id>/theme.json`, `themes/<id>/i18n/*.json` and `themes/<id>/assets/`.
- **The engine sees ids only:** card ids, suspect start cells, the compiled board graph and `rules`. It never branches on a theme id or a card id.
- **No hardcoded counts or geometry.** Not 6 suspects, 8 rooms, 6 objects, 20 cards, an 11×11 grid, 60 s or a d6. Read them from the pack (`deck`, `board`, `rules`) with defaults in `theme-sdk`.
- **The board is data.** `board.map` + `legend` + `doors` + `secretPassages` are compiled by `packages/theme-sdk` into `ADJ`, `DOORS`, `DR` and `nodeXY`. Never hand-write a graph for one board.
- **Visuals come through tokens and ids:**
  - Colours and fonts are CSS variables from `theme.ui.tokens`.
  - Art comes from `AssetResolver(id)`.
  - Copy comes from `t(key)`.
- **One room, one theme.** A room pins `themeId` at creation. Pass the compiled theme into `initGame(theme, seed)`; never use a global "current board".
- **Validate.** Any new manifest field needs a zod schema entry, a default and a `theme:check` rule. A pack that fails validation must stop the server at boot.
- **A pack may ship a homepage.** An optional `themes/<id>/homepage/` (a static marketing page) is served at `/homepage` from the first pack that has one. Its copy and art live only there.
- **Before you finish a change, ask:** "Could someone ship a haunted-mansion board without touching this file?" If not, move the content into the pack.

The reference for this split is `../3D Monopoly board setup` (`game/data.js` `BOARDS` registry and `setBoard`, `game/engine.js`).
- **Copy:** the registry, optional fields with defaults, and branching on structural `kind` only.
- **Don't repeat its pitfalls:**
  - Menus hardcoded in HTML per board.
  - `if/else` on theme names (`centre`).
  - A fixed board size and magic tile indexes.
  - Default board ids in save keys or topics.
  - No data validation.
  - Mutable global board exports.

## Server authority and privacy
- Clients send **intents** only (`packages/protocol` zod schemas). The server validates the turn, stage and seat on every intent and runs it through the pure engine.
- The deck, the envelope and the RNG seed never leave the server, except the envelope to a wrong accuser.
- `Projection` builds public state from an **allow-list**. The TV socket only receives public data, never a hand, a shown card or the envelope.
- Bots use the same intent path as humans.

## Prototype
`prototype/design_handoff_who_killed_the_guest/` is the reference for **behaviour and visuals**: high fidelity, so match colours, type, copy and motion. It is not code to copy as-is:
- Its fixed `SOLUTION` and `DEAL` and its scripted bots must not be ported. Deal from a seeded RNG instead.
- Its CNY constants (`SEAT_ORDER`, `NAMES`, `CH`, `ROOM_EN`, `SECRET`, `STARTS`, `STK`, awards, `TUT`, story) belong in `themes/cny-guest/`.

## Commands
`pnpm dev` (server :3001 + client :5173) · `pnpm test` · `pnpm typecheck` · `pnpm e2e` (real Chrome) · `pnpm theme:check <id>` · `pnpm export:art`.

## Testing conventions
- Work test-first, one behaviour at a time. Test through public seams only:
  - theme-sdk: `loadThemePack(dir)`.
  - engine: `createGame`, `applyIntent`, `publicView`, `privateView`.
  - server: real `socket.io-client` sockets against `createGameServer` on port 0.
  - client: components rendered with `FakeSocket`. The socket is the only thing mocked.
- Rule tests run on `themes/_fixtures/tiny-manor` (7×7, 3 of each card). If a change only works on the CNY board, it breaks rule #1.
- Hands are random, so tests pick seeds through the public API; for example `tinySeed` uses the engine as an oracle. Never poke internal state to set up a scenario.
- Any change that touches who receives what must keep the TV leak test green (`apps/server/test/accuse.test.ts`).
- Server tests that wait for a later state must pass `client.mark()` as `from`. Otherwise an older matching message satisfies the wait.
- Your own sheets always sit above shared overlays (moment, dice, pause). Keep to the layering order in `docs/DESIGN.md` (§9) when adding an overlay.
- Zustand selectors must return stable values (`useGame((s) => s.fn)`). A new object or array in a selector loops React.

## Status and what's next
P0–P6 are done (see the delivery phases in `docs/DESIGN.md`). What remains needs a design or spec before building:
- Pixel-matching the handoff.
- CNY event cards, and player profiles and levels (profiles need persistence).
- Sound files for the CNY pack.

Don't invent rules for event cards; ask.

## Deployment
`master` deploys to Render (free plan, `render.yaml`) automatically after CI passes. A deploy restarts the server and **ends every live game** (rooms are in memory). Work on branches, and merge when nobody is playing. Keep `/healthz` cheap: Render polls it.

## Docs stay in sync
When containers, components, socket events or flows change, update `docs/architecture/model.json` and rebuild with the `draw-c4` skill (`plot.py check` then `plot.py build model.json architecture.html`). Keep the protocol tables and theme schema in `docs/DESIGN.md` matching the code.
