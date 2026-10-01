import { BAYER, DUSK, fill, type SceneMaker } from './kit';

/**
 * metagross, as a picture: a patch of ground seen from above. The rover may
 * only plan through cells its camera has seen; everything else stays hatched
 * and off limits, so it finds the ditch, follows it to the gap, and only then
 * crosses. It is a small real search (below), run once and replayed, not a
 * drawn path.
 */

const CELL = 8;
/** Headings: right, down, left, up. */
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
/** How far the camera sees, in cells, and the cosine of half its angle of view. */
const RANGE = 3.3;
const HALF_VIEW = Math.cos((52 * Math.PI) / 180);
/** A step is quicker the more seen, clear ground lies ahead: it drives only as fast as it can stop. */
const STEP_MS = [500, 380, 280, 230];
const LEAD = 700;
const CLEAR = 800;
/** The loop is never shorter than this: on a small patch the rover waits longer at the goal. */
const SHORTEST = 10000;

const FREE = 0;
const DITCH = 1;
const ROCK = 2;

/** The rover from above, heading right: wheels, brass body, mast light, two headlights. */
const ROVER = ['kk..kk', 'bbbbb.', 'bbobby', 'bbobby', 'bbbbb.', 'kk..kk'];
const ROVER_INK: Record<string, string> = { k: DUSK.deep, b: DUSK.brass, o: DUSK.orange, y: DUSK.cream };

/** Rocks, as fractions of the patch, so they keep their places at any size. */
const ROCKS = [
  [0.2, 0.36],
  [0.34, 0.1],
  [0.76, 0.62],
  [0.66, 0.9],
];

interface Step {
  x: number;
  y: number;
  heading: number;
  /** When the rover arrives in this cell, in milliseconds from the start of the drive. */
  at: number;
}

/** Runs the search on a patch of this many cells. */
function explore(cols: number, rows: number) {
  const index = (x: number, y: number) => y * cols + x;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;
  const ground = new Uint8Array(cols * rows);
  /** The step on which each cell was first seen, or -1. */
  const seenAt = new Int16Array(cols * rows).fill(-1);
  const start = [1, rows - 2];
  const goal = [cols - 2, 1];
  const ditch = Math.round(cols * 0.5);
  const gap = Math.round(rows * 0.64);

  for (let y = 0; y < rows; y += 1) if (y !== gap) ground[index(ditch, y)] = DITCH;
  for (const [fx, fy] of ROCKS) {
    const x = Math.round(fx * (cols - 1));
    const y = Math.round(fy * (rows - 1));
    const taken = (x === start[0] && y === start[1]) || (x === goal[0] && y === goal[1]) || Math.abs(x - ditch) < 2;
    if (!taken) ground[index(x, y)] = ROCK;
  }

  let [x, y] = start;
  let heading = 0;
  const steps: Step[] = [{ x, y, heading, at: 0 }];

  const look = (step: number) => {
    for (let cy = y - 4; cy <= y + 4; cy += 1) {
      for (let cx = x - 4; cx <= x + 4; cx += 1) {
        if (!inside(cx, cy) || seenAt[index(cx, cy)] >= 0) continue;
        const [dx, dy] = [cx - x, cy - y];
        const far = Math.hypot(dx, dy);
        const near = Math.max(Math.abs(dx), Math.abs(dy)) <= 1;
        const ahead = far <= RANGE && (dx * DX[heading] + dy * DY[heading]) / far >= HALF_VIEW;
        if (near || ahead) seenAt[index(cx, cy)] = step;
      }
    }
  };

  const open = (cx: number, cy: number) => inside(cx, cy) && seenAt[index(cx, cy)] >= 0 && ground[index(cx, cy)] === FREE;

  /** Distances from the rover through seen, clear cells, and how each cell was reached. */
  const flood = () => {
    const far = new Int16Array(cols * rows).fill(-1);
    const from = new Int16Array(cols * rows).fill(-1);
    const queue = [index(x, y)];
    far[queue[0]] = 0;
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      const [cx, cy] = [cell % cols, Math.floor(cell / cols)];
      for (let d = 0; d < 4; d += 1) {
        const [nx, ny] = [cx + DX[d], cy + DY[d]];
        if (!open(nx, ny) || far[index(nx, ny)] >= 0) continue;
        far[index(nx, ny)] = far[cell] + 1;
        from[index(nx, ny)] = cell;
        queue.push(index(nx, ny));
      }
    }
    return { far, from };
  };

  look(0);
  for (let step = 1; step < 160 && !(x === goal[0] && y === goal[1]); step += 1) {
    const { far, from } = flood();
    let target = far[index(goal[0], goal[1])] >= 0 ? index(goal[0], goal[1]) : -1;
    if (target < 0) {
      // The goal cannot be reached through what has been seen: go and look from the most promising edge of it.
      let best = Infinity;
      for (let cell = 0; cell < far.length; cell += 1) {
        if (far[cell] <= 0) continue;
        const [cx, cy] = [cell % cols, Math.floor(cell / cols)];
        const edge = [0, 1, 2, 3].some((d) => inside(cx + DX[d], cy + DY[d]) && seenAt[index(cx + DX[d], cy + DY[d])] < 0);
        if (!edge) continue;
        const cost = far[cell] + 1.4 * Math.hypot(goal[0] - cx, goal[1] - cy);
        if (cost < best) [best, target] = [cost, cell];
      }
    }
    if (target < 0) break;
    let next = target;
    while (from[next] !== index(x, y)) next = from[next];
    const [nx, ny] = [next % cols, Math.floor(next / cols)];
    heading = DX.findIndex((dx, d) => dx === nx - x && DY[d] === ny - y);
    let clear = 0;
    while (clear < 3 && open(nx + DX[heading] * (clear + 1), ny + DY[heading] * (clear + 1))) clear += 1;
    [x, y] = [nx, ny];
    look(step);
    steps.push({ x, y, heading, at: steps[steps.length - 1].at + STEP_MS[clear] });
  }

  return { ground, seenAt, steps, goal, index };
}

export const metagross: SceneMaker = (w, h) => {
  const cols = Math.max(Math.floor(w / CELL), 8);
  const rows = Math.max(Math.floor(h / CELL), 6);
  const ox = Math.floor((w - cols * CELL) / 2);
  const oy = Math.floor((h - rows * CELL) / 2);
  const { ground, seenAt, steps, goal, index } = explore(cols, rows);
  const drive = steps[steps.length - 1].at;
  const hold = Math.max(SHORTEST - LEAD - drive - CLEAR, 1700);
  const loop = LEAD + drive + hold + CLEAR;

  /** Ground nobody has looked at: hatched, edge to edge. */
  const hatch = (context: CanvasRenderingContext2D) => {
    fill(context, DUSK.indigo, 0, 0, w, h);
    context.fillStyle = DUSK.blue;
    for (let y = 0; y < h; y += 1) for (let x = (4 - (y % 4)) % 4; x < w; x += 4) context.fillRect(x, y, 1, 1);
  };

  const cell = (context: CanvasRenderingContext2D, cx: number, cy: number, lit: boolean, fresh: boolean) => {
    const [px, py] = [ox + cx * CELL, oy + cy * CELL];
    const kind = ground[index(cx, cy)];
    if (kind === DITCH) {
      fill(context, DUSK.deep, px, py, CELL, CELL);
      fill(context, DUSK.violet, px, py, 1, CELL);
      fill(context, DUSK.blue, px + CELL - 1, py, 1, CELL);
      return;
    }
    fill(context, fresh ? DUSK.moss : lit ? DUSK.leaf : DUSK.grass, px, py, CELL, CELL);
    // the far edges of every cell, a shade down: the patch reads as a grid
    fill(context, lit || fresh ? DUSK.grass : DUSK.lawn, px + CELL - 1, py, 1, CELL);
    fill(context, lit || fresh ? DUSK.grass : DUSK.lawn, px, py + CELL - 1, CELL, 1);
    if (kind === ROCK) {
      fill(context, DUSK.stone, px + 2, py + 2, 4, 3);
      fill(context, DUSK.stone, px + 1, py + 3, 6, 2);
      fill(context, DUSK.stoneLit, px + 2, py + 2, 2, 1);
    }
  };

  const rover = (context: CanvasRenderingContext2D, px: number, py: number, heading: number, blink: boolean) => {
    ROVER.forEach((row, v) => {
      for (let u = 0; u < row.length; u += 1) {
        const ink = row[u];
        if (ink === '.' || (ink === 'o' && !blink)) continue;
        // turn the drawing to face the heading
        const [x, y] = [[u, v], [5 - v, u], [5 - u, 5 - v], [v, 5 - u]][heading];
        fill(context, ROVER_INK[ink], px + x, py + y);
      }
    });
  };

  return {
    loop,
    rest: LEAD + steps[Math.floor(steps.length * 0.62)].at,
    draw(context, ms) {
      const t = ms - LEAD;
      // which step the rover is on, and how far through it
      let k = 0;
      while (k < steps.length - 1 && steps[k + 1].at <= t) k += 1;
      const here = steps[k];
      const next = steps[Math.min(k + 1, steps.length - 1)];
      const part = next === here || t < here.at ? 0 : (t - here.at) / (next.at - here.at);
      const moved = Math.round(part * CELL);
      const facing = part > 0 ? next.heading : here.heading;
      const arrived = t >= drive;
      // at the end of the loop the map is forgotten again, a dither step at a time
      const forget = t > drive + hold ? Math.ceil(((t - drive - hold) / CLEAR) * 16) : 0;

      hatch(context);
      for (let cy = 0; cy < rows; cy += 1) {
        for (let cx = 0; cx < cols; cx += 1) {
          const seen = seenAt[index(cx, cy)];
          if (seen < 0 || seen > k || BAYER[(cy % 4) * 4 + (cx % 4)] < forget) continue;
          const [dx, dy] = [cx - here.x, cy - here.y];
          const far = Math.hypot(dx, dy);
          const lit = far > 0 && far <= RANGE && (dx * DX[facing] + dy * DY[facing]) / far >= HALF_VIEW;
          cell(context, cx, cy, lit && !arrived, seen === k && k > 0 && t - here.at < 200);
        }
      }

      // where it has been
      for (let i = 0; i <= k; i += 1) {
        if (BAYER[(steps[i].y % 4) * 4 + (steps[i].x % 4)] < forget) continue;
        fill(context, DUSK.lime, ox + steps[i].x * CELL + 3, oy + steps[i].y * CELL + 3, 2, 2);
      }

      // the goal: known from the start, so it shows even on unseen ground
      const [gx, gy] = [ox + goal[0] * CELL, oy + goal[1] * CELL];
      const beat = Math.floor(ms / 400) % 2 === 0;
      fill(context, DUSK.gold, gx + 3, gy + 3, 2, 2);
      context.fillStyle = arrived ? DUSK.gold : DUSK.amber;
      const ring = arrived ? 1 + (Math.floor((t - drive) / 200) % 3) : beat ? 2 : 1;
      for (const [x, y] of [[-ring, 0], [ring + 1, 0], [-ring, 1], [ring + 1, 1], [0, -ring], [1, -ring], [0, ring + 1], [1, ring + 1]]) {
        context.fillRect(gx + 3 + x, gy + 3 + y, 1, 1);
      }

      // it leaves with the map, and sets off again from the start
      if (forget > 8) return;
      rover(
        context,
        ox + here.x * CELL + 1 + DX[facing] * moved,
        oy + here.y * CELL + 1 + DY[facing] * moved,
        facing,
        Math.floor(ms / 300) % 3 !== 0,
      );
    },
  };
};
