import { io, type Socket } from 'socket.io-client';
import type { Ack } from '@cluedo/protocol';

/** The client's only door to the server. Tests swap in a fake at this seam. */
export interface GameSocket {
  ask<T = {}>(event: string, payload?: unknown): Promise<Ack<T>>;
  on(event: string, cb: (data: any) => void): () => void;
}

export function connectSocket(url?: string): GameSocket {
  const s: Socket = url ? io(url) : io();
  return {
    async ask(event, payload = {}) {
      try {
        return await s.timeout(5000).emitWithAck(event, payload);
      } catch {
        return { ok: false, error: 'no response from server' };
      }
    },
    on(event, cb) {
      s.on(event, cb);
      return () => s.off(event, cb);
    },
  };
}
