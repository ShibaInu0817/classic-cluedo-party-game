// End-to-end smoke test in a real browser: two phones, bots and a TV play through lobby → intro → turns → accusation.
// Run with `pnpm e2e` (builds the client first). Uses the system Chrome, so no browser download is needed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3200 + Math.floor(Math.random() * 500);
const URL = `http://localhost:${PORT}`;
const OUT = process.env.E2E_SHOTS; // optional folder for screenshots

const server = spawn('npx', ['tsx', 'apps/server/src/main.ts'], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT), BOT_DELAY_MS: '200' }, stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => String(d).includes('game server on') && resolve());
  server.on('exit', (c) => reject(new Error(`server exited ${c}`)));
});

const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'chrome' });
const errors = [];
const shot = (p, name) => (OUT ? p.screenshot({ path: path.join(OUT, `${name}.png`) }) : undefined);
async function page(viewport) {
  const p = await (await browser.newContext({ viewport })).newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  return p;
}
const phone = () => page({ width: 390, height: 844 });
const step = (name) => console.log(`· ${name}`);

try {
  step('host creates a room');
  const host = await phone();
  await host.goto(URL);
  await host.getByRole('button', { name: 'English' }).click();
  await host.getByLabel('Your name').fill('Mei');
  await host.getByRole('button', { name: 'Create room' }).click();
  await host.getByRole('button', { name: 'Create', exact: true }).click();
  const code = (await host.getByTestId('room-code').textContent()).trim();
  assert.match(code, /^\d{4}$/);

  step('a guest joins by link, the TV watches');
  const guest = await phone();
  await guest.goto(`${URL}/?code=${code}`);
  await guest.getByRole('button', { name: 'English' }).click();
  await guest.getByLabel('Your name').fill('Ah Beng');
  await guest.getByRole('button', { name: 'Join', exact: true }).click();
  await guest.getByTestId('room-code').waitFor();
  const tv = await page({ width: 1280, height: 720 });
  await tv.goto(`${URL}/tv?code=${code}`);
  await tv.getByRole('button', { name: 'English' }).click(); // the TV starts in the theme's default language
  await tv.getByRole('img', { name: /Scan to join/ }).waitFor();

  step('characters, bots, start');
  await host.getByRole('button', { name: /^Cousin/ }).click();
  await host.getByRole('button', { name: 'Fill with bots' }).click();
  await shot(host, '1-lobby');
  await host.getByRole('button', { name: 'Start' }).click();

  step('intro: guest reads and readies, host skips for everyone');
  await guest.getByRole('button', { name: 'Skip story' }).click();
  await guest.getByRole('button', { name: 'Next' }).click();
  await guest.getByRole('heading', { name: /^You are/ }).waitFor();
  await guest.getByRole('button', { name: 'Next' }).click();
  await guest.getByRole('button', { name: 'Ready' }).click();
  await tv.getByText(/· Ready/).first().waitFor();
  await host.getByRole('button', { name: 'Skip for everyone' }).click();

  step('host plays a turn');
  for (const p of [host, guest]) {
    // first game on this device: the tutorial opens over the board
    const tut = p.getByRole('dialog', { name: 'Tutorial' });
    await tut.waitFor();
    await tut.getByRole('button', { name: 'Skip' }).click();
  }
  await host.getByRole('button', { name: 'Roll' }).click({ force: true });
  const reach = host.getByTestId('board').getByRole('button');
  await reach.first().waitFor();
  await shot(host, '2-rolled');
  await reach.first().click({ force: true });
  const suggest = host.getByRole('button', { name: 'Make a suggestion' });
  if (await suggest.isVisible().catch(() => false)) {
    await suggest.click();
    const d = host.getByRole('dialog', { name: 'Make a suggestion' });
    await d.getByRole('radio').nth(0).check({ force: true });
    await d.getByRole('radio').nth(6).check({ force: true });
    await d.getByRole('button', { name: 'Confirm' }).click();
  }
  const show = guest.getByRole('dialog', { name: /suggested/ });
  if (await show.isVisible({ timeout: 1500 }).catch(() => false)) await show.getByRole('button').first().click();
  const gotIt = host.getByRole('button', { name: 'Got it' });
  if (await gotIt.isVisible({ timeout: 1500 }).catch(() => false)) await gotIt.click();
  await host.getByRole('button', { name: 'End turn' }).click();

  step('the guest accuses on their turn');
  await guest.getByRole('button', { name: 'Roll' }).waitFor({ timeout: 20_000 });
  await shot(tv, '3-tv-play');
  await guest.getByRole('button', { name: 'Accuse' }).click();
  const a = guest.getByRole('dialog', { name: 'Accuse' });
  for (const i of [0, 6, 14]) await a.getByRole('radio').nth(i).check({ force: true });
  await a.getByRole('button', { name: 'Accuse' }).click();
  await a.getByRole('button', { name: 'Confirm' }).click();
  // Right or wrong, the TV plays the accusation moment and stamps the verdict, never the guess.
  const tvMoment = tv.getByRole('region', { name: /Ah Beng accuses!|Ah Beng 发起指控！/ });
  await tvMoment.getByText(/^(WRONG|CORRECT|错误|正确)$/).waitFor();
  step('TV showed the accusation moment');
  const outcome = await Promise.race([
    guest.getByRole('dialog', { name: /Wrong!/ }).waitFor().then(() => 'ghost'),
    guest.getByRole('region', { name: 'Reveal' }).waitFor().then(() => 'won'),
  ]);
  step(`accusation result: ${outcome}`);
  await shot(guest, '4-after-accuse');
  assert.deepEqual(errors, [], `page errors: ${errors.join('; ')}`);
  console.log('✓ e2e smoke passed');
} finally {
  await browser.close();
  server.kill();
}
