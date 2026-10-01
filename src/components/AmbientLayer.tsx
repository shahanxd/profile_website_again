import { useEffect, useRef } from 'react';
import { isStill, useHydrated } from '../motion/live';
import { isQuiet, onQuiet } from '../motion/quiet';
import { watch } from '../motion/watch';
import { useSplit } from '../split/store';

/** 30 frames a second is plenty for things that drift. */
const FRAME_MS = 1000 / 30;
/** One mote for about this many canvas pixels: sparse. */
const AREA_PER_MOTE = 8000;

/** Blossom pinks and firefly ambers, from the two stagings' palettes. */
const PETAL = ['#f98191', '#f76476', '#f99fa4', '#fdbfb7'];
const FIREFLY = ['#ffd84d', '#f6b35d'];

/** A falling petal turns through three two-by-two shapes as it flutters. */
const PETAL_SHAPES = [
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
];

interface Mote {
  x: number;
  y: number;
  /** How closely it follows the page when it scrolls: 1 moves with the text, less hangs back. */
  depth: number;
  phase: number;
  speed: number;
  sway: number;
  tint: number;
}

/** A small seeded generator, so the frozen frame (?still=1) is the same every time. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (value: number, size: number) => ((value % size) + size) % size;

/**
 * The air of the garden, continued down the page: a few blossom petals
 * falling (creative) or fireflies wandering (tech). It is one fixed canvas,
 * one canvas pixel to a page pixel, enlarged crisply, and it lies behind the
 * page's content: motes pass under the words and cards, never over them, and
 * the hero (which has its own air) hides them altogether. It draws 30 times
 * a second, but only while the page below the hero is on screen, and it
 * stops and fades out while serious content is being read (quiet.ts). With
 * motion off it is not there at all; with ?still=1 it is one frozen frame.
 */
export function AmbientLayer() {
  const { split, motion } = useSplit();
  const hydrated = useHydrated();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shown = hydrated && motion;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const frozen = isStill();
    let unit = 4;
    let motes: Mote[] = [];
    let request = 0;
    let last = 0;
    let time = 0;

    const size = () => {
      unit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 4;
      const [columns, rows] = [Math.ceil(innerWidth / unit), Math.ceil(innerHeight / unit)];
      canvas.width = columns;
      canvas.height = rows;
      canvas.style.width = `${columns * unit}px`;
      canvas.style.height = `${rows * unit}px`;
      const random = seeded(split === 'tech' ? 11 : 5);
      const count = Math.min(Math.max(Math.round((columns * rows) / AREA_PER_MOTE), 5), 16);
      motes = Array.from({ length: count }, () => ({
        x: random() * columns,
        y: random() * rows,
        depth: 0.75 + random() * 0.25,
        phase: random() * Math.PI * 2,
        speed: 0.6 + random() * 0.8,
        sway: 0.5 + random(),
        tint: Math.floor(random() * 4),
      }));
    };

    const draw = () => {
      const { width, height } = canvas;
      context.clearRect(0, 0, width, height);
      const scrolled = frozen ? 0 : scrollY / unit;
      for (const mote of motes) {
        const x = Math.floor(mote.x);
        const y = Math.floor(wrap(mote.y - scrolled * mote.depth, height + 6)) - 3;
        if (split === 'tech') paintFirefly(context, mote, x, y, time);
        else paintPetal(context, mote, x, y, time);
      }
      context.globalAlpha = 1;
    };

    const move = (seconds: number) => {
      const { width, height } = canvas;
      for (const mote of motes) {
        if (split === 'tech') {
          // a slow wander, a little upward
          mote.x = wrap(mote.x + Math.cos(time * 0.31 * mote.speed + mote.phase) * 1.6 * seconds, width);
          mote.y = wrap(mote.y + (Math.sin(time * 0.23 * mote.speed + mote.phase * 2) * 1.4 - 0.5) * seconds, height + 6);
        } else {
          // falling, swaying, carried a little by a breeze
          mote.x = wrap(mote.x + (Math.sin(time * 0.9 + mote.phase) * 2.2 * mote.sway + 0.8) * seconds, width);
          mote.y = wrap(mote.y + 3.2 * mote.speed * seconds, height + 6);
        }
      }
    };

    const frame = (now: number) => {
      request = requestAnimationFrame(frame);
      if (now - last < FRAME_MS - 1) return;
      // The browser stops these callbacks in a hidden tab; the cap keeps the motes from jumping when it comes back.
      const seconds = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += seconds;
      move(seconds);
      draw();
    };

    const onResize = () => {
      size();
      draw();
    };

    // The loop runs only while there is page for the motes to be seen on, and no call for quiet.
    let onPage = false;
    const update = () => {
      cancelAnimationFrame(request);
      if (frozen || !onPage || isQuiet()) return;
      last = performance.now();
      request = requestAnimationFrame(frame);
    };
    const page = document.querySelector('main');
    const unwatch = page
      ? watch(page, (visible) => {
          onPage = visible;
          update();
        })
      : undefined;
    const unquiet = onQuiet(update);

    size();
    draw();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(request);
      window.removeEventListener('resize', onResize);
      unwatch?.();
      unquiet();
    };
  }, [split, shown]);

  if (!shown) return null;
  return <canvas ref={canvasRef} className="ambient" aria-hidden="true" />;
}

function paintPetal(context: CanvasRenderingContext2D, mote: Mote, x: number, y: number, time: number) {
  const shape = PETAL_SHAPES[Math.floor(time * 1.6 * mote.speed + mote.phase) % PETAL_SHAPES.length];
  context.globalAlpha = 0.9;
  shape.forEach(([dx, dy], i) => {
    context.fillStyle = PETAL[(mote.tint + (i ? 0 : 2)) % PETAL.length];
    context.fillRect(x + dx, y + dy, 1, 1);
  });
}

function paintFirefly(context: CanvasRenderingContext2D, mote: Mote, x: number, y: number, time: number) {
  // Three states, held: out, lit, and lit with a halo. No fading between them.
  const glow = Math.sin(time * 0.9 * mote.speed + mote.phase);
  if (glow < -0.35) return;
  context.fillStyle = FIREFLY[0];
  context.globalAlpha = glow > 0.3 ? 1 : 0.6;
  context.fillRect(x, y, 1, 1);
  if (glow <= 0.3) return;
  context.fillStyle = FIREFLY[1];
  context.globalAlpha = 0.3;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) context.fillRect(x + dx, y + dy, 1, 1);
}
