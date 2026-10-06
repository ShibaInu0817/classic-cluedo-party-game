import type { Manifest } from './schema.ts';

/** Every asset path the manifest points at. */
export function assetRefs(m: Manifest): string[] {
  const out = [m.meta.victim.art, m.ui.logo, m.ui.cardBack];
  for (const c of [...m.deck.suspects, ...m.deck.rooms, ...m.deck.objects]) out.push(c.art);
  for (const ch of m.story.chapters) for (const p of ch.panels) out.push(p.art);
  for (const s of m.ui.stickers) if (s.art) out.push(s.art);
  for (const f of Object.values(m.ui.sfx ?? {})) out.push(f);
  return out;
}

/** Every i18n key the manifest uses. */
export function i18nRefs(m: Manifest): string[] {
  const out = [m.meta.titleKey, m.meta.victim.nameKey];
  for (const c of [...m.deck.suspects, ...m.deck.rooms, ...m.deck.objects]) out.push(c.nameKey);
  for (const ch of m.story.chapters) for (const p of ch.panels) out.push(p.captionKey);
  for (const s of m.ui.stickers) out.push(s.labelKey);
  for (const a of m.ui.awards) out.push(a.labelKey);
  for (const t of m.ui.tutorial) out.push(t.textKey);
  return out;
}
