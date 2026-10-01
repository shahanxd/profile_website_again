# Handoff

Updated with every commit. If you are picking this project up cold, read this file, then `docs/PLAN.md` (the plan the owner approved).

## What this is

A profile site for Shahan (@shahanxd) with exactly two sides, **creative** and **tech**. The top of the page is a pixel-art garden (Mughal / Ottoman / Indian feel), staged differently for each side; below it is a portfolio that keeps the same theme and liveliness. Switching sides pixel-dissolves the whole page.

## Where things stand

Milestone 1 (foundation) is done. Milestones are listed in `docs/PLAN.md`.

Working now:

- Vite 8 + React 19 + TypeScript + Tailwind 4. `npm run check` passes.
- Three prerendered pages: `/` and `/creative` (creative), `/tech`. Text is in the HTML without JavaScript.
- Split switching: `src/split/store.ts` drives `data-split` on `<html>` (page colours), the URL, the tab title and the remembered split. An inline script in `index.html` applies the remembered split before first paint.
- Plain, unstyled-but-tidy sections for both splits, fed from `src/content/site.ts`.

Not built yet: the garden scene (the hero is text on a flat panel), the dissolve, the tablet menu and glass pill, all section motion, real art, real copy.

## Next steps, in order

1. **Hero engine on grey boxes** (`src/hero/engine/`): WebGL2 layered-sprite renderer at art resolution, whole-number upscaling, portrait framing, parallax, particles, the split dissolve, pause and fallback paths, debug URL switches (`?freeze=`, `?dissolve=`, `?q=`).
2. **Art tooling** (`tools/art/pixelize.mjs`): key out background, snap to pixel grid, quantise to the master palette, bake the dusk variant, build frames, pack the atlas, write the manifest.
3. **Art**: key-art bake-off, owner sign-off, vertical slice (owner's character + parrot), then the rest. Blocked on an image tool; see "Art status".
4. **Portfolio sections and motion**, then **content and polish**, then **deploy**.

## How to run and check

```bash
npm install
npm run dev      # http://localhost:5173 (also /tech and /creative)
npm run check    # type-check, build, prerender, then verify the built pages
npm run serve    # serve dist/ at http://localhost:4173 the way the host will
```

Node 22.12 or newer is required (this machine has 24.19).

## Decisions and why

- **Split comes from the URL only** (`splitFromPath`). The bare address is creative; a remembered tech split redirects to `/tech` before paint. This keeps one hydration path and no flash of the wrong side.
- **Flat output files** (`tech.html`, not `tech/index.html`) so hosts serve `/tech` without a redirect. `vite preview` does not do this; use `npm run serve`.
- **`draft()` copy**: wording the owner has not approved is wrapped in `draft()` in `src/content/site.ts`. It is outlined in development. Facts marked `confirmed: false` (old stats, placeholder pieces) are shown in development and left out of production builds.
- **Nothing is invented**: no achievements, numbers or client quotes unless the owner supplies them. The proof section hides itself until it has real entries.
- **Same section ids on both splits** (`about`, `work`, `proof`, `contact`) so a switch keeps your place.
- **sumud appears on both sides**; sumud and salamah are `tone: 'plain'` (serious subjects: no jokes, no playful motion around them).
- **Transition timing lives in the store**: whatever draws the dissolve calls `configureTransition(coverMs, revealMs)`. Until then a switch is instant.
- **Quality bar** (from the owner): must not feel gimmicky or unfinished. Fewer things, each finished; cut what does not reach the bar. See `docs/PLAN.md`.

## Art status

- Master palette, scene layout and the generation plan are in `docs/PLAN.md`. No art is approved yet.
- Owner's reference photo: `art/private/owner-photo.webp` (git-ignored, never ships). Traits to carry into the sprite: short curly black hair, short beard, navy zip-neck sweater with white collar, light blue jeans.
- **Image tools:**
  - Figma Weave is linked, but its run tools answer "only available on a paid Weave plan", so it cannot be used from the agent on the free plan. Costs it quoted: Nano Banana Pro 11 credits, GPT Image 2.5 8, Nano Banana 2 6, Nano Banana / NB2 Lite / Flux Kontext 3.
  - Canva's generator works and produced one creative key-art take (Canva asset `MAHWvHzdNQ4`, 1680x944), but the agent only receives a 200 px thumbnail; getting the full image out needs another route.
  - Waiting on the owner to choose: a paid Weave month, another image tool, or generating in Weave's web app by hand from prepared prompts.
- Prompts used so far are logged in `art/prompts.md`.

## Open questions for the owner

- Which image tool route (above).
- Commits are authored with this machine's git identity (`Insharah Ayyubi`). Say if a different name or email should be used.
- Real content: copy for both sides, achievements, client quotes, confirmed numbers, video links, design pieces, resume PDF, contact email.

## Known issues

- `TopNav` is a placeholder; it is replaced by the tablet menu and glass pill.
- No 404 page yet.
- Fonts ship every language subset; trim when the type choices are final.
