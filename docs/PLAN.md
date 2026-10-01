# Plan: pixel-garden profile site, two splits

## Context

You want a brand-new profile site (not a redesign of `shahanxd/profile_website_again`) with exactly two splits, tech and creative. The hero is a **pixel-art garden** in the spirit of ThreeUI's Agentic page, with an Arabic / Turkish / Indian feel, staged twice in the same place. Below it sits a real portfolio that keeps the theme **and the liveliness**. You only care about the final site; I do all the building and art cleaning.

Decisions already made: art is AI-made then cleaned; your character comes from a photo; the page mood follows the split; the bare address opens the last split visited (first visit: creative), with `/tech` and `/creative` as direct links.

The folder is empty apart from `agentic-landing-page.webm`, so there is no existing code to reuse. I stepped through that video frame by frame. The techniques I'm taking from it are the dithered sky, live props, the pixel seam where the hero breaks up into the page, ragged pixel-edged cards, headings that resolve out of dither, and the full-width pixel night band. I am not copying its composition or any ThreeUI Pro source.

## The quality bar (applies to everything)

The risk with a project this size is that it ends up gimmicky, unfinished, or not well put together. The rules I'll hold to:

- **Fewer things, each finished.** Anything that does not reach the bar is cut or simplified before I move on. No placeholder ships.
- **Every moving thing has a reason:** it shows the place is alive, or it guides the eye. Nothing moves to show that it can.
- **One attention-seeking animation on screen at a time.** Ambient loops stay small and slow.
- **One system:** one pixel unit, one timing scale, one palette per mood. Pixel things move in steps; pen and paper things move smoothly.
- **Content never waits.** Text is readable immediately; no reveal delays reading by more than about half a second.
- **A polish pass closes every milestone,** at desktop and phone size, before the next one starts.
- **A fresh-eyes review before each sign-off:** an independent reviewer checks alignment, spacing, even pixels, hover / focus / loading states, copy and speed against a written checklist.

## Status of what I asked for

- **Node:** done. I checked: v24.19.0 is on the path.
- **Photo:** you'll attach it in your next message. I start building only after it arrives.
- **Figma Weave:** connected. I checked: it now lists models and quotes a cost for each. Canva's generator is the second tool.
- **Content,** later: real copy, achievements, client feedback, numbers to confirm (the old-site stats are from early 2025), video links, design pieces, resume PDF. Until then the site builds with clearly marked drafts. I will not invent achievements, numbers or client quotes.

## Images, not generated animation

I generate **still images** and animate them **in code**.

- Motion at this size is one to three pixels per frame (a blink, a stroke of the stylus, a tail flick). I make those frames by small pixel edits to one clean pose, and effects like steam, petals, fireflies, water glints and lantern flicker are drawn by code.
- Generated video is the wrong tool here: frames come out soft and drift between frames, there is no transparent background, and the pixel grid cannot be held.
- It is also out of budget: Weave quotes about 280 credits for one video run (Flux 3 Video), against 150 free credits.

**Will 150 credits cover it?** Probably, if I'm disciplined, with Canva as overflow. Costs as Weave quotes them today:

| Model | Credits per image | Takes reference images | Use |
|---|---|---|---|
| Flux Fast | 0.4 | No | This is the "375 images" figure. It cannot see the key art or your photo, so it can't hold one style; useful only for throwaway tests. |
| Nano Banana, Nano Banana 2 Lite, Flux Kontext | 3 | Yes | Bulk of the elements, with the key art as style reference. |
| Seedream V4.5 Edit | 4 | Yes | Alternative for elements. |
| Nano Banana 2 | 6 | Yes | Bake-off; character from your photo. |
| GPT Image 2.5 | 8 | Yes, and transparent backgrounds | Bake-off; sprites that need clean cut-outs. |
| Nano Banana Pro | 11 | Yes | Bake-off; key art if it wins. |

Rough budget: key-art bake-off on three models (about 25), tech key art (about 8 to 11), then about 35 element runs on a 3-credit model (about 105). That is roughly 140 to 150 credits, so it is tight.

- I group props onto sheets to cut the count, write small things (petals, flames, kites, glints, the fountain) as code, and send retries and filler plates to Canva's generator.
- Weave makes me show you the cost and get your approval before every run, so you see the spend as it happens.
- If credits run out, the clean options are Canva, the monthly reset, or a paid month. I won't plan around switching Figma accounts for more free credits: that is your account and your call, and it likely goes against Weave's terms.

## The scene

One place, 320x180 art pixels on a 1080p screen (6 screen pixels per art pixel), painted as a 400x200 world so there is room for parallax. Sky and lawn extend in code so a phone in portrait gets a tall crop centred on you.

- **Shared place:** a walled Mughal / Ottoman pleasure garden. Tree on the left with a bough arching over the carpet; a small sandstone garden pavilion with cusped arches and jali railing on the right; a water channel and pool with a fountain; cypress, tulip and rose beds; a flat-roofed old-city skyline far off; a hanging brass lantern; a kilim on the lawn with a bolster, a brass tray, a cat, and a small tablet prop leaning on an inlaid side table.
- **Default I'm setting, yours to overrule at key-art sign-off:** no mosque domes, minarets or generated calligraphy used as decoration, and every prompt says "no text".

| Element | Creative (golden hour) | Tech (dusk) |
|---|---|---|
| Sky | Mauve to gold, low sun, kites | Indigo, moon, a few stars, lit windows |
| Tree | Cherry blossom, petals falling | Dense green, the odd leaf falling |
| You | Cross-legged, sketching on a tab | Leaning on the bolster, legs out, laptop, screen glow on face |
| Parrot (ringneck) | Awake beside you, watching | Asleep on your shoulder |
| Tray | Coffee with steam | Unfinished lunch |
| Lantern | Unlit brass | Lit, flickering, pool of light |
| Cat | Sitting, tail flick | Asleep in a loaf |
| Carpet clutter | Camera, headphones, pencils | Small rover with a blinking light, power bank |
| Air | Parakeet flock crossing | Fireflies, moths at the lantern |
| Water | Gold sparkles | Moon glints, lantern reflection |

More small changes get added the same way; each is one extra sprite or a code effect.

## The portfolio below the hero

Both splits share the same slots, so switching swaps content in place. The voice is yours: lowercase, personal, not corporate.

**Tech: projects carry it.** The aim is that a visitor leaves knowing what you can build.

1. **Intro:** two or three lines on who you are and what you build.
2. **Projects (the main section, most of the page):** metagross, cassetto and undumployed as large showcases; sumud, ml-compiler-bench, vLLMbench, good-nano-gpt and salamah in a grid. Each has one line on what it is, what was hard and what you built, two or three concrete results, the stack, links, and a real visual (screenshot, diagram or capture).
3. **Achievements:** hackathons, CS50x, the PyPI package, LeetCode, open-source work. You supply the real list.
4. **Toolkit:** one compact row.
5. **Contact.**

**Creative: the work on show.**

1. **Why I do what I do:** a short statement in your words.
2. **Showcase:** video edits (a reel plus selected pieces; players load on click), graphic design (a gallery that opens pieces full size), and sumud as a made thing: its art, story and motifs.
3. **Client feedback:** real quotes with names or handles, as supplied by you.
4. **Numbers:** videos produced, clients served, once you confirm them.
5. **Contact,** framed as "work with me".

A full-width **scene band** sits mid-page in both splits (lantern night for tech, kite hour for creative) and carries the headline numbers. **sumud appears in both splits:** on the tech side as an engineering project (the Godot build, systems, tests), on the creative side for its art and storytelling. sumud and salamah are presented plainly.

**Mood:** creative is warm parchment with madder and teal; tech is deep indigo with lantern amber.

**Liveliness, kept to a small set done well:**

- the pixel seam between hero and page, reused on the band;
- headings that resolve out of dither, with one phrase underlined by a pen stroke that draws itself;
- ragged pixel-edged cards and gallery frames;
- a few geometric star and jali patterns that draw themselves, and miniature-style botanicals that pixel in;
- petals (creative) or fireflies (tech) drifting down the page, sparse;
- hover and focus feedback on every interactive thing;
- at most one living illustration per flagship project (for example a rover that only drives where it has seen, for metagross), and only if it reaches the bar; otherwise a real screenshot.

**Cut on purpose:** pinned or horizontal scroll sections, custom cursor, sound, contact form, a separate light/dark toggle, cycling status chips, tags on every number.

## How it is built

- **Stack:** Vite 8 + React 19 + TypeScript + Tailwind 4 (what you already know), GSAP with ScrollTrigger and DrawSVG, Lenis for the scroll-to on desktop. A small script prerenders `/`, `/creative` and `/tech` to static HTML so the text is real and indexable.
- **Hero engine:** a small in-repo WebGL2 renderer (no 3D library; the scene is layered 2D sprites). It draws at art resolution, applies dither and palette, and scales up by whole numbers so pixels stay even on every screen. If the first spike stalls, the same passes move onto three.js.
- **One manifest** describes layers, anchors, animations, per-split variants and hotspots, so art can be swapped without touching code.
- **Split switch:** one store drives the scene, the page colour tokens, the URL and the remembered split. The hero does a true pixel dissolve between stagings, spreading from the toggle. The rest of the page is covered by a matching pixel-cell overlay, swapped underneath, and uncovered, so the whole page appears to dissolve. A tiny inline script picks the remembered split before first paint, so there is no flash.
- **Menu:** on wide screens the tablet prop in the scene is the menu, with real links laid over its screen. After you scroll, and on phones, a small glass pill takes over (section dots, split switch, motion on/off). If the prop menu reads poorly in the first preview, the glass panel becomes the hero menu too.
- **Loading:** a tiny poster image and real text paint first; the engine loads after. It pauses off screen and when the tab is hidden, and falls back to the poster on weak devices, reduced motion, or WebGL loss.

## Art pipeline

1. **No generations yet:** master palette (about 48 colours), the clean-up script, a grey-box blockout of the scene.
2. **Bake-off and key art:** the same creative key-art prompt on each available tool; you pick the look. Then the tech key art, made by editing the approved creative one. Key art is the style bible and is not shipped.
3. **Vertical slice:** parrot and your character (from the photo), cleaned and composed into the scene at 6x for sign-off.
4. **Everything else:** each element generated separately on a flat key-colour background with the key art as style reference: second pose, cat, carpet, skyline, wall, pavilion, tree and its green canopy, prop sheets, botanicals for the sections.
5. **Clean-up script** (`tools/art/pixelize.mjs`, using `sharp`): key out the background, snap to the true pixel grid, quantise to the master palette, hard alpha, despeckle, trim, bake the dusk variant through a hand-written palette-swap table, build animation frames from one clean pose, pack the atlas, write the manifest, self-check every pixel.

A repaint dropped into `art/overrides/` replaces any generated layer. Your photo stays in a git-ignored folder, goes only to the image tool as a reference, and never ships; only a sprite about 48 pixels tall does.

## Build order, commits and handoff

- `git init`, then work on a `dev` branch and fast-forward `main` at each milestone. Small commits, each after `npm run check` (types, build, prerender, smoke test) passes. The reference video, raw generations and your photo are git-ignored. Nothing is pushed or deployed until you say where.
- **`HANDOFF.md` is updated in every commit,** so another agent could pick the project up cold. It holds: current state and what works; the next steps in order; how to run and check the project; decisions made and why; art status (which assets are approved, prompts used, credits spent); open questions for you; known issues. Prompts are also logged in `art/prompts.md`.

Milestones:

1. **Foundation:** scaffold, three prerendered routes, split store with URL and remembered split, colour tokens for both moods, content file with drafts, plain static sections. A complete, if plain, site.
2. **Engine on grey boxes:** renderer, whole-number scaling, portrait framing, parallax, particles, hero dissolve, page-wide dissolve, tablet-prop menu, pause and fallback paths.
3. **Art:** the pipeline above, with your sign-offs at key art, the vertical slice, and the finished hero. Starts alongside milestone 2 because key art needs your eye early.
4. **Portfolio sections and motion:** layout and content components first, then the liveliness set.
5. **Content and polish:** your real copy and work, phone pass, performance tiers, keyboard and reduced-motion pass, share images, the full fresh-eyes review.
6. **Deploy:** on your word. Vercel is the easy choice since undumployed is already there.

Key files: `src/hero/engine/*` and `src/hero/scene/manifest.ts`, `src/split/store.ts`, `src/content/site.ts`, `src/styles/tokens.css`, `scripts/prerender.mjs`, `tools/art/pixelize.mjs`, `art/palette.json`, `HANDOFF.md`.

## Verification

- Dev server through `.claude/launch.json`, checked in the browser pane at desktop and phone sizes after every visible change.
- Debug URL switches built into the engine from the first commit (`?freeze=`, `?dissolve=0.5`, `?q=low`), so the dissolve and animations can be inspected as still frames.
- A Playwright smoke test: each route's raw HTML has its heading without JavaScript; the switch updates URL, content and remembered split; `/` with a stored tech split lands on tech; a menu click scrolls to its section; no console errors; reduced-motion and lost-WebGL runs; a 2.625 pixel-ratio screenshot checking pixels are even. This may need a one-time browser download of about 150 MB, which I'll ask about first.
- The art script's `check` command on every asset, plus a composed 6x preview image for each sign-off.
- Lighthouse on the built site; a test on a real mid-range Android phone before calling it done.

## Not yet proven

- How well any image tool holds a consistent pixel style across separate generations. The bake-off and the vertical slice exist to find out before the bulk of the art is made.
- Whether the art fits inside 150 Weave credits. The costs are what the tool quotes today; the number of retries is the unknown.
- Performance and bundle figures from planning are estimates until measured on a phone.
