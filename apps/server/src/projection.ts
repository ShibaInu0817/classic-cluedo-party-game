import type { Server } from 'socket.io';
import { privateView, publicEvent, publicView, type GameEvent } from '@cluedo/engine';
import { roomState, type Room } from './rooms.ts';

/**
 * The only place that decides who hears what. Public data goes to the room channel (phones + TVs);
 * private data goes to one seat's socket and never to the channel.
 */
export class Projection {
  constructor(private io: Server) {}

  static channel(room: Room) {
    return `room:${room.code}`;
  }

  /** Public room state to everyone in the room, including TVs. */
  state(room: Room) {
    this.io.to(Projection.channel(room)).emit('room:state', roomState(room, room.game && publicView(room.game)));
  }

  /** Publishes what happened: public events and state to all, private parts to their owners. */
  publish(room: Room, events: GameEvent[], opts: { hands?: boolean } = {}) {
    const g = room.game;
    if (events.length) {
      const pub = events.map(publicEvent);
      room.log.push(...pub);
      room.history.push(...pub);
      if (room.log.length > 60) room.log.splice(0, room.log.length - 30);
      for (const e of pub) {
        const last = room.suggestions.at(-1);
        if (e.type === 'suggested') room.suggestions.push({ by: e.seat, trio: { ...e.trio }, passed: [] });
        else if (e.type === 'asked' && last) e.has ? (last.shownBy = e.seat) : last.passed.push(e.seat);
      }
    }
    this.state(room);
    if (events.length) this.io.to(Projection.channel(room)).emit('game:events', events.map(publicEvent));
    if (!g) return;

    for (const e of events) {
      if (e.type === 'cardShown') this.toSeat(room, e.to, 'game:shown', { card: e.card, from: e.from });
      if (e.type === 'becameGhost') this.toSeat(room, e.seat, 'game:private', privateView(g, e.seat));
    }
    if (opts.hands) room.seats.forEach((_, seat) => this.toSeat(room, seat, 'game:private', privateView(g, seat)));
    if (g.stage === 'disprove' && g.pending && events.some((e) => e.type === 'suggested')) {
      const p = g.pending;
      const t = [p.trio.sus, p.trio.room, p.trio.obj];
      this.toSeat(room, p.asked, 'game:showRequest', { by: p.by, cards: g.hands[p.asked]!.filter((c) => t.includes(c)) });
    }
  }

  reaction(room: Room, seat: number, stickerId: string) {
    this.io.to(Projection.channel(room)).emit('reaction', { seat, stickerId });
    this.state(room);
  }

  /** Re-sends everything private a seat should have (after reconnecting). */
  resync(room: Room, seat: number) {
    this.state(room);
    const g = room.game;
    if (!g) return;
    this.toSeat(room, seat, 'game:private', privateView(g, seat));
    if (g.stage === 'disprove' && g.pending?.asked === seat) {
      const t = [g.pending.trio.sus, g.pending.trio.room, g.pending.trio.obj];
      this.toSeat(room, seat, 'game:showRequest', { by: g.pending.by, cards: g.hands[seat]!.filter((c) => t.includes(c)) });
    }
  }

  private toSeat(room: Room, seat: number, event: string, data: unknown) {
    const id = room.seats[seat]?.socketId;
    if (id) this.io.to(id).emit(event, data);
  }
}
