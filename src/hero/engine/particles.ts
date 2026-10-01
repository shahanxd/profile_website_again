import type { Vec2 } from '../scene/types';
import { frameAt, hash, INSTANCE_SIZE, type Emit } from './stage';

/**
 * Petals, steam, fireflies, moths, glints. Nothing is simulated and nothing
 * is remembered: where a particle is depends only on the clock, like every
 * sprite in the stage, so a frozen frame is repeatable and the air is already
 * full on the first frame. Each particle is a slot with its own stream of
 * random numbers; a drifting slot is used again and again, starting somewhere
 * new each time round.
 */

const TURN = Math.PI * 2;
const between = (range: Vec2, random: number) => range[0] + (range[1] - range[0]) * random;

/** `share` is the part of each emitter's particles to keep (the quality tier's). */
export function createEmit(share: number): Emit {
  return (source, t, originX, originY, out, at) => {
    const { emitter, sprite } = source;
    const { move } = emitter;
    const [areaX, areaY, areaW, areaH] = emitter.area;
    const slots = Math.max(1, Math.round(emitter.count * share));

    for (let i = 0; i < slots; i++) {
      const seed = source.seed + i;
      let x = areaX;
      let y = areaY;
      let age = 0;
      let life = 1;

      if (move.kind === 'drift') {
        life = between(move.life, hash(seed, 1));
        const cycle = life + between(move.gap ?? [0, 0], hash(seed, 2));
        // Each slot starts part-way through its cycle, so particles are spread out from the first frame.
        const clock = t + hash(seed, 3) * cycle;
        const round = Math.floor(clock / cycle);
        age = clock - round * cycle;
        if (age >= life) continue; // waiting its turn
        const [jitterX, jitterY] = move.jitter ?? [0, 0];
        x += hash(seed, round * 4 + 8) * areaW + (move.velocity[0] + (hash(seed, 4) * 2 - 1) * jitterX) * age;
        y += hash(seed, round * 4 + 9) * areaH + (move.velocity[1] + (hash(seed, 5) * 2 - 1) * jitterY) * age;
        if (move.wobble) x += move.wobble.by * Math.sin((age / move.wobble.period + hash(seed, round * 4 + 10)) * TURN);
      } else if (move.kind === 'wander') {
        // two slow swings of different lengths, so the path never quite repeats
        x += hash(seed, 1) * areaW + move.reach[0] * Math.sin((t / between(move.period, hash(seed, 2)) + hash(seed, 3)) * TURN);
        y += hash(seed, 4) * areaH + move.reach[1] * Math.sin((t / between(move.period, hash(seed, 5)) + hash(seed, 6)) * TURN);
      } else {
        // orbit: alternate particles circle opposite ways, each on its own size of ring
        const angle = ((i % 2 ? -t : t) / between(move.period, hash(seed, 1)) + hash(seed, 2)) * TURN;
        const size = 0.6 + 0.4 * hash(seed, 3);
        x += move.radius[0] * size * Math.cos(angle);
        y += move.radius[1] * size * Math.sin(angle);
      }

      const frame =
        emitter.anim === 'life'
          ? Math.min(sprite.frames - 1, Math.floor((age / life) * sprite.frames))
          : // offset in time, so particles of one emitter do not step through their frames together
            frameAt(emitter.anim, sprite.frames, t + hash(seed, 7) * 16, seed);
      out[at] = originX + Math.round(x) - sprite.anchor[0];
      out[at + 1] = originY + Math.round(y) - sprite.anchor[1];
      out[at + 2] = sprite.w;
      out[at + 3] = sprite.h;
      // the frame, twice: particles have no daylight form, so lamplight leaves them as they are
      out[at + 4] = out[at + 6] = sprite.x + frame * sprite.w;
      out[at + 5] = out[at + 7] = sprite.y;
      at += INSTANCE_SIZE;
    }
    return at;
  };
}
