import { DUSK, fill, type SceneMaker } from './kit';

/**
 * cassetto, as a picture: a small call graph on a slate. One symbol at a
 * time is looked up; the calls it makes light up one way (lantern amber),
 * the things that call it the other (moonlit lilac), and then whatever would
 * be touched one step further out.
 */

/** Where each symbol sits, as fractions of the slate inside its margin, so the graph fits any size. */
const NODES = [
  [0.05, 0.5],
  [0.27, 0.2],
  [0.27, 0.8],
  [0.5, 0.08],
  [0.5, 0.5],
  [0.5, 0.92],
  [0.74, 0.26],
  [0.74, 0.74],
  [0.95, 0.5],
];
/** Calls, as [caller, callee]. */
const CALLS = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [2, 5],
  [3, 6],
  [4, 6],
  [4, 7],
  [5, 7],
  [6, 8],
  [7, 8],
];
/** The symbols looked up, in turn. */
const LOOKUPS = [4, 6, 2];
const TURN = 4000;
/** Within a turn: the cursor lands, the first ring of calls runs, then the second, then it all goes dark again. */
const RING_1 = 350;
const RING_2 = 1250;
const FADE = 3300;
const RUN = 800;

export const cassetto: SceneMaker = (w, h) => {
  const margin = { x: Math.round(w * 0.1), y: Math.round(h * 0.16) };
  const floor = { x: margin.x, y: margin.y, w: w - 2 * margin.x, h: h - 2 * margin.y };

  const nodes = NODES.map(([fx, fy]) => [floor.x + Math.round(fx * (floor.w - 1)), floor.y + Math.round(fy * (floor.h - 1))]);
  /** Every call as the pixels of its wire, from caller to callee: along, then up or down, then along. */
  const wires = CALLS.map(([from, to]) => {
    const [ax, ay] = nodes[from];
    const [bx, by] = nodes[to];
    const turn = Math.round((ax + bx) / 2);
    const pixels: number[][] = [];
    for (let x = ax + 2; x <= turn; x += 1) pixels.push([x, ay]);
    for (let y = ay; y !== by; y += Math.sign(by - ay)) pixels.push([turn, y]);
    for (let x = turn; x <= bx - 2; x += 1) pixels.push([x, by]);
    return pixels;
  });

  const node = (context: CanvasRenderingContext2D, [x, y]: number[], color: string) => fill(context, color, x - 1, y - 1, 3, 3);

  return {
    loop: TURN * LOOKUPS.length,
    rest: RING_2 + RUN + 300,
    draw(context, ms) {
      const turn = Math.floor(ms / TURN) % LOOKUPS.length;
      const t = ms % TURN;
      const symbol = LOOKUPS[turn];
      const fading = t >= FADE;
      const gone = t >= FADE + 350;

      // a wall a step lighter than the page, so the window it is seen through shows
      fill(context, DUSK.slate, 0, 0, w, h);
      // the graph at rest
      wires.forEach((wire) => wire.forEach(([x, y]) => fill(context, DUSK.blue, x, y)));
      nodes.forEach((at) => node(context, at, DUSK.periwinkle));
      if (gone) return;

      /** How far along its wire a pulse that set off at `start` has run, 0 to 1. */
      const run = (start: number) => Math.min(Math.max((t - start) / RUN, 0), 1);
      const lit = new Map<number, string>();
      const pulse = (call: number, from: 'caller' | 'callee', start: number, color: string) => {
        const wire = wires[call];
        const reach = Math.round(run(start) * wire.length);
        for (let i = 0; i < reach; i += 1) {
          const [x, y] = wire[from === 'caller' ? i : wire.length - 1 - i];
          fill(context, color, x, y);
        }
        if (reach === wire.length) lit.set(CALLS[call][from === 'caller' ? 1 : 0], color);
      };

      // first ring: what the symbol calls (amber), and what calls it (lilac)
      const amber = fading ? DUSK.woodLight : DUSK.amber;
      const lilac = fading ? DUSK.violet : DUSK.lilac;
      const callees = CALLS.filter(([caller]) => caller === symbol).map(([, callee]) => callee);
      const callers = CALLS.filter(([, callee]) => callee === symbol).map(([caller]) => caller);
      CALLS.forEach(([caller, callee], call) => {
        if (caller === symbol) pulse(call, 'caller', RING_1, amber);
        else if (callee === symbol) pulse(call, 'callee', RING_1, lilac);
        // second ring: one step further out, the same two ways
        else if (callees.includes(caller)) pulse(call, 'caller', RING_2, amber);
        else if (callers.includes(callee)) pulse(call, 'callee', RING_2, lilac);
      });
      lit.forEach((color, id) => node(context, nodes[id], color));

      // the symbol itself, and the cursor around it
      const [x, y] = nodes[symbol];
      node(context, nodes[symbol], fading ? DUSK.amber : DUSK.gold);
      if (!fading && (t > RING_1 || Math.floor(t / 90) % 2 === 0)) {
        context.fillStyle = DUSK.gold;
        for (const [dx, dy, dw, dh] of [[-3, -3, 2, 1], [2, -3, 2, 1], [-3, 3, 2, 1], [2, 3, 2, 1], [-3, -2, 1, 1], [3, -2, 1, 1], [-3, 2, 1, 1], [3, 2, 1, 1]]) {
          context.fillRect(x + dx, y + dy, dw, dh);
        }
      }
    },
  };
};
