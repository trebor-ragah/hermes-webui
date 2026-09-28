(() => {
  'use strict';

  // ── Arc HUD Skin extension for Hermes WebUI ──────────────────────────────
  // Registers an Iron-Man / sci-fi HUD visual treatment for the composer footer:
  // cyan primary palette with amber secondary accents, hairline glowing borders,
  // corner brackets, scanlines, and an arc-reactor send glow.
  // Uses window.registerHermesSkin() so the skin appears in the native
  // Settings → Appearance skin picker.

  if (window.__hermesArcHudLoaded) return;
  window.__hermesArcHudLoaded = true;

  // Design tokens on the core allowlist (see THEMES.md / docs/EXTENSIONS.md).
  // Cyan primary (#00f0ff), amber secondary (#ffb700). Font tokens are NOT on
  // the allowlist and are scoped directly in assets/arc-hud.css.
  const ARC_HUD_SKIN = {
    name: 'Arc HUD',
    value: 'arc-hud',
    label: 'Arc HUD',
    colors: ['#00f0ff', '#ffb700', '#0a101d'],
    tokens: {
      '--accent': '#00f0ff',
      '--accent-hover': '#33f5ff',
      '--accent-text': '#00f0ff',
      '--accent-contrast': '#030712',
      '--accent-bg': 'rgba(255, 183, 0, 0.10)',
      '--accent-bg-strong': 'rgba(255, 183, 0, 0.20)',
      '--accent-rgb': '0, 240, 255',
      '--accent2': '#ffb700',
      '--accent3': '#00d4e0',
      '--link': '#00f0ff'
    }
  };

  function register(attempt) {
    attempt = attempt || 0;
    if (typeof window.registerHermesSkin === 'function') {
      const ok = window.registerHermesSkin(ARC_HUD_SKIN);
      if (!ok) {
        console.warn('[arc-hud] registerHermesSkin rejected the descriptor');
      }
      return true;
    }
    // Core capability not present yet (older WebUI, or boot.js not parsed yet).
    // Retry briefly, then give up quietly.
    if (attempt < 40) {
      setTimeout(() => register(attempt + 1), 150);
      return false;
    }
    console.warn('[arc-hud] window.registerHermesSkin unavailable; skin not registered');
    return false;
  }

  // Decorative extra: brief arc-reactor flash pulse on send
  function initSendPulse() {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;

    function triggerPulse() {
      if (document.documentElement && document.documentElement.dataset.skin !== 'arc-hud') return;
      const sendBtn = document.getElementById('btnSend');
      if (!sendBtn || sendBtn.disabled) return;
      sendBtn.classList.remove('arc-hud-pulse');
      void sendBtn.offsetWidth; // re-arm animation
      sendBtn.classList.add('arc-hud-pulse');
      setTimeout(() => {
        sendBtn.classList.remove('arc-hud-pulse');
      }, 500);
    }

    document.addEventListener('click', (e) => {
      if (e.target && e.target.closest('#btnSend')) {
        triggerPulse();
      }
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'msg') {
        triggerPulse();
      }
    }, true);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        register();
        initSendPulse();
      }, { once: true });
    } else {
      register();
      initSendPulse();
    }
  } else {
    register();
  }
})();
