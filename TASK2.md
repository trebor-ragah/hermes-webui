# Task: Upgrade "Arc HUD" extension to the FULL interactive HUD with real data

Working dir: /opt/data/spikes/hermes-webui (branch `arc-hud-skin`).
You previously built an extension in `extensions-src/arc-hud/` that just colored the existing composer. The user wants the FULL sci-fi HUD experience (the giant arc reactor, the 4 corner panels) overlaid on the screen, populated with REAL data, not fake mockups.

## Goal
Update `extensions-src/arc-hud/assets/arc-hud.js`, `arc-hud.css`, and `extension.json` to inject a full-screen HUD overlay into the DOM when the skin is active, containing the central reactor and 4 corner panels powered by real WebUI APIs.

## Requirements

1. **Inject the HUD Overlay (JS & CSS)**:
   - In `arc-hud.js`, when the skin is active, inject a `#arc-hud-overlay` container into the body (with `pointer-events: none`, but `pointer-events: auto` for the panels).
   - Build the central Arc Reactor graphic (pure CSS/SVG) in the center of the screen, behind the chat messages.
   - Hide the dashboard sidebar (`.sidebar { display: none !important; }` when skin is active) and make the main chat area transparent so the HUD shines through.

2. **The 4 Corner Panels (REAL DATA)**:
   - **Top-Left (Core Telemetry)**: Fetch `/api/dashboard/status` and `/api/usage` periodically (e.g. every 10s). Display real stats: uptime, hermes version, token usage, active sessions.
   - **Top-Right (Tactical Radar)**: Fetch `/api/machines` or `/api/sessions` to show live activity. Make a CSS radar sweep animation, and use real session counts or host stats as the "blips" or data points next to it.
   - **Bottom-Right (Telemetry Matrix)**: Show a scrolling log of real events. You can subscribe to `/api/sessions/events` (SSE) or intercept console logs, or just fetch recent jobs/sessions. Make it look like a real terminal stream of Hermes activity.
   - **Bottom-Left (Functional Composer Controls)**: The user explicitly requested this panel to house the real composer controls (Profile, Workspace, Model, Reasoning, Attach, Mic, etc.). DO NOT build fake UI here. Instead, use CSS/JS to physically move or visually relocate the *existing* `.composer-footer` (or specifically `.composer-left`) into this bottom-left HUD panel. It must be fully functional. (Keep `.composer-right` and the `#btnSend` somewhere logical, like center-bottom under the chat input).

3. **Extension Manifest**:
   - Update `extension.json` to set `"dom": { "owned": true, "mutates_core_views": true }` since we are injecting major DOM elements and moving the composer controls.
   - Add `"network_external": false` but we ARE using internal APIs, which is allowed.

4. **Robustness**:
   - Ensure the overlay is removed or hidden if the user switches away from the "arc-hud" skin back to "default". Observe `document.documentElement.dataset.skin`.

## Constraints
- Do NOT use React. This is a vanilla JS extension. Create DOM elements via `document.createElement` or `innerHTML`.
- Do NOT add npm dependencies.
- Verify your code using `./scripts/test.sh` if needed, but since it's an extension, static checks are enough.
