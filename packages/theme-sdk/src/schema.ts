import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9_-]+$/);
const cell = z.string().regex(/^\d+,\d+$/, 'cell must be "col,row"');
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
/** Pack-relative path. `{lang}` is replaced by the viewer's language, for art that contains text. */
const asset = z.string().min(1);

const card = z.object({ id, nameKey: z.string(), art: asset });

export const RulesSchema = z.object({
  turnSeconds: z.number().int().positive().default(60),
  dieSides: z.number().int().min(2).default(6),
  accusationsPerPlayer: z.number().int().min(1).default(1),
});

export const ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({
    id,
    titleKey: z.string(),
    languages: z.array(z.string()).min(1),
    defaultLanguage: z.string(),
    players: z.object({ min: z.number().int().min(2), max: z.number().int() }),
    victim: z.object({ nameKey: z.string(), art: asset }),
  }),
  deck: z.object({
    suspects: z.array(card.extend({ color, glyph: z.string().min(1), start: cell })),
    rooms: z.array(card),
    objects: z.array(card),
  }),
  board: z.object({
    map: z.array(z.string()).min(1),
    legend: z.record(z.string().length(1), z.string()),
    doors: z.array(z.object({ room: id, cell })),
    secretPassages: z.array(z.tuple([id, id])).default([]),
  }),
  rules: RulesSchema.default(RulesSchema.parse({})),
  story: z.object({
    chapters: z.array(
      z.object({
        id,
        autoplay: z.boolean().optional(),
        panels: z.array(z.object({ art: asset, captionKey: z.string(), ms: z.number().optional() })),
      }),
    ),
  }),
  ui: z.object({
    tokens: z.object({
      color: z.record(z.string(), color),
      font: z.object({ display: z.string(), ui: z.string(), glyph: z.string() }),
      radius: z.record(z.string(), z.number()).optional(),
      shadow: z.string().optional(),
    }),
    logo: asset,
    cardBack: asset,
    ghostGlyph: z.string(),
    stickers: z.array(z.object({ id, labelKey: z.string(), art: asset.optional(), color: color.optional(), textColor: color.optional() })),
    awards: z.array(z.object({ stat: z.string(), labelKey: z.string(), lowest: z.boolean().optional(), color: color.optional() })),
    tutorial: z.array(z.object({ target: z.string(), textKey: z.string() })),
    sfx: z.record(z.string(), asset).optional(),
    haptics: z.record(z.string(), z.string()).optional(),
    /** Which die faces are drawn in the accent colour (CNY dice paint 1 and 4 red). */
    dice: z.object({ accentFaces: z.array(z.number().int().min(1)) }).optional(),
  }),
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type Rules = z.infer<typeof RulesSchema>;
