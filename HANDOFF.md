# Handoff

Updated with every commit. If you are picking this project up cold, read this file, then `docs/PLAN.md` (the plan the owner approved).

## What this is

A profile site for Shahan (@shahanxd) with exactly two sides, **creative** and **tech**. The top of the page is a pixel-art garden (Mughal / Ottoman / Indian feel), staged differently for each side; below it is a portfolio that keeps the same theme and liveliness. Switching sides pixel-dissolves the whole page.

## Where things stand

Milestone 1 (foundation) is done. Milestones are listed in `docs/PLAN.md`.

**The hero engine is finished and reviewed on grey-box art** (commit `c1525e1`): raw WebGL2 layered sprites, whole-number upscaling verified at many sizes and pixel ratios, parallax, particles, the split dissolve for hero and page in step, poster-first load, pause, context-loss and reduced-motion paths. Verified only in headless Chrome with software GL; no real phone, Safari or Firefox yet. The agents' full reports (what was measured and how) are not in the repo; the key facts are in the commit messages and below.

**The portfolio below the hero is built** (design system, tech sections, creative sections, two critics, one fix pass; all in headless Chrome only). Colours come from the scene palettes (`src/styles/tokens.css`). Primitives are in `src/components/` (PixelSeam, ResolveHeading, PixelEdge, Sprite, PixelImage, Reveal, AmbientLayer, SceneBand, KilimDivider, ArchFrame, FlowerBed, PixelButton, Glass, Menu) with a dev-only gallery at `/src/components/kit/index.html`. Sections are in `src/sections/tech/`, `src/sections/creative/` and `src/sections/shared/`. `scripts/build-section-art.mjs` (`npm run art:sections`) cuts all section art out of `art/scene/` into `public/art/sections/`. No GSAP is used: reveals are stepped data attributes, sprites use the Web Animations API, loops are CSS under `html[data-motion=on]`; `?still=1` puts everything in its final state for screenshots. `src/motion/quiet.ts` stills everything while plain-tone content (sumud, salamah) is in view. **Placeholders ship in production** (policy at the top of `src/content/types.ts`); `draft()` and `confirmed: false` still mark what the owner must replace. The fix pass set two achievements to confirmed from public facts (cassetto on PyPI, SIH 2026 submission); the owner should confirm.

**Real art is in the hero** (world 352x198, plate + tree + sprites from `art/scene/`, lawn continuation for phones, headline in the upper-right sky, glass menu top left). This is a snapshot: the real-art build has finished its first stage and its review-and-fix pass is still running and editing `src/hero/**`, the art scripts, `art/sprites` and the atlas. Do not treat the hero as final until a later commit says the review is done.

`npm run check` passes at this commit. Reviewed by the main agent only as two desktop screenshots of each hero so far; sections not yet looked at by the main agent. `main` still points at the foundation commit.

**Owner's content pass (in progress, a background build is applying it):** the owner supplied real media, a resume, client reviews and 18 change requests. Media originals live in `creative showcase/` (git-ignored, 127 MB). `python scripts/build-showcase.py --ffmpeg <x264 build> --ffmpeg-frames <full build>` turns them into `public/showcase/` (three compressed videos with posters, design PDFs as webp pages, photos) and writes `src/content/showcaseMedia.json`. On this machine the two ffmpeg builds are `C:/Program Files/Wondershare/UniConverter/ffmpeg.exe` (has libx264, almost no filters) and `C:/Program Files/Softdeluxe/Free Download Manager/ffmpeg.exe` (full filters, PNG frames). Notes: two design PDFs carry each other's names (filed by content in the script); the Udaipur video was exported on its side and is turned upright. The resume is `public/shahan-ayyubi-resume.pdf` (it contains the owner's phone number). Requested and still open: remove hero motion that moves whole big bodies (the pointer parallax steps the tree, figure and ground abruptly) once the hero review finishes; a picture from the game for sumud (the owner meant to attach one, it did not arrive). The site's future domain per the resume is shahanxd.me.

**Machine notes:** the C: drive on this machine is nearly full (about 2 GB free). Headless Chrome profiles and screenshots must go on D: (for example `node_modules/.cache/`), and stale `chrome-profile-*` folders must be deleted. The dev server crashed once because Vite watched `dist-ssr` during a build; `vite.config.ts` now ignores build output and art sources.

Working now:

- Vite 8 + React 19 + TypeScript + Tailwind 4. `npm run check` passes.
- Three prerendered pages: `/` and `/creative` (creative), `/tech`. Text is in the HTML without JavaScript.
- Split switching: `src/split/store.ts` drives `data-split` on `<html>` (page colours), the URL, the tab title and the remembered split. An inline script in `index.html` applies the remembered split before first paint.
- Plain, unstyled-but-tidy sections for both splits, fed from `src/content/site.ts`.

In progress (see the note above):

- `src/hero/engine/` (WebGL2 layered-sprite renderer), `src/hero/scene/` (manifest, framing, types), `src/hero/Hero.tsx` and `hero.css` (poster first, engine loaded after first paint), `src/split/dissolve.ts`.
- `scripts/make-greybox.mjs`, `pack-atlas.mjs`, `make-posters.mjs` (`npm run art:build`): grey-box placeholder sprites in `art/sprites/`, packed to `public/art/atlas.*`, with a poster per split.
- `tools/art/pixelize.mjs` and `tools/art/lib/`: the clean-up pipeline for generated art, with synthetic fixtures in `art/fixtures/` and usage in `art/README.md`.

- `src/split/DissolveOverlay.tsx` (page-wide pixel dissolve) and `src/hero/TabletMenu.tsx` (links over the tablet prop) exist as first versions, unreviewed.

Not built yet: the glass pill menu, all section motion, real art in the scene, real copy.

## Next steps, in order

1. **Hero engine on grey boxes** (`src/hero/engine/`): WebGL2 layered-sprite renderer at art resolution, whole-number upscaling, portrait framing, parallax, particles, the split dissolve, pause and fallback paths, debug URL switches (`?freeze=`, `?dissolve=`, `?q=`).
2. **Art tooling** (`tools/art/pixelize.mjs`): key out background, snap to pixel grid, quantise to the master palette, bake the dusk variant, build frames, pack the atlas, write the manifest.
3. **Art**: key-art bake-off, owner sign-off, vertical slice (owner's character + parrot), then the rest. Generated by the owner from request files; see "Art status".
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
- **How art gets generated (owner's decision):** the owner runs the prompts by hand in Weave's web app on free credits and drops the results into `art/raw/` (git-ignored). The agent writes each batch as a request file in `art/requests/` (exact prompt, model, settings, file names), then does all cleaning.
  - Why: Weave is linked, but its run tools answer "only available on a paid Weave plan", so the agent cannot run it on the free plan. Costs it quoted: Nano Banana Pro 11 credits, GPT Image 2.5 8, Nano Banana 2 6, Nano Banana / NB2 Lite / Flux Kontext 3.
  - Canva's generator works from the agent but only returns a 200 px thumbnail and has no size or transparency controls; not used.
  - The owner said not to cut quality to save credits and will add credits when needed.
- **Key-art bake-off result:** GPT Image 2.5 won over Nano Banana 2 (see `art/prompts.md`). The image holds up when downscaled straight to the site grid, so the plan is now to **cut the approved stills into layers** (plate, tree, character, parrot, cat, tray, table and tablet) instead of generating every element separately. This likely changes the world size from 400x200 to about 352x198 (a 16:9 still with parallax bleed around a 320x180 camera); adjust `src/hero/scene/framing.ts` when the art lands.
- **Creative still approved:** `art/raw/keyart/creative-v2.png`. The site grid is a 352x198 world (the 16:9 still reduced about 3.09x) with a 320x180 camera.
- **Palette decision:** the hand-written 48-colour palette in `art/palette.json` makes the still muddy. Plates and sprites cut from the stills are quantised to a palette **fitted to the approved still** (about 96 colours, no dither). The dusk side comes from a generated dusk still, not from the `duskSwap` table. `art/palette.json` remains for code-authored pixel maps and the grey boxes only.
- **Layer plan:** one background plate per split (tree and foreground things removed), the tree as its own layer, and foreground sprites (figure, parrot, cat, tray, table with tablet, lantern, kites). The painted sky replaces the procedural sky; the engine's procedural backdrop is only needed where a tall phone shows beyond the plate.
- **Tablet menu: cut.** In the approved art the tablet screen is about 12x16 art pixels (about 72x96 CSS px at 1080p), too small for readable links. The glass menu is the only menu; the tablet prop just stays alive in the scene (cursor or glow). `src/hero/TabletMenu.tsx` is being removed.
- **Hero layout with the real art:** the open sky is upper right, so the headline goes there; the glass menu (currently top right) must move to the top left under the wordmark. On phones the scene sits at the top of the screen, the lawn continues below it (a tiled lawn sprite), and the copy sits over that lawn.
- **Engine debug switches:** `?freeze=<s>` (one deterministic frame), `?dissolve=<0..1>` (hold the split dissolve), `?q=low|mid|high`, `?debug=1`, `?pointer=x,y`. The built-in browser pane reports `document.hidden`, so the engine never starts there: review with headless Chrome (`--screenshot` with `?freeze=`), not the pane.
- **All eight raw layers are in:** plate, tree and sheet for both stagings, in `art/raw/layers/` (originals as downloaded are in `art/raw/originals/`).
- **Scene art pipeline:** `node scripts/build-scene-art.mjs [--staging creative|tech] [--scale n]` reduces the raw layers to the 352x198 grid (most-common-colour downscale), keys out magenta or the checkerboard, peels tinted rim pixels, fits a 96-colour palette by median cut, and writes `art/scene/<staging>/<id>.png`, `layout.json` (positions, sizes, z order, palette) and `art/scene/preview-<staging>.png`. Positions and target heights for each thing are a table at the top of the script, in raw-image pixels. Both stagings are built: creative has 10 layers, tech has 8. The dusk tree was generated in daylight colours, so the script shades it darker except near the lantern (`shade` in the tech config).
- **Not wired into the engine yet:** the engine still draws the grey-box sprites from `art/sprites/`. Next step is a manifest built from `art/scene/*/layout.json` and a 352x198 world in `src/hero/scene/framing.ts`.
- **No separate dusk still.** The dusk side is generated as layers edited from the creative layers, so both sides share geometry.
- **Known clean-up for the dusk sheet:** check the laptop lid for a logo at art size and paint it out if visible; the glow halos around the lit lantern, laptop screen and rover light were peeled with the magenta rim, so glow has to be added back in the engine as light.
- **Waiting on:** the owner's sign-off on both composed previews (`art/scene/preview-creative.png`, `preview-tech.png`). No image requests are open.
- Prompts used so far are logged in `art/prompts.md`.

## Open questions for the owner

- Commits are authored with this machine's git identity (`Insharah Ayyubi`). Say if a different name or email should be used.
- Real content: copy for both sides, achievements, client quotes, confirmed numbers, video links, design pieces, resume PDF, contact email.

## Known issues

- `TopNav` is a placeholder; it is replaced by the tablet menu and glass pill.
- No 404 page yet.
- Fonts ship every language subset; trim when the type choices are final.
