import { randomUUID } from 'node:crypto';
import http from 'node:http';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import { C2S, type Ack, type C2SEvent } from '@cluedo/protocol';
import { loadRegistry } from './registry.ts';
import { RoomManager, type Room } from './rooms.ts';
import * as lobby from './lobby.ts';
import { Projection } from './projection.ts';
import { GameController } from './controller.ts';

export interface GameServerOptions {
  /** Theme pack folders to load (each validated at boot). */
  themeDirs: string[];
  /** Delay before each bot action, ms. */
  botDelayMs: number;
  /** Deterministic deals in tests. */
  seed?: () => string;
  /** Overrides every theme's turn length (tests). */
  turnMs?: number;
  /** The intro ends after this long even if not everyone is ready. Default 2 min. */
  introMs?: number;
  /** A room with nobody connected (no player, no TV) is closed after this long. Default 30 min. */
  idleRoomMs?: number;
}

const notHost = { ok: false, error: 'only the host can do that' } as const;
const noGame = { ok: false, error: 'game not started' } as const;

export async function createGameServer(opts: GameServerOptions) {
  const themes = await loadRegistry(opts.themeDirs);
  const rooms = new RoomManager();
  const app = express();
  /** Liveness for the host's health check (Render polls it before routing traffic to a new deploy). */
  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, themes: themes.size, rooms: rooms.all().length });
  });
  app.get('/themes', (_req, res) => {
    res.json(
      [...themes.values()].map(({ theme }) => {
        const m = theme.manifest.meta;
        return {
          id: m.id,
          titleKey: m.titleKey,
          languages: m.languages,
          defaultLanguage: m.defaultLanguage,
          players: m.players,
          title: Object.fromEntries(m.languages.map((l) => [l, theme.i18n[l]?.[m.titleKey]])),
        };
      }),
    );
  });
  for (const { theme, dir } of themes.values()) app.use(`/themes/${theme.id}`, express.static(dir, { dotfiles: 'deny' }));
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: true } });

  const projection = new Projection(io);
  const controllers = new Map<string, GameController>();
  const channel = Projection.channel;
  const broadcast = (r: Room) => projection.state(r);
  const gameOf = (room: Room) => controllers.get(room.code);
  const idleMs = opts.idleRoomMs ?? 30 * 60_000;

  /** Closes a room once nobody (player or TV) has been connected to it for `idleMs`. */
  function checkIdle(room: Room) {
    clearTimeout(room.idleTimer);
    const someone = room.watchers.size > 0 || room.seats.some((s) => !s.isBot && s.socketId);
    if (someone) return;
    room.idleTimer = setTimeout(() => {
      gameOf(room)?.dispose();
      controllers.delete(room.code);
      rooms.delete(room.code);
    }, idleMs);
  }

  const socketOf = (id?: string) => (id ? io.sockets.sockets.get(id) : undefined);

  /** Removes a lobby seat; later seats move up and their sockets are told their new seat. */
  function removeSeat(room: Room, seat: number) {
    room.seats.splice(seat, 1);
    room.seats.forEach((s, i) => {
      const sock = socketOf(s.socketId);
      if (sock && i >= seat) {
        sock.data.seat = i;
        sock.emit('room:you', { seat: i });
      }
    });
  }

  function detach(socket: Socket, room: Room) {
    socket.leave(channel(room));
    room.watchers.delete(socket.id);
    socket.data = {};
  }

  /** Drops whatever room this socket was in before (one room per connection). */
  function unbind(socket: Socket) {
    const room = socket.data?.code ? rooms.get(socket.data.code) : undefined;
    if (!room) return;
    const seat = socket.data.seat !== undefined ? room.seats[socket.data.seat] : undefined;
    detach(socket, room);
    if (seat?.socketId === socket.id) {
      seat.socketId = undefined;
      broadcast(room);
    }
    checkIdle(room);
  }

  /** Registers a validated handler: bad payloads and thrown errors become `{ ok: false }` acks. */
  function on<E extends C2SEvent>(socket: Socket, event: E, handler: (p: any) => Ack<any>) {
    socket.on(event as string, (payload: unknown, ack?: (a: Ack<any>) => void) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const parsed = C2S[event].safeParse(payload ?? {});
      if (!parsed.success) return reply({ ok: false, error: 'invalid payload' });
      try {
        reply(handler(parsed.data));
      } catch (e) {
        console.error(`[${event}]`, e);
        reply({ ok: false, error: 'server error' });
      }
    });
  }

  /**
   * Like `on`, for a seated player. TVs have no seat, so they can never reach these handlers.
   * Lobby changes are broadcast here; game changes are published by the GameController itself.
   */
  function inRoom<E extends C2SEvent>(
    socket: Socket,
    event: E,
    handler: (p: any, room: Room, seat: number) => Ack<any>,
    { broadcastOnOk = true, hostOnly = false } = {},
  ) {
    on(socket, event, (p) => {
      const room = socket.data?.code ? rooms.get(socket.data.code) : undefined;
      // The socket must still own its seat: a retired tab or a renumbered seat cannot act for someone else.
      if (!room || socket.data.seat === undefined || room.seats[socket.data.seat]?.socketId !== socket.id) {
        return { ok: false, error: 'not in a room' };
      }
      if (hostOnly && !lobby.isHost(room, socket.data.seat)) return notHost;
      const ack = handler(p, room, socket.data.seat);
      if (ack.ok && broadcastOnOk) broadcast(room);
      return ack;
    });
  }

  function seatSocket(socket: Socket, room: Room, seat: number) {
    if (socket.data?.code && (socket.data.code !== room.code || socket.data.seat !== seat)) unbind(socket);
    socket.data = { code: room.code, seat };
    socket.join(channel(room));
    clearTimeout(room.idleTimer);
  }

  io.on('connection', (socket) => {
    on(socket, 'room:create', (p) => {
      const entry = themes.get(p.themeId);
      if (!entry) return { ok: false, error: 'unknown theme' };
      unbind(socket);
      const { min, max } = entry.theme.manifest.meta.players;
      const token = randomUUID();
      const room = rooms.create(
        { name: p.name, theme: entry.theme, mode: p.mode, maxPlayers: Math.max(min, Math.min(max, p.maxPlayers)), bots: p.bots },
        { name: p.playerName, isBot: false, socketId: socket.id, token },
      );
      seatSocket(socket, room, 0);
      broadcast(room);
      return { ok: true, code: room.code, seat: 0, token };
    });

    on(socket, 'room:join', (p) => {
      const room = rooms.get(p.code);
      if (!room) return { ok: false, error: 'room not found' };
      if (room.phase !== 'lobby') return { ok: false, error: 'game already started' };
      if (room.seats.length >= room.maxPlayers) return { ok: false, error: 'room is full' };
      unbind(socket);
      const token = randomUUID();
      room.seats.push({ name: p.playerName, isBot: false, socketId: socket.id, token });
      const seat = room.seats.length - 1;
      seatSocket(socket, room, seat);
      broadcast(room);
      return { ok: true, seat, token };
    });

    on(socket, 'room:resume', (p) => {
      const room = rooms.get(p.code);
      const seat = room ? room.seats.findIndex((s) => !s.isBot && s.token === p.token) : -1;
      if (!room || seat < 0) return { ok: false, error: 'cannot resume' };
      const old = socketOf(room.seats[seat]!.socketId);
      if (old && old.id !== socket.id) {
        old.emit('room:kicked', {}); // another tab took this seat over
        detach(old, room);
      }
      room.seats[seat]!.socketId = socket.id;
      seatSocket(socket, room, seat);
      projection.resync(room, seat);
      return { ok: true, seat };
    });

    on(socket, 'room:watch', (p) => {
      const room = rooms.get(p.code);
      if (!room) return { ok: false, error: 'room not found' };
      if (room.mode === 'phones') return { ok: false, error: 'this room has no TV' };
      unbind(socket);
      socket.data = { code: room.code, watcher: true }; // no seat: a TV can never act
      socket.join(channel(room));
      room.watchers.add(socket.id);
      clearTimeout(room.idleTimer);
      broadcast(room);
      return { ok: true };
    });

    socket.on('disconnect', () => {
      const room = socket.data?.code ? rooms.get(socket.data.code) : undefined;
      if (!room) return;
      room.watchers.delete(socket.id);
      const seat = socket.data.seat !== undefined ? room.seats[socket.data.seat] : undefined;
      if (seat && seat.socketId === socket.id) {
        seat.socketId = undefined;
        broadcast(room);
      }
      checkIdle(room);
    });

    inRoom(socket, 'room:leave', (_p, room, seat) => {
      detach(socket, room);
      if (room.phase === 'lobby') removeSeat(room, seat);
      else gameOf(room)?.seatLeft(seat); // mid-game a bot takes over the seat
      broadcast(room);
      checkIdle(room);
      return { ok: true };
    }, { broadcastOnOk: false });

    inRoom(socket, 'lobby:kick', (p, room, seat) => {
      if (room.phase !== 'lobby' || p.seat === seat || !room.seats[p.seat]) return { ok: false, error: 'cannot remove that seat' };
      const target = socketOf(room.seats[p.seat]!.socketId);
      if (target) {
        target.emit('room:kicked', {});
        detach(target, room);
      }
      removeSeat(room, p.seat);
      return { ok: true };
    }, { hostOnly: true });

    inRoom(socket, 'lobby:pickChar', (p, room, seat) => lobby.pickChar(room, seat, p.characterId));
    inRoom(socket, 'lobby:fillBots', (_p, room) => lobby.fillBots(room), { hostOnly: true });
    inRoom(socket, 'lobby:start', (_p, room) => {
      const ready = lobby.prepareStart(room);
      if (!ready.ok) return ready;
      const ctl = new GameController(room, { projection, botDelayMs: opts.botDelayMs, seed: opts.seed, turnMs: opts.turnMs, introMs: opts.introMs });
      controllers.set(room.code, ctl);
      ctl.start();
      return { ok: true };
    }, { hostOnly: true, broadcastOnOk: false });

    const game = { broadcastOnOk: false };
    inRoom(socket, 'intro:ready', (_p, room, seat) => gameOf(room)?.ready(seat) ?? noGame, game);
    inRoom(socket, 'intro:skip', (_p, room) => gameOf(room)?.skipIntro() ?? noGame, { ...game, hostOnly: true });
    inRoom(socket, 'game:intent', (p, room, seat) => gameOf(room)?.apply(seat, p) ?? noGame, game);
    inRoom(socket, 'game:pause', (p, room) => gameOf(room)?.pause(p.paused) ?? noGame, { ...game, hostOnly: true });
    inRoom(socket, 'react', (p, room, seat) => gameOf(room)?.react(seat, p.stickerId) ?? noGame, game);
    inRoom(socket, 'end:vote', (p, room, seat) => gameOf(room)?.vote(seat, p.rematch) ?? noGame, game);
  });

  return {
    app,
    io,
    httpServer,
    listen(port: number) {
      return new Promise<number>((resolve) => {
        httpServer.listen(port, () => resolve((httpServer.address() as { port: number }).port));
      });
    },
    close() {
      return new Promise<void>((resolve) => {
        for (const c of controllers.values()) c.dispose();
        for (const r of rooms.all()) clearTimeout(r.idleTimer);
        io.close();
        httpServer.close(() => resolve());
      });
    },
  };
}
