import { DUSK, fill, type SceneMaker } from './kit';

/**
 * undumployed, as a picture: a shelf of jars, one for each kind of
 * opportunity. One at a time a lid comes off, what is inside is written up
 * on the card beside the shelf, and the card is stamped "reality check".
 * The jar keeps a tick on its label.
 */

/** One colour for each kind of entry (internships, fellowships, scholarships, hackathons, perks), all from the night's own lights. */
const KINDS = [DUSK.amber, DUSK.lilac, DUSK.periwinkle, DUSK.brass, DUSK.orange];
const PITCH = 15;
/** How many jars are opened in one loop, and how long each takes. */
const CHECKS = 5;
const TURN = 2400;
/** Within a turn: the lid is up by LIFTED, the card is written from WRITE, stamped at STAMP, and the lid goes back from CLOSE. */
const LIFTED = 400;
const WRITE = 450;
const LINE_MS = 150;
const STAMP = 1300;
const CLOSE = 1950;

/** A three by five face for the stamp's two words, a row of bits per row of pixels. */
const FACE: Record<string, number[]> = {
  R: [6, 5, 6, 5, 5],
  E: [7, 4, 6, 4, 7],
  A: [2, 5, 7, 5, 5],
  L: [4, 4, 4, 4, 7],
  I: [7, 2, 2, 2, 7],
  T: [7, 2, 2, 2, 2],
  Y: [5, 5, 2, 2, 2],
  C: [3, 4, 4, 4, 3],
  H: [5, 5, 7, 5, 5],
  K: [5, 5, 6, 5, 5],
};

function word(context: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  context.fillStyle = color;
  [...text].forEach((letter, i) => {
    FACE[letter].forEach((bits, row) => {
      for (let column = 0; column < 3; column += 1) if (bits & (4 >> column)) context.fillRect(x + i * 4 + column, y + row, 1, 1);
    });
  });
}

export const undumployed: SceneMaker = (w, h) => {
  // the card needs room for the stamp; the shelves take the rest
  const cardWidth = Math.max(Math.round(w * 0.32), 37);
  const card = { x: w - 8 - cardWidth, y: Math.round(h * 0.12), w: cardWidth, h: h - Math.round(h * 0.24) };
  const shelfLeft = 6;
  const shelfRight = card.x - 7;
  const perShelf = Math.max(Math.floor((shelfRight - shelfLeft) / PITCH), 2);
  const inset = shelfLeft + Math.floor((shelfRight - shelfLeft - (perShelf * PITCH - 4)) / 2);
  // as many shelves as there is height for, each with room above it for a lifted lid
  const lowest = Math.round(h * 0.86);
  const shelves = Math.max(Math.floor((h - 8) / 28), 2);
  const rise = Math.min(Math.floor((lowest - 22) / (shelves - 1)), 30);
  const boards = Array.from({ length: shelves }, (_, i) => lowest - (shelves - 1 - i) * rise);
  const jars = boards.flatMap((board, shelf) =>
    Array.from({ length: perShelf }, (_, i) => ({ x: inset + i * PITCH, y: board - 14, kind: KINDS[(i * 2 + shelf * 3) % KINDS.length] })),
  );
  // the order they are opened in: a stride that visits every jar before any twice
  let stride = Math.max(Math.round(jars.length * 0.4), 1);
  const shares = (a: number, b: number): boolean => (b ? shares(b, a % b) : a > 1);
  while (shares(stride, jars.length)) stride += 1;
  const order = Array.from({ length: CHECKS }, (_, i) => ((i + 1) * stride) % jars.length);

  const jar = (context: CanvasRenderingContext2D, x: number, y: number, kind: string, lift: number, ticked: boolean) => {
    // glass, what is inside, and a paper label
    fill(context, DUSK.night, x, y + 3, 11, 11);
    fill(context, kind, x + 1, y + 5, 9, 8);
    fill(context, DUSK.lilac, x + 1, y + 4, 1, 9);
    fill(context, DUSK.cream, x + 2, y + 7, 7, 5);
    if (ticked) {
      context.fillStyle = DUSK.ember;
      for (const [dx, dy] of [[3, 9], [4, 10], [5, 9], [6, 8], [7, 7]]) context.fillRect(x + dx, y + dy, 1, 1);
    } else {
      fill(context, DUSK.plum, x + 3, y + 8, 5, 1);
      fill(context, DUSK.plum, x + 3, y + 10, 3, 1);
    }
    // the lid and its knob, lifted clear when the jar is being read
    fill(context, DUSK.woodLight, x - 1, y + 1 - lift, 13, 2);
    fill(context, DUSK.brass, x - 1, y + 1 - lift, 13, 1);
    fill(context, DUSK.brass, x + 4, y - lift, 3, 1);
  };

  return {
    loop: TURN * CHECKS,
    rest: TURN * 2 + STAMP + 300,
    draw(context, ms) {
      const turn = Math.floor(ms / TURN) % CHECKS;
      const t = ms % TURN;
      const open = order[turn];
      const lift = t < LIFTED ? Math.floor(t / 100) : t < CLOSE ? 4 : Math.max(4 - Math.floor((t - CLOSE) / 100), 0);

      fill(context, DUSK.slate, 0, 0, w, h);
      // the shelves, on their brackets
      for (const board of boards) {
        fill(context, DUSK.wood, shelfLeft, board, shelfRight - shelfLeft, 3);
        fill(context, DUSK.woodLight, shelfLeft, board, shelfRight - shelfLeft, 1);
        fill(context, DUSK.woodDeep, shelfLeft + 3, board + 3, 2, 3);
        fill(context, DUSK.woodDeep, shelfRight - 5, board + 3, 2, 3);
      }
      jars.forEach((it, i) => {
        // ticked once its turn has passed the stamp; the ticks are wiped as the loop comes round
        const done = order.indexOf(i);
        const ticked = done >= 0 && (done < turn || (done === turn && t >= STAMP)) && !(turn === CHECKS - 1 && t >= CLOSE + 250);
        jar(context, it.x, it.y, it.kind, i === open ? lift : 0, ticked);
      });
      // a little steam off the open jar
      if (lift === 4) {
        const { x, y } = jars[open];
        const puff = Math.floor(t / 200) % 3;
        fill(context, DUSK.lilac, x + 3 + puff, y - 3 - puff);
        fill(context, DUSK.periwinkle, x + 7 - puff, y - 2 - ((puff + 1) % 3));
      }

      // the card, pinned up beside the shelves
      fill(context, DUSK.deep, card.x + 2, card.y + 2, card.w, card.h);
      fill(context, DUSK.cream, card.x, card.y, card.w, card.h);
      fill(context, DUSK.ember, card.x + Math.floor(card.w / 2) - 1, card.y + 1, 2, 2);
      if (t < WRITE) return;
      fill(context, jars[open].kind, card.x + 3, card.y + 5, card.w - 6, 3);
      const lines = Math.min(Math.floor((t - WRITE) / LINE_MS) + 1, Math.floor((card.h - 30) / 3));
      for (let line = 0; line < lines; line += 1) {
        fill(context, DUSK.plum, card.x + 3, card.y + 11 + line * 3, card.w - 6 - ((line * 7) % 11) - (line % 2) * 4, 1);
      }
      if (t < STAMP) return;
      // the stamp lands heavy, then settles to its own colour
      const ink = t < STAMP + 150 ? DUSK.woodDeep : DUSK.ember;
      const [sx, sy] = [card.x + Math.floor((card.w - 31) / 2), card.y + card.h - 19];
      fill(context, ink, sx, sy, 31, 1);
      fill(context, ink, sx, sy + 15, 31, 1);
      fill(context, ink, sx, sy, 1, 16);
      fill(context, ink, sx + 30, sy, 1, 16);
      word(context, 'REALITY', sx + 2, sy + 2, ink);
      word(context, 'CHECK', sx + 6, sy + 9, ink);
    },
  };
};
