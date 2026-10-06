# Handoff: 谁杀了客人？ Who Killed the Guest? (online CNY Cluedo)

## Overview
An online, mobile-first deduction game in the style of Cluedo, themed around Chinese New Year. 3–6 players join a room from their phones. An optional TV acts as a non-playable spectator screen that shows public information only. The flow covers: language pick → home → settings → create room → lobby → story (3 chapters, including a comic-noir murder) → card setup → first-game tutorial → play (roll, move, suggest, disprove, accuse) → reveal → results with awards and a rematch vote.

## About the design files
The files in this bundle are **design references built in HTML**. They are prototypes that show the intended look and behaviour; they are not production code to ship. Your task is to **recreate them in the target stack**. If there is no codebase yet, a reasonable choice is:
- Client: React + TypeScript (Vite), or React Native / Expo for native apps
- Realtime: WebSocket server (Node + Socket.IO, Colyseus, or Supabase Realtime)
- An authoritative server holds the game state; clients only send intents

Open `prototype/CNY Cluedo Game Prototype.dc.html` in a browser to play through it. The step bar at the top jumps to any stage. The left frame is one player's phone; the right frame is the TV for the same moment. Bots play the other 5 seats.

## Fidelity
**High fidelity.** Colours, type, layout, copy and interactions are final. Recreate them closely. The illustrations are vector sketches drawn in code (`game-art.js`). Either port the SVG generators as they are, or swap in final illustrator art at the same sizes.

## Files
| File | What it is |
|---|---|
| `prototype/CNY Cluedo Game Prototype.dc.html` | The full game flow: all phone and TV screens, plus the game logic (state machine, bots, timers). The logic class is at the bottom inside `<script data-dc-script>`. |
| `prototype/game-core.js` | Board graph (11×11), BFS movement, dice faces, story text (zh/en), per-step design notes (sound/haptics). **Port this logic to the server.** |
| `prototype/game-art.js` | All illustrations as SVG strings: 6 suspect portraits plus the guest, 8 room scenes, 6 objects, card back, story comic pages, setup animations, QR placeholder. |
| `assets/CNY Cluedo Assets.dc.html` | The printable/asset reference: 20 cards, card back, tokens, board, victim card. |
| `support.js` | Runtime needed to open the `.dc.html` files locally. Ignore it in production. |

## Game rules (implement these exactly)
- **Deck:** 6 suspects (二叔 2nd Uncle, 大姑 Big Aunt, 表哥 Cousin, 大嫂 Sister-in-law, 姑丈 Uncle-in-law, 伯母 Big Aunty), 8 rooms (麻将房 Mahjong Room, 神台 Altar, 书房 Study, 客厅 Living Room, 饭厅 Dining Room, 车房 Garage, 厨房 Kitchen, 后院 Backyard) and 6 objects (六万 Mahjong Tile, 红包 Red Packet, 鞭炮 Firecracker, 年糕 Nian Gao, 橘子 Mandarin, 筷子 Chopsticks). Total 20.
- **Setup:** draw one card from each category at random into the envelope. Deal the remaining 17 round-robin to 6 seats. Seats without a human are bots. Each player is also one of the suspects, and their own character can still be the killer.
- **Turn:**
  1. Roll a d6.
  2. Move up to N steps on corridor squares (4-neighbour). Entering a room costs 1 step and ends movement. You can't end in the room you started in.
  3. A secret passage (麻将房↔后院, 书房↔车房) can replace the roll.
  4. In a room you must suggest: a suspect, this room, and an object. The suggested suspect's token moves into the room.
- **Disprove:** going clockwise, the first player holding any of the 3 cards **chooses** one to show the suggester privately. Everyone else only sees who showed a card to whom.
- **Accuse:** only on your own turn, and only once. Right means you win. Wrong means you become a **ghost**: your token turns grey, your turns are skipped, and you can't move, suggest or accuse, but you still show cards. The TV announces "wrong accusation" without revealing the guess. The accuser privately sees the envelope.
- **Turn timer:** 60 seconds. On timeout, the turn ends automatically.

## Board
- Grid of 11×11 cells. Corridors are rows 3 and 7 and columns 3 and 7 (40 squares).
- Rooms are 3×3 blocks at block coordinates (0..2, 0..2) × 4. The centre block (1,1) holds the case envelope.
- Room blocks: 麻将房(0,0) 神台(1,0) 书房(2,0) 客厅(0,1) 饭厅(2,1) 车房(0,2) 厨房(1,2) 后院(2,2).
- Doors sit at the mid-side of each room facing a corridor. See `DOORS` / `ADJ` in `game-core.js`.
- Start squares: 表哥 3,0 · 大嫂 7,0 · 二叔 10,3 · 伯母 10,7 · 姑丈 7,10 · 大姑 0,7.

## Screens (phone 390×844, TV 16:9)
Every screen is in **one language only** (chosen on first launch; changeable in Settings). Copy for both languages is in the prototype.

1. **Language pick:** yellow dotted background, logo, two big buttons: 中文 / English.
2. **Home:** victim polaroid (guest portrait with VICTIM tape) and logo. Buttons: Create room (red primary), Join room, Watch on TV, How to play. Settings gear at top right.
3. **Settings:** toggles for sound, music, haptics and turn alerts; a language segmented control.
4. **Create room (bottom sheet):** room name, max players (3–6 stepper), display mode cards (Phones only / TV + phones), bot auto-fill toggle.
5. **Lobby:** 4-digit code with Share; 3×2 character picker (taken characters dimmed with the owner's name); 2-column seat list; Fill with bots; Start (enabled at 3+). The TV shows a QR code, the code, and seat cards that animate in as players join.
6. **Story:** comic pages, square on the phone; on the TV, left square art with a big caption on the right.
   - Chapter 1: arrival, the guest at the door, the dinner where he says "I know every one of your secrets" (6 reaction panels).
   - Chapter 2, the murder (auto-plays, about 10 s):
     1. Everyone scattered in different rooms at midnight.
     2. Power cut.
     3. Eyes in the dark and a moving shadow.
     4. "THUD".
     5. Scream.
     6. Lights on: the guest is gone.
   - Chapter 3: the body is found on the front steps (not a board room); drag marks show it was moved; police-style lineup; the three questions.
   - **Rule:** the story must never reveal the room or the weapon.
7. **Setup:** felt table. One card from each pile flies into the envelope and it gets a seal stamp; then 17 cards are dealt to 6 seats. Then, privately on each phone: a flip card showing your character, and your 3 hand cards flipped in turn. The TV shows each seat as Checking or Ready.
8. **Tutorial (first game only):** 7 coach marks with a spotlight cut-out and a bubble with Next / Skip, covering the board, the player bar and timer, Roll, Notes, Accuse and Reactions.
9. **Play (phone):**
   - **Top bar (52px):** round chip; 6 avatars, with the active one at 46px and a 60 s ring (green, red at ≤10 s); your avatar has a red "YOU" tag; seconds chip; reactions button.
   - **Board:** 366px square.
   - **Log strip:** 32px.
   - **Tabs:** Actions / Cards / Notes.
   - **Actions content:** Roll (pulsing), "Move up to N", Make a suggestion, End turn, waiting card during others' turns, ghost card; Secret passage and Accuse always at the bottom.
   - **Tokens:** 32px, white ring, drop shadow, yellow pulsing halo on the active player, and a bouncing "YOU" pin.
   - **Reachable squares:** mint `#7FD3A8` pulsing; reachable rooms glow.
10. **Overlays:**
    - **Dice:** 3D cube, 130px, CSS 3D, about a 1.3 s spin.
    - **Suggestion sheet:** suspect grid and object grid; "Check my notes" opens the Notes tab with a "← Back to suggestion" button.
    - **Suggestion moment:** shown on all screens. The 3 cards pop in, then each player is asked clockwise (✕ Pass, or ✓ Has one), and the status line updates.
    - **Disprove result:** private card reveal, or "Nobody could disprove".
    - **Show-a-card sheet:** when you hold matching cards.
    - **Accuse sheet:** with a confirm step.
    - **Wrong accusation:** private envelope view, then "Continue as a ghost".
    - **YOUR TURN ribbon:** 1.8 s.
    - **Reaction tray:** 6 stickers that float up on every phone and on the TV.
11. **Reveal (public):** the envelope shakes and tears, the 3 cards flip with ✓/✕ against the accusation, then a spotlight turns the killer from silhouette into portrait (2 s brightness transition). Then the verdict.
12. **End:** winner; the answer as 3 cards; "What really happened"; a case timeline; 4 awards (Best detective, Most suspected, Tight-lipped, Life of the party); a rematch vote showing 6 avatars with ticks; stats. The TV shows the winner, the answer, an awards bar and the vote count.

## TV (spectator) rules
The TV shows **public information only**: board, tokens, dice, the current turn and timer, suggestion moments, who showed a card to whom (never which card), log, reactions, story, reveal and results. It never shows a hand or a private card. In phones-only mode the TV is off, and every phone has the full board.

## State (server-authoritative)
```
Room { code, name, maxPlayers, mode: 'phones'|'tv', bots, phase, lang per client }
Game {
  order[6]            // seat → character
  hands[6][]          // private: send each player only their own hand
  envelope {sus,room,obj}   // server only
  pos{char→node}      // node = "c,r" | "R:<room>"
  turn, stage: roll|move|suggest|end|out, round, tLeft
  dice {value,rolling}, reach (client-side preview is fine)
  lastSug {by,sus,room,obj,shower}, moment {by,trio,chain[],shower,shown}
  events[]            // timeline
  out[6]              // ghosts
  suspCount, showCount[6], reactCount[6]  // awards
  votes[6]
}
Private per player: marks{card-seat→x|v|q}, shown[{card,from}]
```
Events from client to server: `pickChar`, `start`, `roll`, `move(node)`, `secretPassage`, `suggest(sus,obj)`, `showCard(card)`, `accuse(sus,room,obj)`, `react(i)`, `vote`.
Broadcasts: a public state diff to everyone, plus private messages (your hand, the card shown to you, the envelope to a wrong accuser).

## Design tokens
- **Colours:**
  - Ink `#1B1B1B`; paper `#FFF7EC`; yellow `#FFD54A`; red `#E8483B`; green `#2FA37C`; mint `#7FD3A8`; orange `#FF9A3C`; blue `#5B8DEF`; light blue `#9DB8F2`; pink `#FFB4A8`.
  - Night `#1E2A5A`; dark `#0B0B10` / `#2A2320`; grey `#E6E1D8` / `#C9C2B8`.
  - Character colours: 二叔 `#2E8A5E`, 大姑 `#8A4FB0`, 表哥 `#5B8DEF`, 大嫂 `#E07AA0`, 姑丈 `#7C8085`, 伯母 `#C9A04A`.
- **Type:**
  - Chinese and display: **ZCOOL KuaiLe** (Google Fonts).
  - Latin UI: **Fredoka** 500/600/700.
  - Token glyphs: **Noto Serif SC** 900.
  - Sizes: titles 26–50px, body 12.5–15px, buttons 17–24px.
- **Comic style:**
  - Borders 2.5–3px ink.
  - Radius: 12–16px on cards and buttons, 26px on sheet tops.
  - Hard offset shadows `3–6px 3–6px 0 #1B1B1B` (no blur); pressed state removes the shadow and shifts by 3px.
  - Dotted backgrounds: `radial-gradient(#1B1B1B 1.4px, transparent 1.8px) / 18px`.
- **Touch targets:** 44px or more. Primary buttons 56–60px tall.
- **Motion:** pop 0.4s, fadeUp 0.25s, pulse 0.9–1.6s, card flip 0.6–0.8s `cubic-bezier(.3,1.4,.5,1)`, token step 170ms per square, ribbon 1.8s, floatUp 2.6s. The keyframes are in the prototype's `<helmet><style>`.

## Sound and haptics
Each step's notes are in `NOTES` in `game-core.js`, and they show in the panel under the TV in the prototype. Examples: dice rattle, then a hard haptic tap on landing; a double buzz on your turn; a heavy hit on the killer reveal.

## Assets
All art is code-generated SVG in `game-art.js`. There are no bitmap assets. Fonts come from Google Fonts. The QR code is a placeholder; generate a real one from the room join URL.

## Not built yet (suggested next)
Suggestion history with automatic marks for players who passed, CNY event cards, player profiles and levels, host controls (pause, kick, reconnect), and a real QR / deep-link join.
