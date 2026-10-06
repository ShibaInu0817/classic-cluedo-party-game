#!/usr/bin/env node
// One-off: renders the prototype's SVG generators (game-art.js) into static files for themes/cny-guest.
// The prototype keys art by Chinese name; the pack keys it by card id (S01…, R01…, O01…).
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'prototype/design_handoff_who_killed_the_guest/prototype/game-art.js');
const OUT = path.join(ROOT, 'themes/cny-guest/assets');

let src = readFileSync(SRC, 'utf8');
const end = src.lastIndexOf('})();');
src = src.slice(0, end) +
  'window.__RAW={PORTRAIT,ROOM,OBJ,BACK,VICTIM,SUS,ROOMS,OBJS,storyScene,murderScene,story2Scene,setupScene};\n' +
  src.slice(end);

const window = { GA_LANG: 'zh' };
vm.runInNewContext(src, { window, React: { createElement: () => null }, console });
const A = window.__RAW;

const svg = (inner, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>\n`;
const write = (rel, content) => {
  const f = path.join(OUT, rel);
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, content);
  return rel;
};
const id = (p, i) => p + String(i + 1).padStart(2, '0');
const CARD = '0 0 246 208';

A.SUS.forEach((n, i) => write(`suspects/${id('S', i)}.svg`, svg(A.PORTRAIT[n](), CARD)));
A.ROOMS.forEach((n, i) => write(`rooms/${id('R', i)}.svg`, svg(A.ROOM[n](), CARD)));
A.OBJS.forEach((n, i) => write(`objects/${id('O', i)}.svg`, svg(A.OBJ[n](), CARD)));
write('guest.svg', svg(A.PORTRAIT['客人'](), CARD));

for (const lang of ['zh', 'en']) {
  window.GA_LANG = lang;
  write(`card-back.${lang}.svg`, svg(A.BACK(), '0 0 252 352'));
  write(`victim.${lang}.svg`, svg(A.VICTIM(), CARD));
  for (let i = 0; i < 3; i++) write(`story/arrival/${i + 1}.${lang}.svg`, svg(A.storyScene(i), '0 0 360 360'));
  for (let i = 0; i < 6; i++) write(`story/murder/${i + 1}.${lang}.svg`, svg(A.murderScene(i), '0 0 360 360'));
  for (let i = 0; i < 4; i++) write(`story/briefing/${i + 1}.${lang}.svg`, svg(A.story2Scene(i, A.SUS), '0 0 360 360'));
}
console.log('exported CNY art to', path.relative(ROOT, OUT));
