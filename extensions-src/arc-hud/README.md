# Arc HUD

An Iron-Man / sci-fi HUD visual treatment for the Hermes WebUI composer footer.

## What It Does

Arc HUD is a purely visual appearance extension that gives the composer area and footer controls a sci-fi HUD aesthetic:

- **Glowing hairline borders** on all footer chips (Profile, Workspace, Model, Reasoning, Toolsets, Quota).
- **Corner-bracket accents** via pure CSS angle brackets on chip corners.
- **Subtle animated scanline texture** across the composer input container with low opacity to preserve reading clarity.
- **Amplified context ring glow** with monospace readout and cyan drop-shadow aura.
- **Arc-reactor send button** featuring an energetic core gradient and an animated pulse glow on hover/focus, plus a burst pulse on send.
- **Full Light and Dark mode support** — vivid neon cyan and amber in dark mode, and a high-contrast, crisp technical palette in light mode.
- **Accessibility**: honors `prefers-reduced-motion: reduce` by disabling scanline movement and simplifying pulse animations to static luminous glows.

## Purely Visual (No Functional Changes)

Arc HUD does **not** add a second composer, a second send button, or any dummy data panels. Every native composer footer control continues to function exactly as normal; only its styling and presentation are enhanced.

## How to Toggle On / Off

Arc HUD integrates directly into Hermes WebUI's native appearance system:

1. **Switch Skins**: Open **Settings** (gear icon) → **Appearance** → **Skin** grid, and click **Arc HUD**. To revert, click **Default** or any other skin.
2. **Slash Command**: Type `/theme arc-hud` in the chat composer. Type `/theme default` to revert.
3. **Disable or Uninstall Extension**: Open **Settings** → **Extensions**, find **Arc HUD**, and click **Disable** or **Remove**.
