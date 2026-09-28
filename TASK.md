# Task: Build "Arc HUD" — a Hermes WebUI extension that re-skins the composer footer

Working dir: /opt/data/spikes/hermes-webui (a git clone of nesquena/hermes-webui,
forked to trebor-ragah/hermes-webui, branch `arc-hud-skin` already checked out).
This is a full source checkout of the real, mature Hermes WebUI project (Python
backend + vanilla JS/CSS frontend, no build step). Read AGENTS.md and
docs/EXTENSIONS.md and THEMES.md before writing any code — follow this repo's
own conventions exactly.

## Goal

Create a new WebUI extension called "Arc HUD" that gives the app an Iron-Man /
sci-fi HUD visual treatment — WITHOUT duplicating or bridging any real
functionality. Every control in the composer footer (attach, saved prompts,
mic, profile chip, workspace chip, model chip, reasoning chip, toolsets chip,
context ring, send button) already works today. This extension only changes
how they LOOK, via CSS (plus a little JS for decorative extras like scanline
overlays or a glow pulse on send). It must not add a second composer, a second
send button, or fake data panels.

## Reference material already in this repo

- `docs/EXTENSIONS.md` — the extension loader contract: manifest.json format,
  what extensions can/can't do, capabilities, permissions block.
- `THEMES.md` — the skin system: `window.registerHermesSkin()` API, the
  documented CSS variable allowlist, and the pattern for a light/dark scheme.
- `/opt/data/webui/extensions/e-ink-skin/` (OUTSIDE this repo, on the live
  install, real working example) — a real installed extension that registers
  a skin via `window.registerHermesSkin()`. Read its `assets/e-ink-skin.js`,
  `manifest.json`, and `extension.json` as your structural template for the
  files this new extension needs (same three files: extension.json,
  manifest.json, assets/<name>.js, plus your new assets/<name>.css, plus a
  README.md).
- `/opt/data/webui/extensions/theme-creator/` — another real installed
  extension, more complex, worth skimming for patterns of injecting extra CSS
  scoped to a skin/data attribute.
- `static/index.html` — find the `composer-footer` div (search for that class)
  to see the exact real DOM structure/IDs you're targeting with CSS
  (`#profileChip`, `#composerModelChip`, `#composerReasoningChip`,
  `#composerToolsetsChip`, `#btnSend`, `.ctx-indicator`, etc — confirm exact
  IDs/classes by reading the file, don't guess).

## What to build

Create `extensions-src/arc-hud/` in this repo (a staging location inside the
repo, not the live install path) containing:

1. `extension.json` — id `arc-hud`, name "Arc HUD", version 0.1.0, description,
   author, assets block, capabilities `["manifest-bundle"]`, lifecycle all
   false/none (pure client-side, no sidecar), permissions block matching the
   e-ink-skin example's shape but accurate to what this extension actually
   does (registers_skin: true, dom.owned: false, dom.mutates_core_views: false
   since you're only adding CSS classes/pseudo-elements, not restructuring
   real interactive elements, network_external: false, etc). Screenshots: [].

2. `manifest.json` — lists the script(s) and stylesheet(s) for the
   gallery-installed loading path, same shape as e-ink-skin's manifest.json.

3. `assets/arc-hud.css` — the actual visual treatment, SCOPED so it only
   applies when the skin is active (use a `[data-skin="arc-hud"]` attribute
   selector on :root as the scoping mechanism, same pattern the built-in skins
   in static/style.css use per THEMES.md). Include:
   - Glowing cyan/amber hairline borders on the composer-footer chips
     (profile/model/reasoning/toolsets/workspace), corner-bracket accents
     (small CSS-drawn angle brackets on chip corners via ::before/::after,
     pure CSS, no images).
   - A subtle animated scanline texture overlay on the composer area (CSS
     `repeating-linear-gradient` + a slow keyframe animation), low opacity so
     text stays readable.
   - The context ring (`.ctx-ring` / `#ctxIndicator`) gets a brighter glow.
   - The send button (`#btnSend`) gets an arc-reactor-style pulse glow on
     hover/focus (CSS keyframe), respecting `prefers-reduced-motion: reduce`
     (disable/simplify animations when that media query is set — this repo's
     own accessibility bar, check TESTING.md/UIUX-GUIDE.md for any stated
     conventions on this).
   - Respect both light and dark mode: THEMES.md says skins must define
     `:root[data-skin="arc-hud"]` AND `:root.dark[data-skin="arc-hud"]`
     variants. Since this is meant to be a HUD/terminal aesthetic, dark mode
     is the primary target — for light mode, keep the same structural
     glow/bracket treatment but adapt colors so it stays legible (don't just
     make it look broken in light mode; a dim/cooler variant is fine).

4. `assets/arc-hud.js` — registers the skin via `window.registerHermesSkin()`
   following the e-ink-skin.js retry/no-op pattern exactly (same 150ms retry
   loop up to 40 attempts, same `window.__hermesArcHudLoaded` guard). Use the
   documented token allowlist from THEMES.md for `--accent` family colors
   (cyan primary, e.g. `#00f0ff`, amber secondary as an accent-bg tint). Do
   NOT attempt `--font-*` overrides via registerHermesSkin (THEMES.md is
   explicit that's not on the allowlist) — if you want a monospace HUD feel,
   do that in the CSS file directly on scoped selectors, not through the JS
   registration call.

5. `README.md` — short, user-facing: what it does, that it's purely visual
   (does not add new functionality, does not duplicate the composer), how to
   toggle it on/off (native Settings -> Appearance skin picker, or Settings ->
   Extensions to disable/remove the extension entirely — both already exist,
   do not build a custom toggle).

## Explicit non-goals (do not build these)

- Do NOT add a second message composer, second send button, or any new
  backend route.
- Do NOT try to bridge this to the Hermes Desktop app or any other frontend.
- Do NOT hardcode colors outside the documented skin token allowlist in a way
  that breaks the native Settings -> Appearance picker's live preview.
- Do NOT modify any file outside `extensions-src/arc-hud/` in this repo.

## Verification (do yourself before finishing)

1. This repo has real automated tests. Run `./scripts/test.sh` (per
   AGENTS.md, not bare pytest) and confirm your changes did not touch
   anything that breaks existing tests — you're adding new files, not editing
   tracked source, so this should trivially pass, but confirm it actually
   runs clean.
2. Boot the app locally in ISOLATED trial state (per AGENTS.md's own safety
   rule — do not touch real ~/.hermes):
   ```bash
   HERMES_HOME=/tmp/arc-hud-trial-home \
   HERMES_WEBUI_STATE_DIR=/tmp/arc-hud-trial-state \
   HERMES_WEBUI_PORT=8790 \
   HERMES_WEBUI_EXTENSION_DIR=/opt/data/spikes/hermes-webui/extensions-src \
   HERMES_WEBUI_EXTENSION_MANIFEST=arc-hud/manifest.json \
   python3 bootstrap.py
   ```
   (adjust flags if bootstrap.py's actual interface differs — read its
   --help or source first). Confirm the server boots without error and the
   extension's script/stylesheet actually get served at the expected
   `/extensions/...` URL (curl them, don't just assume).
3. Report back exactly what you verified and how, including any commands
   that failed and how you worked around them. If full end-to-end browser
   verification isn't possible headlessly, say so explicitly rather than
   claiming it looks correct.
4. Commit your work to the current git branch (`arc-hud-skin`) with a clear
   commit message. Do not push (no remote credentials configured for you).

## Constraints

- Follow AGENTS.md's isolated-trial-state rule strictly: never touch the real
  `~/.hermes` or `/opt/data/webui` directories from your test runs.
- No new npm/pip dependencies — CSS + vanilla JS only, matching this
  project's own stated "no framework, no bundler" philosophy.
- This is a git repo; work only inside `extensions-src/arc-hud/` plus this
  TASK.md file's own directory. Do not touch tracked source files
  (static/*.js, static/*.css, static/index.html, api/*, server.py) — this is
  purely an additive, uninstalled-by-default extension bundle, not a core
  patch.
