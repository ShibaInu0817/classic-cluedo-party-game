# Classic Cluedo Party Game

A themeable online Cluedo for phones and a TV. Every board is a theme pack under `themes/`. The first one is **谁杀了客人？ Who Killed the Guest?**, a Chinese New Year family dinner.

It is mobile-first: 3–6 players join a room from their phones, and an optional TV acts as a spectator screen that shows public information only.

> **Status: P1–P5 built, plus most of P6.** A whole game works end to end on phones and a TV:
> - **Before play:** lobby, then the intro (story, setup, private card check).
> - **Play:** turns with deducing bots, the turn clock and pause.
> - **After:** reveal, results with awards, and the rematch vote.
> - **Robustness:** reconnect, host hand-over, kicking a player, idle-room cleanup.
>
> The layouts are simpler than the handoff's pixel design. See [section 12](#12-delivery-phases) for what is left. The behaviour and visual reference is the design handoff in [`prototype/design_handoff_who_killed_the_guest/`](prototype/design_handoff_who_killed_the_guest/README.md).

## Running it

Needs Node 22+ and pnpm 9.

```bash
pnpm install
pnpm dev                      # game server on :3001 + Vite client on :5173 (proxied, reachable on your LAN)
pnpm test                     # every package: theme-sdk, engine, server (real sockets), client (jsdom)
pnpm typecheck
pnpm theme:check cny-guest    # validate a theme pack, exactly as the server does at boot
pnpm export:art               # re-export the CNY art from the prototype's game-art.js
pnpm e2e                      # build the client and play a game in real Chrome (lobby → intro → turn → accusation)
```

- **Phones:** open `http://<your-ip>:5173`. The host creates a room; others join with the 4-digit code or the `?code=` link.
- **TV:** open `http://<your-ip>:5173/tv?code=1234`, or scan the QR code it shows.
- **Production:** run `pnpm --filter @cluedo/client build`, then `pnpm --filter @cluedo/server start`. The server then serves the built client, the theme packs and Socket.IO on one port (`PORT`, default 3001). `BOT_DELAY_MS` (default 900) sets how quickly bots act.
- **Docker:** `docker build -t classic-cluedo-party-game . && docker run -p 3001:3001 classic-cluedo-party-game`. Run a single instance, because rooms live in memory.

---

## Contents
0. [Running it](#running-it)
1. [Goals](#1-goals)
2. [Game rules (summary)](#2-game-rules-summary)
3. [Architecture (C4)](#3-architecture-c4)
4. [Repository layout](#4-repository-layout)
5. [Server authority, state and protocol](#5-server-authority-state-and-protocol)
6. [Theme packs: making a new board](#6-theme-packs-making-a-new-board)
7. [Engine design](#7-engine-design)
8. [Bots and timers](#8-bots-and-timers)
9. [Client design](#9-client-design)
10. [Internationalisation](#10-internationalisation)
11. [From prototype to production](#11-from-prototype-to-production)
12. [Delivery phases](#12-delivery-phases)
13. [Open questions](#13-open-questions)

---

## 1. Goals

- **Recreate the handoff faithfully.** Colours, type, copy, motion, and the phone and TV screens are high fidelity and final.
- **Server-authoritative multiplayer.** Clients send *intents*; a single Node + Socket.IO server owns the deck, the envelope, turns, bots and timers.
- **Theme-agnostic engine.** "CNY family dinner" is the first *theme pack*, not something the code knows about. A different Cluedo-style board, such as a haunted mansion, an office party or a pirate ship, needs **only a new folder under `themes/`**: assets plus a manifest. It needs no engine, server or client changes.
- **The TV never leaks.** The spectator view is built from a public projection that private data cannot get into.

## 2. Game rules (summary)

The handoff README is the full spec, and these rules come from it. The CNY numbers in brackets are what the first theme pack provides; the engine reads every count from the pack.

| Rule | Detail |
|---|---|
| Deck | Suspects (6), rooms (8) and objects (6), 20 cards in total. One card from each category goes into the envelope at random. The rest are dealt round-robin to all seats. |
| Players | Each seat *is* one of the suspects, and their own character can still be the killer. Empty seats are bots. |
| Turn | Roll 1 die (d6). Move up to N steps on corridor squares (4-neighbour). Entering a room costs 1 step and ends movement. You can't end in the room you started in. A secret passage can replace the roll. If a roll leaves nowhere to go (a room reachable only by passage), the move simply ends. |
| Suggest | In a room you must suggest a suspect, this room and an object. The named suspect's token moves into the room. |
| Disprove | Seats are asked **clockwise**. The first one holding any of the 3 cards **chooses** one to show the suggester privately. Everyone else only sees who showed a card to whom. |
| Accuse | Only on your own turn, and only once (`rules.accusationsPerPlayer`; with more, a wrong guess just ends your turn until you run out). Right means you win. Wrong makes you a **ghost**: grey token, turns skipped, no moving, suggesting or accusing, but you still show cards. The accuser sees the envelope privately; the TV only says "wrong accusation". |
| Timer | Each turn has a limit (60 s); on timeout the turn ends automatically. |

## 3. Architecture (C4)

Open **[`docs/architecture/architecture.html`](docs/architecture/architecture.html)** in a browser. It is a single self-contained file:
- Double-click a box marked ⤢ to drill down; Esc goes back up.
- Hover a box to trace its lines.
- Use the left rail to play the runtime flows step by step.

The source is [`docs/architecture/model.json`](docs/architecture/model.json). Edit it and rebuild with the `draw-c4` skill (`plot.py build model.json architecture.html`) whenever the architecture changes.

### Level 1: context
| Element | Kind | Notes |
|---|---|---|
| Player | person | Phone, 390×844. Sees only their own hand, the cards shown to them, and the envelope if they accuse wrongly. |
| Host | person | A player who creates the room, fills bots and starts the game (3+ players). |
| Living-room audience | person | Watches the TV in "TV + phones" mode. |
| Theme author | person | Adds `themes/<id>/` and runs `theme:check`. Writes no code. |
| Google Fonts | external | Fonts named by the active theme's tokens. |

### Level 2: containers
| Container | Tech | Responsibility |
|---|---|---|
| **Phone client** | React + TS, Vite, zustand | All screens. Renders the public state merged with this seat's private messages. |
| **TV view** | Same SPA, `/tv` route | Spectator socket. Receives the **public projection only**. |
| **Game server** | Node, Socket.IO, single process | The authority for rooms, deck, envelope, turns, bots and timers. Validates every intent. |
| **Room store** | In-memory `Map<code, Room>` | All live rooms, keyed by 4-digit code. Volatile in v1. |
| **Theme packs** | `themes/<id>/` (JSON + SVG/PNG) | Validated at server boot and served as static files. |
| **theme:check CLI** | Node + `theme-sdk` | The same validator, for theme authors. |

### Level 3: game server components
| Component | Responsibility |
|---|---|
| `SocketGateway` | Validates inbound events with the zod schemas from `packages/protocol`. It is the only code that knows socket ids; everything behind it uses seat ids. |
| `RoomManager` | Creates rooms, issues codes and binds sockets to seats. Pins `themeId` when the room is created. |
| `LobbyService` | `pickChar` (one owner per suspect), `fillBots`, `start` (≥ `meta.players.min`). |
| `GameController` | The orchestrator, one per room. It is the **only writer** of game state. Each intent goes through the engine, then the timer is re-armed, bots are scheduled and projection runs. |
| `GameEngine` | `packages/engine`. Pure rules, seeded RNG, ids only. |
| `TurnTimer` | One deadline per room (`rules.turnSeconds`). On timeout it calls `endTurn`. It applies to bots too. |
| `BotRunner` | Plays empty seats. Its intents go through the same validation as human ones. |
| `Projection` | Builds the public diff, the per-seat private messages and the TV view. |
| `ThemeRegistry` | `packages/theme-sdk`. Loads, validates and compiles packs (board graph). |

### Level 3: client components
| Component | Responsibility |
|---|---|
| `Router` | Picks the phone or TV shell, then the screen by `room.phase`. |
| `Screens` | Lang · Home · Settings · Create · Lobby · Story · Setup · Tutorial · Play · Reveal · End, plus the TV variants. |
| `Overlays` | Dice, suggestion / show / accuse sheets, the suggestion moment, the YOUR TURN ribbon, reactions. |
| `GameStore` | zustand: the public state, this seat's private data, local settings and notes. |
| `SocketClient` | Typed emit and listen over `packages/protocol`. Writes into the store. |
| `ThemeProvider` | Loads `theme.json` and `i18n/<lang>.json`, writes ui tokens as CSS variables, provides `t(key)`. |
| `AssetResolver` | Maps a card, token or scene id to a file URL in the active pack. |

### Flows in the diagram
1. **Open a room and start** (containers). Create, pin the theme, store the room, share the code or QR, join, pick a character, start, and the TV shows the seat cards.
2. **Suggest and disprove** (server). Validate, resolve the clockwise holder, the private `game:showRequest`, `showCard`, then the private reveal versus the public "A showed B".
3. **Wrong accusation → ghost** (server). The envelope goes privately to the accuser; the TV announces without the guess.
4. **Turn timeout → bot turn** (server). The timer fires, the turn advances (skipping ghosts), and the bot plays through the same intent path.
5. **Roll and move on a phone** (client). Roll intent, then `room:state` carrying the dice and `reach` (computed by the server), the store, the highlighted squares, then `move(node)`.

## 4. Repository layout

The repo is a pnpm workspace:

```
classic-cluedo-party-game/
├─ apps/
│  ├─ client/              React + TS + Vite (phone UI and /tv)
│  └─ server/              Node + Socket.IO (rooms, game, bots, timers, static /themes)
├─ packages/
│  ├─ engine/              Pure rules. No I/O, no theme strings, no Socket.IO
│  ├─ protocol/            Event names + zod schemas shared by client and server
│  └─ theme-sdk/           ThemePack types, zod schema, validator, board-graph compiler, CLI
├─ themes/
│  ├─ cny-guest/           First theme pack (谁杀了客人？)
│  └─ _fixtures/tiny-manor 7×7 test board with 3 of each card. Tests prove the code is theme-agnostic with it
├─ tools/                  export-cny-art.mjs (prototype art → SVG files), addtest.py (dev helper)
├─ prototype/              Design handoff. Read-only reference
└─ docs/architecture/      C4 model.json + architecture.html
```

Dependency direction:
- `client` and `server` → `protocol`, `theme-sdk`.
- `server` → `engine` → `theme-sdk` (types and compiled board only).
- `engine` never imports `server`, `client` or anything under `themes/`.

## 5. Server authority, state and protocol

### State (server-side)
The types are in the code. These are the main ones:
- `Room` ([apps/server/src/rooms.ts](apps/server/src/rooms.ts)): `code`, `name`, the compiled `theme` (pinned at creation), `mode`, `maxPlayers`, `bots`, `phase: 'lobby' | 'intro' | 'play' | 'end'`, `seats[] { name, characterId?, isBot, socketId?, token? }`, `game?`, `deadline?`, `paused?`, `ready?` (intro), `votes?` (end), `gameNo`, `log` (recent), `history` (whole game), `suggestions` and `watchers` (TV sockets).
- **Phases:**
  - `lobby` → `intro`: Start deals the cards. Each phone reads the story, sees its character and cards, then sends Ready; bots are always ready, and the host can skip.
  - `intro` → `play`: the turn clock starts.
  - `play` → `end`: the game is won, or everyone has become a ghost.
  - `end` → `intro`: every human votes for a rematch, and the same seats are dealt a new game.
- **Host:** the first *connected* person. If the host drops or leaves, the role passes on.
- **Seat token:** a secret per seat, used to resume. It is never broadcast.
- **One owner per seat:** every action checks that the socket still owns its seat, so a retired tab or a renumbered seat cannot act for someone else.
- **One room per connection:** joining, creating or watching a room leaves the previous one.
- `GameState` ([packages/engine/src/types.ts](packages/engine/src/types.ts)):
  - `seats[]` (seat → character), `hands` (**private**), `envelope` (**server only**) and `pos` (character → node, where a node is `"c,r"` or `"R:<roomId>"`).
  - `turn`, `stage: roll | move | suggest | disprove | end | over`, `round`, `dice` and `turnStart`.
  - `pending { by, trio, asked }`, `shown` (**private**, per seat), `out` (ghosts), `accusations`, `winner`, `stats { suspCount, showCount, reactCount }`, and the RNG state.
- `PublicGame` ([packages/engine/src/views.ts](packages/engine/src/views.ts)) is everything a player or the TV may see. It is built field by field, and `answer` appears only once the game is over.

Private per seat: `hand`, `shown[{card, from}]`, and `envelope` (only after a wrong accusation). Notes marks stay on the device (localStorage).

### Client → server
Every event is emitted with an ack and answered with `{ ok: true, … }` or `{ ok: false, error }`. Payloads are checked against the zod schemas in [packages/protocol/src/index.ts](packages/protocol/src/index.ts).

| Event | Payload | Allowed when |
|---|---|---|
| `room:create` | `{ name, maxPlayers, mode, bots, themeId, playerName }` | always. The ack carries `{ code, seat: 0 }` |
| `room:join` | `{ code, playerName }` | phase `lobby`, a seat is free. The ack carries `{ seat }` |
| `room:watch` | `{ code }` | TV, any phase, unless the room is phones-only. It gives no seat, so a TV can never act |
| `room:resume` | `{ code, token }` | after a refresh or a dropped connection. It re-binds the seat, re-sends its private state, and retires any older tab on that seat (`room:kicked`) |
| `room:leave` | `{}` | lobby: frees the seat, and later seats move up (each is told its new number by `room:you`). Mid-game: a bot takes over the seat |
| `lobby:pickChar` | `{ characterId }` | lobby, character not taken by another seat |
| `lobby:fillBots` | `{}` | host only. Bots get characters only at Start, after the people |
| `lobby:kick` | `{ seat }` | host only, lobby, not yourself |
| `lobby:start` | `{}` | host only. Fills empty seats with bots if the room's `bots` setting is on. Needs ≥ `players.min` |
| `intro:ready` / `intro:skip` | `{}` | intro. `skip` is host only |
| `game:pause` | `{ paused }` | host only, during play. The clock and bots stop, and the time left is restored on resume |
| `end:vote` | `{ rematch }` | end. The rematch starts when everyone still **connected** has voted yes |
| `game:intent` `{type:'roll'}` | – | your turn, stage `roll` |
| `game:intent` `{type:'move', node}` | – | your turn, stage `move`, node in `reach` |
| `game:intent` `{type:'secretPassage'}` | – | your turn, stage `roll`, in a room with a passage |
| `game:intent` `{type:'suggest', sus, obj}` | – | your turn, stage `suggest` (the room is where you stand) |
| `game:intent` `{type:'showCard', card}` | – | you are the asked seat, and the card is in your hand and matches |
| `game:intent` `{type:'accuse', sus, room, obj}` | – | your turn, not a ghost, accusations left |
| `game:intent` `{type:'endTurn'}` | – | your turn, stage `end` |
| `react` | `{ stickerId }` | in a game; at most 3 per 2 s per seat |

### Server → clients
| Message | To | Content |
|---|---|---|
| `room:state` | room channel (phones + TV) | The full public `RoomState`: seats, phase, `hostSeat`, public game, `reach`, `deadline`, `paused`, `ready`, `suggestions`, last 30 log events, and at the end `history` and `votes` |
| `game:events` | room channel | The public events as they happen. `cardShown` has no `card` field |
| `game:private` | one seat | `{ hand, shown, envelope? }`: after the deal, and after a wrong accusation |
| `game:showRequest` | asked seat | `{ by, cards }`: your matching cards for the current suggestion |
| `game:shown` | suggester | `{ card, from }` |
| `reaction` | room channel | `{ seat, stickerId }` |
| `room:you` | one socket | `{ seat }`: your seat number changed |
| `room:kicked` | one socket | the host removed you |

**The leak rule:** `publicView` builds the public state from an allow-list of fields, not by deleting private ones. A new field on `Game` stays private until someone adds it to the public allow-list on purpose. The TV socket only ever joins the public channel.

## 6. Theme packs: making a new board

This is the main customization point. A theme pack is **data plus files**. The engine sees only ids, and everything a person reads or looks at comes from the pack.

### 6.1 Folder
```
themes/<theme-id>/
├─ theme.json            Manifest (schema below)
├─ i18n/
│  ├─ zh.json            Every string key used by theme.json and the UI
│  └─ en.json
└─ assets/
   ├─ suspects/<id>.svg  Portrait art (card face + token crop)
   ├─ rooms/<id>.svg     Room scene (card + board tile)
   ├─ objects/<id>.svg
   ├─ victim.svg
   ├─ card-back.svg
   ├─ logo.svg
   ├─ board/background.svg   (optional, overrides the generated board)
   ├─ story/<chapter>/<n>.svg
   ├─ stickers/<id>.svg
   └─ sfx/<event>.mp3        (optional)
```
Any web image format works (SVG, PNG or WebP). Paths are relative to the pack folder. Art that contains text can use `{lang}` in its path (`assets/card-back.{lang}.svg`); the pack then ships one file per language, and validation checks every one exists. `AssetResolver` turns an id into a URL, so the pack can use any file names as long as the manifest points at them.

### 6.2 `theme.json` (annotated CNY example, abridged)
```jsonc
{
  "schemaVersion": 1,
  "meta": {
    "id": "cny-guest",
    "titleKey": "title",                       // 谁杀了客人？ / Who Killed the Guest?
    "languages": ["zh", "en"],
    "defaultLanguage": "zh",
    "players": { "min": 3, "max": 6 },
    "victim": { "nameKey": "victim.name", "art": "assets/victim.{lang}.svg" }   // {lang}: one file per language
  },

  "deck": {
    "suspects": [
      { "id": "S01", "nameKey": "sus.S01", "color": "#2E8A5E", "glyph": "叔",
        "art": "assets/suspects/S01.svg", "start": "10,3" },
      { "id": "S02", "nameKey": "sus.S02", "color": "#8A4FB0", "glyph": "姑",
        "art": "assets/suspects/S02.svg", "start": "0,7" }
      // … S03–S06
    ],
    "rooms": [
      { "id": "R01", "nameKey": "room.R01", "art": "assets/rooms/R01.svg" }   // 麻将房 Mahjong Room
      // … R02–R08
    ],
    "objects": [
      { "id": "O01", "nameKey": "obj.O01", "art": "assets/objects/O01.svg" }  // 六万 Mahjong Tile
      // … O02–O06
    ]
  },

  "board": {
    "grid": { "w": 11, "h": 11 },
    // One char per cell: '.' corridor, '#' wall/void, a room letter fills its rect,
    // 'E' envelope block. Doors are listed explicitly so non-mid-side doors are possible.
    "map": [
      "AAA.BBB.CCC",
      "AAA.BBB.CCC",
      "AAA.BBB.CCC",
      "...........",
      "DDD.EEE.FFF",
      "DDD.EEE.FFF",
      "DDD.EEE.FFF",
      "...........",
      "GGG.HHH.III",
      "GGG.HHH.III",
      "GGG.HHH.III"
    ],
    "legend": { "A": "R01", "B": "R02", "C": "R03", "D": "R04", "E": "@envelope",
                "F": "R05", "G": "R06", "H": "R07", "I": "R08" },
    "doors": [ { "room": "R01", "cell": "3,1" }, { "room": "R01", "cell": "1,3" } /* … */ ],
    "secretPassages": [ ["R01", "R08"], ["R03", "R06"] ]
  },

  "rules": {                                   // every field optional; these are the defaults
    "turnSeconds": 60,
    "dieSides": 6,
    "accusationsPerPlayer": 1
  },

  "story": {
    "chapters": [
      { "id": "arrival", "panels": [
          { "art": "assets/story/arrival/1.svg", "captionKey": "story.arrival.1" } ] },
      { "id": "murder", "autoplay": true, "panels": [
          { "art": "assets/story/murder/1.svg", "captionKey": "story.murder.1", "ms": 3400 } ] },
      { "id": "briefing", "panels": [ /* … */ ] }
    ]
  },

  "ui": {
    "tokens": {
      "color": { "ink": "#1B1B1B", "paper": "#FFF7EC", "primary": "#E8483B", "accent": "#FFD54A",
                 "success": "#2FA37C", "reach": "#7FD3A8", "night": "#1E2A5A" },
      "font":  { "display": "ZCOOL KuaiLe", "ui": "Fredoka", "glyph": "Noto Serif SC" },
      "radius": { "card": 14, "sheet": 26 },
      "shadow": "4px 4px 0 #1B1B1B",
      "background": "dots"
    },
    "logo": "assets/logo.svg",
    "cardBack": "assets/card-back.svg",
    "ghostGlyph": "鬼",
    "stickers": [ { "id": "huat", "labelKey": "sticker.huat", "color": "#E8483B" } ],
    "awards":   [ { "stat": "correctAccuse", "labelKey": "award.detective" },
                  { "stat": "suspCount",     "labelKey": "award.mostSuspected" },
                  { "stat": "showCount",     "labelKey": "award.tightLipped", "lowest": true },
                  { "stat": "reactCount",    "labelKey": "award.lifeOfParty" } ],
    "tutorial": [ { "target": "board", "textKey": "tut.board" } /* … 7 marks */ ],
    "sfx":     { "diceLand": "assets/sfx/dice.mp3", "yourTurn": "assets/sfx/gong.mp3" },
    "haptics": { "diceLand": "hard", "yourTurn": "double", "killerReveal": "heavy" },
    "dice": { "accentFaces": [1, 4] },           // faces drawn in the accent colour (Chinese dice paint 1 and 4 red)
    "ambient": {                                 // optional life while nobody acts
      "hanging": { "art": "assets/lantern.svg", "count": 6 },  // hung along the top of the TV, swaying
      "sparkleRooms": ["R08"]                    // rooms that sparkle (fireworks over the backyard)
    }
  }
}
```

### 6.3 What the engine needs and what it ignores
| Engine reads | Engine never reads |
|---|---|
| card ids per category, suspect `start` cells, compiled board graph (cells, adjacency, doors, passages), `rules` | names, i18n keys, colours, art paths, story, ui, sfx |

`theme-sdk` compiles `board` into exactly what `prototype/game-core.js` hand-built:
- `ADJ`, the 4-neighbour corridor graph plus door ↔ room edges.
- `DOORS`.
- `DR`, the BFS distance to the nearest room, used by bots.
- `nodeXY`, room slot positions for tokens.

This works for any grid size and room shape.

### 6.4 Validation (`theme:check` and server boot)
A pack is **rejected** when any of these hold:
- The manifest fails the zod schema, or `schemaVersion` is unknown.
- An id is duplicated, or an id that something references (legend, doors, passages, starts) doesn't exist.
- Any category has fewer than 2 cards, or there are fewer suspects than `players.max`. Each seat plays one suspect.
- A start cell is not a corridor, or two suspects share a start cell.
- A door cell is not a corridor next to its room. A room has no door and no passage. Part of the corridor graph can't be reached.
- An asset file is missing, or not a web media type.
- An i18n key used by the manifest or the UI key list is missing in `defaultLanguage`. Missing keys in other languages are a **warning** and fall back.
- A story caption mentions a room or object name. This is a heuristic warning: the story must not reveal the answer.

### 6.5 Recipe: a new board in 6 steps
1. Copy `themes/cny-guest/` to `themes/<new-id>/`.
2. Replace the deck: list your suspects, rooms and objects with new ids, colours and art files. Any counts are fine within the rules above.
3. Draw the board in `board.map`, set the `legend`, `doors`, `secretPassages` and a `start` per suspect.
4. Write `i18n/<lang>.json` for every language in `meta.languages`.
5. Restyle with `ui.tokens`, and add stickers, awards labels, tutorial copy and the story chapters.
6. Run `pnpm theme:check <new-id>`, restart the server, and pick the board in Create room. No code changes.

### 6.6 Lessons from `3D Monopoly board setup`
Kept:
- A registry of boards.
- Optional per-theme fields over sensible defaults.
- An engine that branches only on a structural `kind` and never on a board id.
- Translated text with a fallback.
- A transport that knows nothing about the game.

Avoided:
- **Menus hardcoded in HTML.** Here the theme picker is generated from `GET /themes`.
- **`if/else` on theme names** (`centre === 'shrine'`). Everything visual is an asset path.
- **Fixed board size and magic indexes** (`40`, `JAIL_TILE = 10`). Here the board size and starts are data.
- **Default ids leaking into code** (`'ipoh'` saves and topics). No theme id appears in code.
- **No data validation.** Every pack goes through `theme:check`.
- **Global mutable "current board" exports.** A compiled theme is passed into `initGame(theme, seed)` per room, so two rooms can play different boards at the same time.

## 7. Engine design

- **Shape:** `applyIntent(state, seat, intent, { theme }) → { state, events } | { error }`. It is pure and synchronous, and never reads the clock. `timeoutTurn(state, theme)` settles whatever is owed when the clock runs out. The RNG state lives inside `GameState`, so a game replays exactly.
- **Seeded RNG:** the envelope, the deal and the dice use a per-game seed (for example mulberry32). The same seed and intents give the same game, which makes replays and tests deterministic. The prototype's fixed `SOLUTION` and `DEAL` are gone.
- **Movement:** BFS over the compiled graph, ported from `game-core.js` `bfs`/`pathTo`:
  - A room node ends expansion.
  - The start room is excluded as a destination.
  - The server re-checks the client's chosen node against `reach`.
- **Events:** each change emits typed events: `rolled`, `moved{path}`, `suggested`, `asked{seat, has}`, `noDisprove`, `cardShown{from, to, card}` (`card` is private), `accused{correct}` (never the guess), `becameGhost`, `turnStarted`, `timedOut`, `gameWon`, `gameOver`. `publicEvent` strips the private part, and `Projection` sends each private part to its owner only.
- **No theme strings:** log lines are events plus ids, and the client renders them through `t()`.

## 8. Bots and timers

- **BotRunner** ([apps/server/src/bots.ts](apps/server/src/bots.ts)) deduces from what it knows: its own hand and every card shown to it.
  - It accuses as soon as one card is left in each category.
  - It walks towards rooms it hasn't ruled out, and uses a secret passage when that leads to one.
  - It suggests cards it hasn't ruled out, and shows its first matching card.
  - The prototype's scripted moves are dropped: the forced first suggestion, and seat 1 "solving" from the hardcoded `SOLUTION`.
  - Not yet used: what can be learned from other players' passes.
- Bot intents go through `GameController` exactly like human ones, after a think delay (`BOT_DELAY_MS`).
- **TurnTimer:**
  - One deadline per room, `rules.turnSeconds`.
  - The server sends `deadline` (epoch ms), not ticking seconds, so clients draw the ring locally (red at ≤10 s). The clock belongs to the turn: acting does not reset it.
  - On timeout the turn passes on, and an owed suggestion is skipped.
  - **The asked player has their own clock.** When a suggestion needs disproving, the clock restarts for the asked seat. If that seat stalls, *it* is the one that timed out: its first matching card is shown, and the suggester gets a fresh half-clock to finish the turn.
  - **The intro has a limit:** 2 min (`introMs`). After that, play begins whether or not everyone is ready.
  - **Bot pacing:** a bot waits `BOT_DELAY_MS` (default 1 s) × a factor for each action. It waits ×2.2 before moving, so its dice land first, and ×4 after a suggestion is settled, so everyone can read who showed what.

## 9. Client design

- The **screens and overlays** follow handoff §Screens and §Design tokens exactly. Token values come from `theme.ui.tokens`, written as CSS custom properties (`--ink`, `--paper`, `--primary`…), so components use only `var(--…)` and contain no theme colours.
- **Art:** the CNY pack's art is the prototype's `game-art.js` SVG generators, exported once to static SVG files keyed by id (`S01…`, `R01…`, `O01…`, scenes). Components render `<img src={asset(id)}>` or inline SVG through `AssetResolver`.
- **Motion** (pop, fadeUp, card flip `cubic-bezier(.3,1.4,.5,1)`, token step 170 ms, ribbon 1.8 s, dice ~1.3 s) is part of the shared design system, not the theme. A theme may override durations in a later schema version.
- **Reach:** the server includes `reach` (the squares and rooms the active seat may move to) in `room:state`. The client highlights them and never computes movement itself.
- **TV route** `/tv?code=XXXX` uses the same components in a 16:9 layout and is fed only by the room channel (`room:state`, `game:events`, `reaction`).
- **Sound and haptics** ([apps/client/src/feedback.ts](apps/client/src/feedback.ts)) are looked up by moment in `theme.ui.sfx` (audio files) and `theme.ui.haptics`, and respect the Settings toggles. The moments are `diceLand`, `step`, `suggest`, `pass`, `hasOne`, `cardShown`, `turn`, `yourTurn`, `accuse`, `accuseWrong`, `killerReveal` and `music`.
  - Haptic patterns are named (`light`, `soft`, `hard`, `double`, `heavy`, `celebrate`) or given as raw durations (`"40,30,40"`).
  - With turn alerts on, the tab title is flagged when your turn comes while the tab is in the background.
  - The CNY pack ships haptics only; there are no audio files yet.
- **Detective notes** form a card × player grid.
  - Marks fill in by themselves from your hand, cards shown to you, and players who passed (public `suggestions`). A mark you set by hand always wins.
  - Notes are kept per room and game, on the device.
- **Moments:** the dice, the suggestion moment (cards, then each player's pass or has-one, then "A showed B"), the accusation moment (the accuser in the spotlight, the sealed envelope shaking, then a WRONG or CORRECT stamp; the guess is never shown) and token walking (170 ms a step) are all driven by the public event feed, so the TV gets them too.
- **One stage on the TV:** the board stays on screen from lobby to end. The lobby and the story sit on a blurred board; play opens with the pieces dropping onto their squares and the answer dealt into the envelope. During play the players run down the side (whose turn, each one's answer), the die tumbles over the board, tokens hop square by square and the room they enter lights up.
- **The suggestion, paced:** the server sends the suggestion and every answer at once, so the client paces it ([useSuggestion.ts](apps/client/src/components/useSuggestion.ts)): the three cards hold the stage (1.6 s), then each player answers in turn (1 s each), then who showed whom. On the TV the camera zooms into the room, which becomes the backdrop, and a face-down card flies between the two players. On a phone the panel covers the lower half and is worded for its owner: the one who showed sees which card, the suggester gets it in their own sheet, everyone else learns only that a card changed hands. The named suspect flies into the room.
- **Turn banner:** a band sweeps across the TV with the player's face; other phones get a toast (your own turn keeps the YOUR TURN ribbon).
- **Fast animations** (Settings, per device) halves every staged beat. It is published to CSS as `--speed`.
- **Tutorial:** coach marks from `theme.ui.tutorial`, each spotlighting a `data-tut` target. They show on the first game per device per theme.
- **Overlay layering**, from bottom to top:
  - the die (a corner, never takes taps);
  - the suggestion moment (on a phone, a panel over the lower half);
  - the accusation moment (on every screen; a wrong accuser's envelope sheet waits for it, and a winning one plays before the reveal);
  - the pause screen;
  - your own sheets: show a card, a card shown to you, suggest, accuse, wrong accusation;
  - the YOUR TURN ribbon, the turn toast and the TV turn banner (never take taps);
  - the tutorial.

  The suggestion moment also steps aside while you have a card to show or a shown card to read, and a newer roll ends it.
- **Names:** a bot is shown by the character it plays ("Maid (bot)"). Tokens use the suspect `glyph`, or a per-language `glyph.<id>` key from the theme's i18n (the CNY pack has English initials). A "Who is who" legend sits under the board.
- **Accessibility:** a reachable square is read out as "Corridor by Hall (row 2, column 4)".

## 10. Internationalisation

- Every screen is in **one language**, chosen on first launch and changeable in Settings.
- There are two kinds of strings:
  - **UI strings** such as buttons and rules text. These live in `apps/client/src/i18n/<lang>.json` and are shared by every theme.
  - **Theme strings** such as card names, story, awards, stickers and tutorial copy. These live in `themes/<id>/i18n/<lang>.json`.
- A theme may override any UI key, for example to rename "Accuse".
- The prototype's paired `L(zh, en)` calls and `{cn, en}` objects are replaced by `t(key)`.

## 11. From prototype to production

| Prototype (`prototype/…`) | Production home |
|---|---|
| `game-core.js` `ROOMS`, `RB`, `SECRET`, `STARTS` | `themes/cny-guest/theme.json` → `deck`, `board` |
| `game-core.js` `ADJ`, `DOORS`, `DR`, `bfs`, `pathTo`, `nodeXY` | `packages/theme-sdk` (compile), `packages/engine` (movement) |
| `game-core.js` `STORY1`, `MURDER`, `MURDER_MS`, `STORY2`, `SETUP` | `theme.json` → `story` + `i18n/*.json` |
| `game-core.js` `NOTES` (sfx/haptics) | `theme.json` → `ui.sfx`, `ui.haptics` |
| `game-art.js` `PORTRAIT`, `ROOM`, `OBJ`, `BACK`, scenes | `themes/cny-guest/assets/**` (exported SVG) |
| `game-art.js` `CH` (colour, glyph, en name) | `deck.suspects[].color/glyph` + i18n |
| Logic class: `SEAT_ORDER`, `NAMES`, `SOLUTION`, `DEAL` | Seeded deal in `engine`; names in i18n |
| `initGame`, `roll`, `tapNode`, `takeSecret`, `submitSuggest`, `accGo` | `packages/engine` reducers |
| `runBot`, `botSuggest` | `apps/server` `BotRunner` |
| `onTick` (60 s) | `apps/server` `TurnTimer` |
| `gameVals` stickers `STK`, award names, `TUT` | `theme.json` → `ui.stickers`, `ui.awards`, `ui.tutorial` |
| `renderVals`/`gameVals` view models | client selectors over `GameStore` |

## 12. Delivery phases

| Phase | Scope | Done when |
|---|---|---|
| **P0** | This README, `CLAUDE.md`, C4 diagram | ✅ |
| **P1** | Workspace scaffold; `theme-sdk` (schema, validator, board compiler, CLI); extract the CNY pack | ✅ `theme:check cny-guest` passes; the compiled graph equals the prototype's `ADJ` (oracle test) |
| **P2** | **Lobby and room join**: Lang, Home, Settings, Create sheet, Lobby (code, share, character picker, seats, fill bots, start); `/tv` lobby with QR | ✅ Phones + TV join one room live; Start is gated at `players.min` |
| **P3** | **Turn loop**: roll, move, secret passage, suggest, clockwise disprove, show card, accuse, ghost, 60 s timer, bots, reactions | ✅ Tested over real sockets, including a leak test across several bot rounds that the TV must pass |
| **P4** | Story chapters, setup, private role and hand flip, ready-up, first-game tutorial | ✅ Intro phase on the server. Phone and TV intro screens; coach marks from the theme |
| **P5** | Reveal, results ("what really happened", timeline, awards, stats), rematch vote | ✅ A rematch keeps the room and seats and deals again |
| **P6** | Suggestion history and auto-marks; host controls (pause, kick, host hand-over); reconnect; idle-room cleanup; deducing bots; the QR code and Share link | ✅ |
| Later | **Pixel-matching the handoff** (exact layouts, comic polish). **CNY event cards** and **player profiles and levels**: the handoff names these but gives no rules or design, so they need a spec first. Profiles also need persistence (see below). **Sound files** for the CNY pack | |

## 13. Open questions

- **Persistence:** rooms are in memory, so a server restart drops games. Redis or similar is only needed when this matters.
- **Scale-out:** a single process is assumed. More nodes would need sticky sessions plus the Socket.IO Redis adapter, and per-room ownership.
- **Theme selection UX:** where the theme picker lives in Create room. The handoff has no design for it.
- **Event cards and profiles:** what do CNY event cards do, and when are they drawn? What do levels unlock? Profiles need accounts and a database (MongoDB would suit them).
- **Bots and the timer:** should bots use the full turn time to look human, or play fast?
