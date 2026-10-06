import { randomUUID } from 'node:crypto';
import { applyIntent, createGame, recordReaction, timeoutTurn, type GameEvent, type GameState, type Intent } from '@cluedo/engine';
import { TurnTimer } from './timer.ts';
import { botDelay, botIntent } from './bots.ts';
import type { Ack } from '@cluedo/protocol';
import type { Projection } from './projection.ts';
import type { Room } from './rooms.ts';

export interface ControllerDeps {
  projection: Projection;
  botDelayMs: number;
  seed?: () => string;
  /** Overrides theme.rules.turnSeconds (tests). */
  turnMs?: number;
  /** The intro ends on its own after this long, ready or not. */
  introMs?: number;
}

/** One per room. The only writer of the room's game state: every change goes intent → engine → projection. */
export class GameController {
  private timer = new TurnTimer();
  private botHandle?: ReturnType<typeof setTimeout>;

  constructor(private room: Room, private deps: ControllerDeps) {}

  /** Deals the game and opens the intro. The turn clock and bots wait until everyone is ready. */
  start() {
    const r = this.room;
    r.game = createGame(r.theme, r.seats.map((s) => ({ characterId: s.characterId! })), this.deps.seed?.() ?? randomUUID());
    r.phase = 'intro';
    r.gameNo++;
    r.log = [];
    r.history = [];
    r.suggestions = [];
    r.votes = undefined;
    r.ready = r.seats.map((s) => s.isBot);
    this.timer.arm(this.deps.introMs ?? 120_000, () => this.beginPlay());
    r.deadline = this.timer.deadline;
    this.deps.projection.publish(r, [], { hands: true });
    if (r.ready.every(Boolean)) this.beginPlay();
  }

  ready(seat: number): Ack {
    const r = this.room;
    if (r.phase !== 'intro' || !r.ready) return { ok: false, error: 'not in the intro' };
    r.ready[seat] = true;
    if (r.ready.every(Boolean)) this.beginPlay();
    else this.deps.projection.state(r);
    return { ok: true };
  }

  skipIntro(): Ack {
    if (this.room.phase !== 'intro') return { ok: false, error: 'not in the intro' };
    this.beginPlay();
    return { ok: true };
  }

  /** A player walked away mid-game: a bot takes over the seat, so nobody waits for them. */
  seatLeft(seat: number) {
    const r = this.room;
    const s = r.seats[seat]!;
    s.isBot = true;
    s.token = undefined;
    s.socketId = undefined;
    if (r.phase === 'intro' && r.ready) return this.ready(seat);
    if (r.phase === 'end') return this.vote(seat, false);
    this.deps.projection.state(r);
    if (r.phase === 'play' && !r.paused) this.scheduleBot();
    return { ok: true } as const;
  }

  /** Rematch vote. When every human says yes, the same seats are dealt a new game. */
  vote(seat: number, rematch: boolean): Ack {
    const r = this.room;
    if (r.phase !== 'end') return { ok: false, error: 'the game is not over' };
    r.votes ??= r.seats.map(() => null);
    r.votes[seat] = rematch;
    // Everyone still connected must agree; players who are gone do not block the table.
    const present = r.seats.map((s, i) => i).filter((i) => !r.seats[i]!.isBot && r.seats[i]!.socketId);
    if (present.length && present.every((i) => r.votes![i] === true)) this.start();
    else this.deps.projection.state(r);
    return { ok: true };
  }

  /** Host pause: the clock and the bots stop; resuming gives back the time that was left. */
  pause(paused: boolean): Ack {
    const r = this.room;
    if (r.phase !== 'play') return { ok: false, error: 'the game has not begun' };
    if (!!r.paused === paused) return { ok: true };
    if (paused) {
      this.remainingMs = Math.max(0, (r.deadline ?? Date.now()) - Date.now());
      this.timer.clear();
      clearTimeout(this.botHandle);
      r.paused = true;
      r.deadline = undefined;
    } else {
      r.paused = false;
      this.timer.arm(this.remainingMs ?? this.turnMs(), () => this.onTimeout());
      r.deadline = this.timer.deadline;
      this.scheduleBot();
    }
    this.deps.projection.state(r);
    return { ok: true };
  }
  private remainingMs?: number;
  private turnMs() {
    return this.deps.turnMs ?? this.room.theme.rules.turnSeconds * 1000;
  }

  private beginPlay() {
    const r = this.room;
    r.phase = 'play';
    r.paused = false;
    r.ready = undefined;
    this.commit(r.game!, [{ type: 'turnStarted', seat: r.game!.turn, round: r.game!.round }]);
  }

  private reactTimes = new Map<number, number[]>();

  /** Sends a sticker to everyone; at most 3 per seat every 2 seconds. */
  react(seat: number, stickerId: string): Ack {
    const r = this.room;
    if (!r.theme.manifest.ui.stickers.some((s) => s.id === stickerId)) return { ok: false, error: 'unknown sticker' };
    const now = Date.now();
    const recent = (this.reactTimes.get(seat) ?? []).filter((t) => now - t < 2000);
    if (recent.length >= 3) return { ok: false, error: 'slow down' };
    this.reactTimes.set(seat, [...recent, now]);
    if (r.game) r.game = recordReaction(r.game, seat);
    this.deps.projection.reaction(r, seat, stickerId);
    return { ok: true };
  }

  dispose() {
    this.timer.clear();
    clearTimeout(this.botHandle);
  }

  apply(seat: number, intent: Intent): Ack {
    const r = this.room;
    if (!r.game) return { ok: false, error: 'game not started' };
    if (r.phase !== 'play') return { ok: false, error: 'the game has not begun' };
    if (r.paused) return { ok: false, error: 'the game is paused' };
    const res = applyIntent(r.game, seat, intent, { theme: r.theme });
    if ('error' in res) return { ok: false, error: res.error };
    this.commit(res.state, res.events);
    return { ok: true };
  }

  private commit(state: GameState, events: GameEvent[], opts: { hands?: boolean } = {}) {
    const r = this.room;
    r.game = state;
    if (state.stage === 'over') {
      r.phase = 'end';
      r.votes = r.seats.map(() => null);
      this.timer.clear();
    } else if (events.some((e) => e.type === 'turnStarted')) {
      this.timer.arm(this.turnMs(), () => this.onTimeout());
    } else if (state.stage === 'disprove' && events.some((e) => e.type === 'suggested')) {
      // The asked player gets a window of their own; if they stall, the timeout is theirs.
      this.timer.arm(this.turnMs(), () => this.onTimeout());
    } else if (events.some((e) => e.type === 'cardShown')) {
      // Back to the suggester to finish the turn.
      this.timer.arm(Math.max(this.turnMs() / 2, 1), () => this.onTimeout());
    }
    r.deadline = this.timer.deadline;
    this.deps.projection.publish(r, events, opts);
    this.scheduleBot(events);
  }

  /** If a bot owes the next action (its turn, or it is being asked to disprove), act after a short delay. */
  private scheduleBot(lastEvents: GameEvent[] = []) {
    clearTimeout(this.botHandle);
    const g = this.room.game;
    if (!g || g.stage === 'over') return;
    const seat = g.stage === 'disprove' ? g.pending!.asked : g.turn;
    if (!this.room.seats[seat]?.isBot) return;
    this.botHandle = setTimeout(() => {
      const now = this.room.game;
      if (!now) return;
      const intent = botIntent(now, this.room.theme, seat, Math.random);
      if (intent) this.apply(seat, intent);
    }, botDelay(g, lastEvents, this.deps.botDelayMs));
  }

  private onTimeout() {
    const g = this.room.game;
    if (!g) return;
    const { state, events } = timeoutTurn(g, this.room.theme);
    this.commit(state, events);
  }
}
