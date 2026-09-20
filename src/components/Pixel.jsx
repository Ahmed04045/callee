// src/components/Pixel.jsx
//
// Placeholders that follow the current STYLE (see src/theme/theme.js):
//   pixel  — crisp SVG pixel art in the theme's colours
//   plain  — clean equivalents (initial avatars, smooth gradients, icon tiles)
//   PixelAvatar  — people without a photo
//   PixelCover   — cards/banners without an image
//   PixelSprite  — small illustrations for empty states (ghost, search, box)
//   PixelEmpty   — sprite + title + text for empty states
// Replace any of these with your own artwork later; every call site goes
// through this file.

import React, { useMemo } from 'react';
import themeConfig from '../theme/themeConfig';
import { useTheme } from '../theme/theme';
import Icon from './Icon';

const C = (name, alpha) => (alpha === undefined ? `rgb(var(--md3-${name}))` : `rgb(var(--md3-${name}) / ${alpha})`);

// Small seeded PRNG so the same seed always draws the same picture.
function seeded(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) {
    h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const AVATAR_COLORS = ['primary', 'secondary', 'tertiary', 'onPrimaryContainer'];

/** 6x6 mirrored identicon, coloured from the theme. */
export function PixelAvatar({ seed = '?', size = 40, className = '' }) {
  const { style } = useTheme();
  const cells = useMemo(() => {
    const rnd = seeded(seed);
    const color = AVATAR_COLORS[Math.floor(rnd() * AVATAR_COLORS.length)];
    const out = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 3; x++) {
        if (rnd() > 0.5) {
          out.push([x, y], [5 - x, y]);
        }
      }
    }
    return { color, out };
  }, [seed]);

  if (style !== 'pixel') {
    const first = String(seed).trim()[0];
    const letter = first && /[a-z]/i.test(first) ? first.toUpperCase() : null;
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        className={`inline-flex items-center justify-center shrink-0 rounded-[var(--r-full)] bg-md3-primaryContainer text-md3-onPrimaryContainer font-display font-bold ${className}`}
      >
        {letter ?? <Icon name="person" size={size * 0.55} />}
      </span>
    );
  }

  return (
    <svg width={size} height={size} viewBox="-1 -1 8 8" shapeRendering="crispEdges" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect x="-1" y="-1" width="8" height="8" fill={C('surfaceContainerHigh')} />
      {cells.out.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={C(cells.color)} />
      ))}
    </svg>
  );
}

// 4x4 Bayer matrix for ordered dithering.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Dithered two-colour pixel gradient (left→right with a diagonal tilt).
 * `from` / `to` are CSS colours; default to the theme's primary/secondary.
 */
export function PixelCover({ from, to, seed = 'cover', cols = 48, rows = 12, className = '' }) {
  const { style } = useTheme();
  const a = from ?? C('primary');
  const b = to ?? C('secondary');
  const rects = useMemo(() => {
    const rnd = seeded(seed);
    const tilt = 0.25 + rnd() * 0.5;
    const list = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = Math.min(1, Math.max(0, (x / cols) * (1 - tilt) + (y / rows) * tilt));
        list.push([x, y, t * 16 > BAYER[y % 4][x % 4]]);
      }
    }
    return list;
  }, [seed, cols, rows]);

  if (style !== 'pixel') {
    const angle = 100 + Math.floor(seeded(seed)() * 80);
    return (
      <div
        aria-hidden="true"
        className={`w-full h-full ${className}`}
        style={{ backgroundImage: `linear-gradient(${angle}deg, ${a}, ${b})` }}
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={`w-full h-full block ${className}`}
      aria-hidden="true"
    >
      <rect width={cols} height={rows} fill={a} />
      {rects.map(([x, y, useB]) => (useB ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={b} /> : null))}
    </svg>
  );
}

const SPRITES = {
  ghost: [
    '....####....',
    '..########..',
    '.##########.',
    '.##xx##xx##.',
    '.##xx##xx##.',
    '.##########.',
    '.##########.',
    '.##########.',
    '.##########.',
    '.##.####.##.',
    '.#...##...#.',
    '............',
  ],
  search: [
    '..######....',
    '.#......#...',
    '#........#..',
    '#........#..',
    '#........#..',
    '.#......#...',
    '..######.#..',
    '.........##.',
    '..........##',
    '...........#',
  ],
  box: [
    '............',
    '..########..',
    '.#oooooooo#.',
    '#oooooooooo#',
    '############',
    '#..........#',
    '#....##....#',
    '#....##....#',
    '#..........#',
    '############',
  ],
};

const SPRITE_FILL = { '#': 'primary', o: 'secondary', x: 'surface' };

const PLAIN_SPRITE_ICON = { ghost: 'inbox', search: 'search_off', box: 'inbox' };

export function PixelSprite({ sprite = 'ghost', size = 96, className = '' }) {
  const { style } = useTheme();
  const rows = SPRITES[sprite] ?? SPRITES.ghost;
  if (style !== 'pixel') {
    const tile = Math.round(size * 0.8);
    return (
      <span
        aria-hidden="true"
        style={{ width: tile, height: tile }}
        className={`inline-flex items-center justify-center rounded-[var(--r-lg)] bg-md3-primaryContainer text-md3-onPrimaryContainer ${className}`}
      >
        <Icon name={PLAIN_SPRITE_ICON[sprite] ?? 'inbox'} size={Math.round(tile * 0.5)} />
      </span>
    );
  }
  const w = Math.max(...rows.map((r) => r.length));
  return (
    <svg width={size} height={(size * rows.length) / w} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" className={className} aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (SPRITE_FILL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={C(SPRITE_FILL[ch])} /> : null)),
      )}
    </svg>
  );
}

export function PixelEmpty({ title, children, sprite = 'ghost', className = '' }) {
  const { colors } = themeConfig;
  return (
    <div className={`flex flex-col items-center text-center gap-2 py-8 ${className}`}>
      <PixelSprite sprite={sprite} size={72} />
      <p className={`text-sm font-bold ${colors.textWhite} mt-2`}>{title}</p>
      {children && <div className={`text-xs ${colors.textFaint} max-w-xs`}>{children}</div>}
    </div>
  );
}
