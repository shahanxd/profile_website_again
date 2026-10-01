// Step 4: find the grid of fake pixels in generated "pixel art". The edges
// between fake pixels line up along whole columns and rows, so the image's
// summed gradient has a peak at every grid line that has any detail on it.

// detectPeriod's strength from which its answer can be acted on (four gaps in five fit).
export const GRID_SURE = 0.6;

/**
 * Summed colour change between neighbouring columns (gx) and rows (gy) inside
 * rect. gx[k] belongs to the boundary k + 1 pixels in from the rect's left.
 * Only changes that touch the subject count: the flat key background has no
 * pixel grid, but it does show JPEG's 8 px blocks, which would pass for one.
 */
export function gradientProfiles({ w, data }, mask, rect) {
  const gx = new Float64Array(rect.x1 - rect.x0 - 1);
  const gy = new Float64Array(rect.y1 - rect.y0 - 1);
  const diff = (p, q) => {
    if (!mask[p] && !mask[q]) return 0;
    const [i, j] = [p * 4, q * 4];
    return Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]);
  };
  for (let y = rect.y0; y < rect.y1; y++) {
    for (let x = rect.x0; x < rect.x1; x++) {
      const p = y * w + x;
      if (x + 1 < rect.x1) gx[x - rect.x0] += diff(p, p + 1);
      if (y + 1 < rect.y1) gy[y - rect.y0] += diff(p, p + w);
    }
  }
  return { gx, gy };
}

/**
 * Edge energy from a gradient profile, scaled so that a typical strong edge
 * (the mean of the top 5%) is 1. The median comes off first, since noise and
 * soft shading sit at or below it; then anything under a fifth of a strong
 * edge is dropped. That is where JPEG's 8 px block boundaries live, and they
 * form a grid of their own that must not be mistaken for the art's.
 */
function edgesOf(profile) {
  const sorted = [...profile].sort((p, q) => q - p);
  const median = sorted[sorted.length >> 1];
  const top = sorted.slice(0, Math.ceil(sorted.length / 20));
  const strong = top.reduce((p, q) => p + q, 0) / top.length - median;
  return profile.map((v) => (strong > 0 ? Math.max(0, (v - median) / strong - 0.2) : 0));
}

/**
 * Where the profile clearly shows grid lines: its peaks of at least a tenth
 * of a strong edge, tallest first, each claiming `radius` px around it (blur
 * and noise split one edge into several bumps), plus both ends, which are the
 * sides of the subject box. In boundary coordinates: 0 is the near side of
 * the box, edges.length + 1 the far side.
 */
function linesIn(edges, radius) {
  const lines = [0, edges.length + 1];
  const peaks = [...edges.keys()].filter((i) => edges[i] >= 0.1 && edges[i] >= (edges[i - 1] ?? 0) && edges[i] >= (edges[i + 1] ?? 0));
  for (const i of peaks.sort((p, q) => edges[q] - edges[p])) {
    if (lines.every((x) => Math.abs(x - (i + 1)) >= radius)) lines.push(i + 1);
  }
  return lines.sort((p, q) => p - q);
}

/**
 * The size of the fake pixels, judged from the gaps between neighbouring
 * grid lines, or null when there are too few lines to tell. Every gap should
 * be a whole number of pixels, so a candidate period is good when most gaps
 * are within a quarter pixel of 1, 2, 3 or 4 of it. Unlike a comb laid over
 * the whole image this only compares neighbours, so it still works when the
 * grid drifts. `strength` runs from 0 (the gaps fit no better than chance)
 * to 1 (every gap fits).
 */
export function detectPeriod(profile) {
  const edges = edgesOf(profile);
  const judge = (period) => {
    // peaks closer than a third of a pixel are the same line
    const lines = linesIn(edges, Math.max(2, period / 3));
    let [judged, fits, span, cells] = [0, 0, 0, 0];
    for (let i = 1; i < lines.length; i++) {
      const gap = lines[i] - lines[i - 1];
      const n = Math.round(gap / period);
      if (n > 4) continue; // too far apart to say anything about one pixel
      judged++;
      if (n >= 1 && Math.abs(gap / period - n) <= 0.25) fits++, (span += gap), (cells += n);
    }
    return { lines, fit: judged >= 4 ? fits / judged : 0, period: cells ? span / cells : period };
  };

  // Every gap of 3 px or more is a candidate for "one pixel". Judge it, then
  // judge again at the average it implies. A multiple of the true period
  // fails because the one-pixel gaps do not fit it, and so does anything
  // smaller, so among the good candidates the largest is the period.
  const first = linesIn(edges, 3);
  const candidates = new Set(first.slice(1).map((x, i) => x - first[i]));
  const tried = [...candidates].map((gap) => judge(judge(gap).period)).filter((t) => t.fit > 0);
  if (!tried.length) return null;
  const good = tried.filter((t) => t.fit >= 0.8);
  const best = good.length ? good.reduce((p, q) => (q.period > p.period ? q : p)) : tried.reduce((p, q) => (q.fit > p.fit ? q : p));

  // phase: the circular mean of where the lines fall within one period
  const turn = (2 * Math.PI) / best.period;
  const angle = Math.atan2(best.lines.reduce((s, x) => s + Math.sin(x * turn), 0), best.lines.reduce((s, x) => s + Math.cos(x * turn), 0));
  return {
    period: Math.round(best.period * 100) / 100,
    phase: Math.round(((angle / turn + best.period) % best.period) * 100) / 100,
    strength: Math.round(Math.max(0, best.fit * 2 - 1) * 100) / 100,
  };
}

/** count + 1 evenly spaced grid lines from 0 to length. */
export function evenLines(length, count) {
  return Array.from({ length: count + 1 }, (_, i) => (i * length) / count);
}

/**
 * Grid lines that follow the art. Generated pixel art drifts: its fake pixels
 * are not all the same size, so an even grid slowly slides off them. Here
 * every line is rewarded for sitting on an edge in the gradient profile and
 * charged for making its cell bigger or smaller than average, so the lines
 * settle on the real pixel boundaries, and a line with no edge to hold on to
 * sits evenly between those that have one. The first and last lines are the
 * subject box itself and stay put.
 */
export function snapLines(profile, count) {
  const length = profile.length + 1;
  const cell = length / count;
  const edges = edgesOf(profile);
  // Sitting on an edge is worth up to 1; half a strong edge already earns it
  // all, so one huge edge cannot outbid everything else.
  const reward = (x) => Math.min(1, edges[x - 1] * 2);
  // A cell a tenth off the average size costs 0.04, a quarter off costs 0.25:
  // cheap enough to follow real drift, too dear to chase noise.
  const uneven = (size) => 4 * (size / cell - 1) ** 2;
  // a cell may be half to one and a half times the average size
  const smallest = Math.max(1, Math.floor(cell / 2));
  const largest = Math.ceil(cell * 1.5);

  // Dynamic programme, line by line. best[x] is the best total so far with
  // the latest line at x; from[i][x] is where the line before it then sat.
  let best = new Float64Array(length + 1).fill(-Infinity);
  best[0] = 0;
  const from = [];
  for (let i = 1; i <= count; i++) {
    const last = i === count;
    const next = new Float64Array(length + 1).fill(-Infinity);
    const back = new Int32Array(length + 1);
    for (let x = last ? length : 1; x <= (last ? length : length - 1); x++) {
      for (let px = Math.max(0, x - largest); px <= x - smallest; px++) {
        const total = best[px] - uneven(x - px);
        if (total > next[x]) (next[x] = total), (back[x] = px);
      }
      if (!last) next[x] += reward(x);
    }
    from.push(back);
    best = next;
  }

  // Walk back from the last line to read off where each one sat.
  const lines = [length];
  for (let i = count - 1; i >= 0; i--) lines.unshift(from[i][lines[0]]);
  return lines;
}
