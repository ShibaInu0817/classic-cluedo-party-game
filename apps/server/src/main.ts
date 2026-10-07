// Entry point: loads every theme pack under themes/ (folders starting with "_" are test fixtures),
// serves them and, in production, the built client.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createGameServer } from './server.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const THEMES = path.join(ROOT, 'themes');
const themeDirs = readdirSync(THEMES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(path.join(THEMES, d.name, 'theme.json')))
  .map((d) => path.join(THEMES, d.name));

const server = await createGameServer({ themeDirs, botDelayMs: Number(process.env.BOT_DELAY_MS ?? 1000) });

const dist = path.join(ROOT, 'apps/client/dist');
if (existsSync(dist)) {
  server.app.use(express.static(dist));
  server.app.get(/^(?!\/themes|\/socket\.io).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = await server.listen(Number(process.env.PORT ?? 3001));
console.log(`game server on http://localhost:${port} · themes: ${themeDirs.map((d) => path.basename(d)).join(', ')}`);

// Hosts stop the process with SIGTERM on every deploy: close sockets and timers, then exit promptly.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    console.log(`${signal}: shutting down`);
    void server.close().then(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref(); // never hang the deploy
  });
}
