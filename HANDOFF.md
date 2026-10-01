# Handoff

Updated with every commit. If you are picking this project up cold, read this file, then `docs/PLAN.md` (the plan the owner approved).

## What this is

A profile site for Shahan (@shahanxd) with exactly two sides, **creative** and **tech**. The top of the page is a pixel-art garden (Mughal / Ottoman / Indian feel), staged differently for each side; below it is a portfolio that keeps the same theme and liveliness. Switching sides pixel-dissolves the whole page.

## Where things stand

Milestones 1 through 4 are done. Milestones are listed in `docs/PLAN.md`.

**The hero engine is finished and wired to real art.** Raw WebGL2 layered-sprite renderer, whole-number upscaling verified at many sizes and pixel ratios, parallax off (owner's request — `framing.parallax: [0, 0]`), particles, the split dissolve for hero and page in step, poster-first load, pause, context-loss and reduced-motion paths. The atlas (`public/art/atlas.json`, `public/art/atlas.png`) contains the real painted sprites for both stagings, built from `art/scene/*/layout.json` by `scripts/build-scene-art.mjs`. The engine draws the real art. Verified only in headless Chrome and a desktop browser; no real phone, Safari or Firefox yet.

**The portfolio below the hero is built.** Design system, tech sections, creative sections, fix passes. Colours come from the scene palettes (`src/styles/tokens.css`). Primitives are in `src/components/` (PixelSeam, ResolveHeading, PixelEdge, Sprite, PixelImage, Reveal, AmbientLayer, SceneBand, KilimDivider, ArchFrame, FlowerBed, PixelButton, Glass, Menu) with a dev-only gallery at `/src/components/kit/index.html`. Sections are in `src/sections/tech/`, `src/sections/creative/` and `src/sections/shared/`. `scripts/build-section-art.mjs` (`npm run art:sections`) cuts all section art out of `art/scene/` into `public/art/sections/`. No GSAP is used: reveals are stepped data attributes, sprites use the Web Animations API, loops are CSS under `html[data-motion=on]`; `?still=1` puts everything in its final state for screenshots. `src/motion/quiet.ts` stills everything while plain-tone content (sumud, salamah) is in view. **Placeholders ship in production** (policy at the top of `src/content/types.ts`); `draft()` and `confirmed: false` still mark what the owner must replace. Salamah's body (`src/content/site.ts`, project `salamah`) is the one remaining draft — the owner has not yet said what it does today.

`npm run check` passes. Both splits reviewed in a browser at desktop size on 2 October 2026 (~2 am IST): hero, about, work, scene band, proof, contact and footer all render correctly on both splits.

**All owner requests from the prior session are complete and verified:**

1. ✅ **Hero motion:** whole-body parallax is off (`framing.parallax: [0, 0]`). Only small sprites (blink, hand stroke, screen glow, etc.) animate. Verified in browser.
2. ✅ **sumud key art:** `public/showcase/still/sumud.webp` (1600×900) shows in sumud's block on both splits, uncropped, with its own title lettering visible. Verified in browser.
3. ✅ **Creative achievements:** Smoke House design card shows "winner, canva on campus design competition 2026"; Nothing Phone (3a) card shows "global finalist, nothing community edition"; the honours list under the client notes shows all three (Canva winner · Nothing finalist · Nothing community reviewer). Verified in browser.
4. ✅ **Swapped design file names:** confirmed correct by owner; kept as-is.
5. ✅ **Tech about text:** owner's own wording preserved exactly ("undergrad at that thing", capitalised "ML"). Smoke House is "a group project". Verified in browser.

**Edits to preserve (never revert):** the owner's own tech about wording (see comment in `src/content/site.ts`); Smoke House is "a group project"; Instagram is `instagram.com/shahanxdxd`; the tech toolkit has "mern" in place of react and django; the project is named "project sparrow"; the Amazon ML Challenge line says "ranked around 1.4k among 30k teams"; links that leave the site open in a new tab (`src/components/outbound.ts`, used by PixelButton, PixelLink and the contact cards; in-page links, the split switch and mailto stay in the same tab).

## Left off at (2 October 2026, about 2 am IST)

`npm run check` passes. Both splits reviewed in browser; everything renders correctly. Nothing is blocking except owner sign-off on the art previews and the deploy word.

**Remaining open items, in order of priority:**

1. **Owner sign-off on hero art:** the owner has not yet confirmed `art/scene/preview-creative.png` and `art/scene/preview-tech.png`. No image requests are open; sign-off is all that remains.
2. **Salamah body:** the owner has not yet said what salamah does today. It shows as a draft in the card. Write one or two lines in `src/content/site.ts` under `salamah.body` once the owner supplies them.
3. **Phone pass:** review at phone sizes (portrait, ~390px wide). The hero and the portfolio have phone-specific CSS; it has not been checked on a real or emulated device since the last art build.
4. **SIH 2026 result:** the metagross achievement in `site.tech.proof.achievements` has a draft detail (how far it went). Replace with the real result once the owner knows.
5. **Deploy:** on the owner's word. Domain is shahanxd.me. Vercel is the easy choice (undumployed is already there). `npm run build` then deploy `dist/`.

## Next steps, in order

1. Owner sign-off on both composed hero previews.
2. Phone pass.
3. Content: salamah body, SIH result.
4. Deploy.

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

- Master palette, scene layout and the generation plan are in `docs/PLAN.md`.
- **Both stagings are built and wired:** creative (golden hour, cherry blossom, 10 layers) and tech (dusk, lit lantern, 8 layers). Both stagings are drawn by the engine from the real atlas.
- **Palette:** about 96 colours fitted to the approved creative still (median cut, no dither). The tech side uses a dusk palette generated from the tech layers.
- **Layer plan:** one background plate per split (tree and foreground things removed), the tree as its own layer, and foreground sprites (figure, parrot, cat, tray, table with tablet, lantern, kites, rover, small patches). The painted sky replaces the procedural sky.
- **Known clean-up for the dusk sheet:** check the laptop lid for a logo at art size and paint it out if visible; the glow halos around the lit lantern, laptop screen and rover light were peeled with the magenta rim, so glow has to be added back in the engine as light (not done; the engine does not yet have a light layer).
- **Waiting on:** the owner's sign-off on both composed previews (`art/scene/preview-creative.png`, `preview-tech.png`). No image requests are open.
- Prompts used so far are logged in `art/prompts.md`.

## Open questions for the owner

- Commits are authored with this machine's git identity (`Insharah Ayyubi`). Say if a different name or email should be used.
- Salamah: what does it do today, and who is it for?
- SIH 2026 result for metagross: how far did it go?
- Sign off on both hero art previews (`art/scene/preview-creative.png` and `art/scene/preview-tech.png`) so the art is final.

## Known issues

- No 404 page yet.
- Fonts ship every language subset; trim when the type choices are final.
- Laptop-lid logo and glow halos on the dusk scene noted above (cosmetic, not blocking).
- Not reviewed on a real phone, Safari or Firefox.
