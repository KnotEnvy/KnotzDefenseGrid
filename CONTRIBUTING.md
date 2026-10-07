# Contributing to BEAMFALL

Welcome. The game is playable end to end; what it needs now is polish, content and art. Start with
[`README.md`](README.md) (what the game is, how to run it) and, if you are doing graphics,
[`docs/GFX_GUIDE.md`](docs/GFX_GUIDE.md). [`docs/DESIGN.md`](docs/DESIGN.md) is the story bible and explains the
reasoning behind each mechanic: read it before rebalancing anything.

## Setup

Node **20.19+ or 22.12+** (`.nvmrc` says 22). No other tooling.

```bash
npm install
npm run dev          # http://localhost:5173
```

## Where things live

```
src/sim/        the game rules: pure JS, deterministic, no Phaser, no DOM.     Unit-tested.
  data/         posts, enemies, levels + wave scripts, maps, lore, difficulty. Most balance/content changes are here.
src/game/       the Phaser 4 view: scenes, entities, fx, art, audio, ui.       Presentation only.
test/           unit tests (node:test), the headless balance bot, the browser e2e test
tools/          dev tools for GFX work: sprite sheet, review screenshots, perf probe, terrain preview
docs/           design/story bible and the GFX guide
old/            the archived first prototype (Python/Pygame). Reference only
```

**Keep the split.** `src/sim` must never import Phaser or touch the DOM; the view reads sim state and listens to sim events.
That is what lets the unit tests and the headless bot run the whole game in milliseconds. If the view needs to know about
something new, add an event to the sim rather than reaching into it.

## Checks

Run these before opening a PR (there is no CI yet, so you are the CI):

| Command | What it proves | When |
|---|---|---|
| `npm test` | grid/pathing rules, shard economy, determinism, bosses, endless waves, audio synthesis (24 tests, under a second) | always |
| `npm run build` | the production bundle builds | always |
| `npm run e2e` | real Chromium: menu, map, every level with the bot, both bosses, real mouse/keyboard, endless, win/lose, results. **Fails on any console error** | touching `src/game/` or `src/main.js` |
| `npm run bot` | the headless bot plays every Waystation and prints win/loss, shards and stars (`-- --hp 1.5` makes enemies tougher to see how much margin is left) | touching `src/sim/` or `src/sim/data/` (balance) |
| `npm run shots` | before/after screenshots for review | touching visuals |

Notes:

- `npm run e2e` needs a Chromium. It uses `CHROME_PATH`, else Playwright's own (`npx playwright-core install chromium`).
  Without a GPU it renders in software (slow: several minutes). Don't edit `src/` while it runs, because hot reload restarts the page
  under it. `GL=hardware` uses the GPU; `BASE_URL=...` reuses a dev server you already have running.
- Balance is tuned with the bot (`docs/DESIGN.md` section 10 explains the method), not by human playtesting. If you
  change a number in `src/sim/data/`, re-run `npm run bot` and look at the margins, then play it.

## Conventions

- Plain ES modules, no TypeScript, no bundler tricks. `.editorconfig` sets 2 spaces, LF, UTF-8.
- Single quotes, semicolons, trailing-comma-free; follow the file you are editing. There is no linter configured; if you add one,
  keep it a separate PR.
- Comments explain *why* (a Phaser 4 gotcha, a balance reason), not what.
- No binary assets were needed so far. If you add some, put them in `public/gfx/` (loaded at runtime; see the GFX guide) and keep
  source files (`.psd`, `.aseprite`) out of `public/`.
- Don't commit generated output: `dist/`, `tools/out/`, `test/e2e-out/` are gitignored.

## Pull requests

- Branch from `main`, one concern per PR, describe what changed and how you checked it.
- Visual change: attach before/after from `npm run shots`. Balance change: paste the `npm run bot` output.
- Note the unfinished corners honestly (the README's *Known limitations* is a good model).

## Unofficial fan project

BEAMFALL borrows the world of Stephen King's *The Dark Tower*; the story and characters are original. Keep it that way: no text
from the books, no imitating official artwork or logos, and keep the disclaimer in the README and credits.
