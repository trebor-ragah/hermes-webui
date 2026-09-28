(() => {
  'use strict';

  // ── Arc HUD Skin & Interactive HUD Overlay for Hermes WebUI ─────────────
  // Provides an Iron-Man / sci-fi HUD visual treatment:
  // - Full-screen HUD overlay with central Arc Reactor graphic (pure CSS/SVG)
  // - Top-Left: Core Telemetry panel (real uptime, version, tokens, sessions)
  // - Top-Right: Tactical Radar panel (CSS radar sweep with real session blips)
  // - Bottom-Right: Telemetry Matrix (real SSE event stream / activity logs)
  // - Bottom-Left: Subsystem Controls (relocated functional composer controls)
  // Scoped to [data-skin="arc-hud"] with automatic activation and clean teardown.

  if (window.__hermesArcHudLoaded) return;
  window.__hermesArcHudLoaded = true;

  // Design tokens on the core allowlist (see THEMES.md / docs/EXTENSIONS.md).
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

  function registerSkin(attempt) {
    attempt = attempt || 0;
    if (typeof window.registerHermesSkin === 'function') {
      const ok = window.registerHermesSkin(ARC_HUD_SKIN);
      if (!ok) {
        console.warn('[arc-hud] registerHermesSkin rejected the descriptor');
      }
      return true;
    }
    if (attempt < 40) {
      setTimeout(() => registerSkin(attempt + 1), 150);
      return false;
    }
    return false;
  }

  // ── Runtime HUD State ───────────────────────────────────────────────────
  let isHudActive = false;
  let pollTimer = null;
  let uptimeTimer = null;
  let sseSource = null;
  let hudStartTime = Date.now();
  let currentSessions = [];

  // ── Central Arc Reactor SVG Builder ─────────────────────────────────────
  function buildArcReactorSvg() {
    // 10 electromagnetic induction coils arranged in a 360-degree circle
    let coilsHtml = '';
    for (let i = 0; i < 10; i++) {
      const deg = i * 36;
      coilsHtml += `
        <g transform="rotate(${deg} 280 280)">
          <rect x="270" y="88" width="20" height="26" rx="2" fill="#ffb700" stroke="#ffe066" stroke-width="1" opacity="0.85" />
          <line x1="270" y1="94" x2="290" y2="94" stroke="#996000" stroke-width="1.5" />
          <line x1="270" y1="100" x2="290" y2="100" stroke="#996000" stroke-width="1.5" />
          <line x1="270" y1="106" x2="290" y2="106" stroke="#996000" stroke-width="1.5" />
          <path d="M 266 84 L 294 84 L 292 118 L 268 118 Z" fill="none" stroke="#00f0ff" stroke-width="1.5" />
          <circle cx="280" cy="78" r="3" fill="#00f0ff" filter="url(#arcGlowFilter)" />
        </g>
      `;
    }

    return `
      <svg class="arc-reactor-svg" viewBox="0 0 560 560" width="560" height="560">
        <defs>
          <radialGradient id="arcCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="25%" stop-color="#00f0ff" stop-opacity="0.9" />
            <stop offset="65%" stop-color="#0088aa" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#002233" stop-opacity="0" />
          </radialGradient>
          <filter id="arcGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Targeting Crosshairs & Reticle -->
        <g class="arc-reticle" stroke="rgba(0, 240, 255, 0.22)" stroke-width="1">
          <line x1="280" y1="10" x2="280" y2="550" stroke-dasharray="6 4" />
          <line x1="10" y1="280" x2="550" y2="280" stroke-dasharray="6 4" />
          <circle cx="280" cy="280" r="268" fill="none" stroke="rgba(0, 240, 255, 0.12)" stroke-width="1" stroke-dasharray="4 6" />
        </g>

        <!-- Outer Graduated Tick Ring (Slow Clockwise Rotation) -->
        <g class="arc-outer-ticks">
          <circle cx="280" cy="280" r="248" fill="none" stroke="rgba(0, 240, 255, 0.3)" stroke-width="2" />
          <circle cx="280" cy="280" r="240" fill="none" stroke="#00f0ff" stroke-width="8" stroke-dasharray="4 16" opacity="0.4" />
          <circle cx="280" cy="280" r="228" fill="none" stroke="rgba(255, 183, 0, 0.35)" stroke-width="1.5" stroke-dasharray="60 30 15 30" />
        </g>

        <!-- Segmented Turbine Ring (Counter-Clockwise Rotation) -->
        <g class="arc-turbine-ring">
          <circle cx="280" cy="280" r="200" fill="none" stroke="rgba(0, 240, 255, 0.55)" stroke-width="10" stroke-dasharray="16 12" />
          <circle cx="280" cy="280" r="186" fill="none" stroke="rgba(0, 240, 255, 0.25)" stroke-width="1.5" />
        </g>

        <!-- 10 Magnetic Induction Coils -->
        <g class="arc-coils">
          ${coilsHtml}
        </g>

        <!-- Inner High-RPM Core Cage (Clockwise Rotation) -->
        <g class="arc-inner-cage">
          <circle cx="280" cy="280" r="132" fill="none" stroke="rgba(0, 240, 255, 0.4)" stroke-width="2" />
          <circle cx="280" cy="280" r="122" fill="none" stroke="#00f0ff" stroke-width="5" stroke-dasharray="8 12" opacity="0.65" />
          <circle cx="280" cy="280" r="108" fill="none" stroke="rgba(255, 183, 0, 0.6)" stroke-width="2" stroke-dasharray="28 14" />
        </g>

        <!-- Glowing Central Arc Core with Triangular Nodes -->
        <g class="arc-core-pulse">
          <circle cx="280" cy="280" r="88" fill="url(#arcCoreGlow)" filter="url(#arcGlowFilter)" />
          <circle cx="280" cy="280" r="64" fill="none" stroke="#00f0ff" stroke-width="2.5" />
          <polygon points="280,228 325,306 235,306" fill="none" stroke="#00f0ff" stroke-width="3" filter="url(#arcGlowFilter)" />
          <polygon points="280,238 317,301 243,301" fill="rgba(0, 240, 255, 0.16)" stroke="rgba(255, 183, 0, 0.75)" stroke-width="1.5" />
          <circle cx="280" cy="280" r="26" fill="#ffffff" filter="url(#arcGlowFilter)" />
          <circle cx="280" cy="280" r="14" fill="#00f0ff" />
        </g>
      </svg>
    `;
  }

  // ── Overlay HTML Template ────────────────────────────────────────────────
  function buildOverlayHtml() {
    return `
      <div class="arc-hud-bg-grid" aria-hidden="true"></div>
      <div class="arc-hud-vignette" aria-hidden="true"></div>

      <!-- Central Arc Reactor Graphic -->
      <div class="arc-reactor-wrap" aria-hidden="true">
        ${buildArcReactorSvg()}
      </div>

      <!-- Corner HUD Framing Brackets -->
      <div class="arc-hud-corner-frame top-left" aria-hidden="true"></div>
      <div class="arc-hud-corner-frame top-right" aria-hidden="true"></div>
      <div class="arc-hud-corner-frame bottom-left" aria-hidden="true"></div>
      <div class="arc-hud-corner-frame bottom-right" aria-hidden="true"></div>

      <!-- ── Panel 1: Top-Left (Core Telemetry) ────────────────────────── -->
      <div class="arc-hud-panel panel-top-left" id="arcHudTelemetry">
        <div class="hud-panel-header">
          <div class="hud-header-left">
            <span class="hud-header-icon">◈</span>
            <span class="hud-header-title">CORE TELEMETRY</span>
            <span class="hud-header-tag">SYS.01</span>
          </div>
          <div class="hud-header-right">
            <span class="hud-status-dot" id="hudSysStatusDot"></span>
            <span class="hud-status-text" id="hudSysStatusText">ONLINE</span>
          </div>
        </div>
        <div class="hud-panel-content">
          <div class="hud-telemetry-grid">
            <div class="hud-stat-cell">
              <div class="hud-stat-label">HERMES CORE</div>
              <div class="hud-stat-value" id="hudStatVersion">v0.2.0</div>
            </div>
            <div class="hud-stat-cell">
              <div class="hud-stat-label">UPTIME</div>
              <div class="hud-stat-value" id="hudStatUptime">00:00:00</div>
            </div>
            <div class="hud-stat-cell">
              <div class="hud-stat-label">ACTIVE SESSIONS</div>
              <div class="hud-stat-value" id="hudStatSessions">0</div>
            </div>
            <div class="hud-stat-cell">
              <div class="hud-stat-label">STREAM RUNTIME</div>
              <div class="hud-stat-value" id="hudStatStreams">IDLE</div>
            </div>
            <div class="hud-stat-cell hud-cell-wide">
              <div class="hud-stat-label">TOKEN ACCUMULATION</div>
              <div class="hud-stat-value" id="hudStatTokens">0 TOTAL</div>
              <div class="hud-stat-sub" id="hudStatTokenDetail">IN: 0 · OUT: 0</div>
              <div class="hud-progress-bar"><div class="hud-progress-fill" id="hudStatTokenBar" style="width: 5%"></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Panel 2: Top-Right (Tactical Radar) ────────────────────────── -->
      <div class="arc-hud-panel panel-top-right" id="arcHudRadar">
        <div class="hud-panel-header">
          <div class="hud-header-left">
            <span class="hud-header-icon">◎</span>
            <span class="hud-header-title">TACTICAL RADAR</span>
            <span class="hud-header-tag">SCAN.04</span>
          </div>
          <div class="hud-header-right">
            <span class="hud-coords" id="hudRadarCoords">37.77° N 122.41° W</span>
          </div>
        </div>
        <div class="hud-panel-content hud-radar-layout">
          <div class="hud-radar-display">
            <div class="radar-scope">
              <div class="radar-ring ring-1"></div>
              <div class="radar-ring ring-2"></div>
              <div class="radar-ring ring-3"></div>
              <div class="radar-axis-h"></div>
              <div class="radar-axis-v"></div>
              <div class="radar-sweep"></div>
              <div class="radar-blips" id="hudRadarBlips"></div>
            </div>
          </div>
          <div class="hud-radar-info">
            <div class="radar-stat-row">
              <span class="radar-stat-lbl">TARGETS</span>
              <span class="radar-stat-val" id="hudRadarTargetCount">0</span>
            </div>
            <div class="radar-stat-row">
              <span class="radar-stat-lbl">SECTOR LOCK</span>
              <span class="radar-stat-val truncate" id="hudRadarLockName">STANDBY</span>
            </div>
            <div class="radar-stat-row">
              <span class="radar-stat-lbl">LAST PING</span>
              <span class="radar-stat-val" id="hudRadarLastPing">--:--:--</span>
            </div>
            <div class="radar-target-list" id="hudRadarTargetList"></div>
          </div>
        </div>
      </div>

      <!-- ── Panel 3: Bottom-Right (Telemetry Matrix Log) ───────────────── -->
      <div class="arc-hud-panel panel-bottom-right" id="arcHudMatrix">
        <div class="hud-panel-header">
          <div class="hud-header-left">
            <span class="hud-header-icon">▤</span>
            <span class="hud-header-title">TELEMETRY MATRIX</span>
            <span class="hud-header-tag">STREAM.LOG</span>
          </div>
          <div class="hud-header-right">
            <span class="hud-rec-dot"></span>
            <span class="hud-status-text">LIVE</span>
          </div>
        </div>
        <div class="hud-panel-content hud-matrix-content">
          <div class="hud-log-stream" id="hudLogStream" role="log" aria-live="polite"></div>
        </div>
      </div>

      <!-- ── Panel 4: Bottom-Left (Functional Composer Controls) ───────── -->
      <div class="arc-hud-panel panel-bottom-left" id="arcHudControls">
        <div class="hud-panel-header">
          <div class="hud-header-left">
            <span class="hud-header-icon">⚙</span>
            <span class="hud-header-title">SUBSYSTEM CONTROLS</span>
            <span class="hud-header-tag">COMPOSER</span>
          </div>
          <div class="hud-header-right">
            <span class="hud-status-text" id="hudControlsProfile">ACTIVE</span>
          </div>
        </div>
        <div class="hud-panel-content hud-controls-mount" id="hudControlsMount">
          <!-- .composer-left mounted here dynamically -->
        </div>
      </div>
    `;
  }

  // ── Logging to Telemetry Matrix ──────────────────────────────────────────
  function appendLog(tag, message) {
    const stream = document.getElementById('hudLogStream');
    if (!stream) return;

    const timeStr = new Date().toTimeString().split(' ')[0];
    const row = document.createElement('div');
    row.className = 'hud-log-row';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'hud-log-time';
    timeSpan.textContent = `[${timeStr}]`;

    const tagSpan = document.createElement('span');
    tagSpan.className = `hud-log-tag tag-${String(tag).toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    tagSpan.textContent = `[${tag}]`;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'hud-log-msg';
    msgSpan.textContent = String(message || '');

    row.appendChild(timeSpan);
    row.appendChild(tagSpan);
    row.appendChild(msgSpan);
    stream.appendChild(row);

    // Keep memory bounded to 60 rows
    while (stream.children.length > 60) {
      stream.removeChild(stream.firstChild);
    }
    stream.scrollTop = stream.scrollHeight;
  }

  // ── Formatters ───────────────────────────────────────────────────────────
  function formatTokens(n) {
    n = Number(n) || 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

  function formatDuration(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // ── Real Data Fetchers ───────────────────────────────────────────────────
  function fetchTelemetry() {
    if (!isHudActive) return;

    Promise.allSettled([
      fetch('/api/dashboard/status').then(r => r.ok ? r.json() : null),
      fetch('/api/settings').then(r => r.ok ? r.json() : null),
      fetch('/api/system/health').then(r => r.ok ? r.json() : null),
      fetch('/api/usage').then(r => r.ok ? r.json() : null)
    ]).then(([dashRes, setRes, healthRes, usageRes]) => {
      if (!isHudActive) return;

      const dash = dashRes.status === 'fulfilled' ? dashRes.value : null;
      const sett = setRes.status === 'fulfilled' ? setRes.value : null;
      const health = healthRes.status === 'fulfilled' ? healthRes.value : null;
      const usage = usageRes.status === 'fulfilled' ? usageRes.value : null;

      // Hermes Version
      const versionEl = document.getElementById('hudStatVersion');
      if (versionEl) {
        const ver = dash?.version || sett?.webui_version || sett?.agent_version || window.__HERMES_WEBUI_BUNDLE_VERSION__ || 'v0.2.0';
        versionEl.textContent = ver.startsWith('v') ? ver : `v${ver}`;
      }

      // System Status Dot & Text
      const dotEl = document.getElementById('hudSysStatusDot');
      const txtEl = document.getElementById('hudSysStatusText');
      if (dotEl && txtEl) {
        if (dash && dash.running === false) {
          dotEl.className = 'hud-status-dot standby';
          txtEl.textContent = 'STANDBY';
        } else {
          dotEl.className = 'hud-status-dot online';
          txtEl.textContent = 'ONLINE';
        }
      }

      // Active Streams / Runtime
      const streamEl = document.getElementById('hudStatStreams');
      if (streamEl) {
        const streams = health?.webui_runtime?.streams || 0;
        streamEl.textContent = streams > 0 ? `${streams} RUNNING` : 'IDLE';
        if (streams > 0) {
          streamEl.classList.add('stream-active');
        } else {
          streamEl.classList.remove('stream-active');
        }
      }

      // Token accumulation from /api/usage if provided
      if (usage && (usage.total_tokens !== undefined || usage.input_tokens !== undefined)) {
        const total = Number(usage.total_tokens || ((usage.input_tokens || 0) + (usage.output_tokens || 0)));
        const inp = Number(usage.input_tokens || 0);
        const out = Number(usage.output_tokens || 0);
        updateTokenStats(total, inp, out);
      }
    }).catch(err => {
      console.debug('[arc-hud] Telemetry fetch error:', err);
    });
  }

  function updateTokenStats(total, inp, out) {
    const statTokens = document.getElementById('hudStatTokens');
    const statDetail = document.getElementById('hudStatTokenDetail');
    const statBar = document.getElementById('hudStatTokenBar');
    if (statTokens) statTokens.textContent = `${formatTokens(total)} TOTAL`;
    if (statDetail) statDetail.textContent = `IN: ${formatTokens(inp)} · OUT: ${formatTokens(out)}`;
    if (statBar) {
      // Progress fill relative to 100k scale (wrapped or clamped)
      const pct = Math.min(100, Math.max(4, Math.round((total % 100000) / 1000)));
      statBar.style.width = `${pct}%`;
    }
  }

  function fetchSessions() {
    if (!isHudActive) return;

    fetch('/api/sessions')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!isHudActive || !data) return;
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        currentSessions = sessions;

        // Active Sessions Count
        const countEl = document.getElementById('hudStatSessions');
        if (countEl) countEl.textContent = String(sessions.length);

        // Sum token stats across sessions if standalone usage endpoint didn't provide
        let totalIn = 0;
        let totalOut = 0;
        sessions.forEach(s => {
          totalIn += (Number(s.input_tokens) || 0);
          totalOut += (Number(s.output_tokens) || 0);
        });
        const total = totalIn + totalOut;
        if (total > 0) {
          updateTokenStats(total, totalIn, totalOut);
        }

        // Update Radar Blips & Targets
        updateRadar(sessions);
      })
      .catch(err => {
        console.debug('[arc-hud] Sessions fetch error:', err);
      });
  }

  // ── Tactical Radar Updater ───────────────────────────────────────────────
  function updateRadar(sessions) {
    const targetCountEl = document.getElementById('hudRadarTargetCount');
    const lockNameEl = document.getElementById('hudRadarLockName');
    const lastPingEl = document.getElementById('hudRadarLastPing');
    const blipsContainer = document.getElementById('hudRadarBlips');
    const targetList = document.getElementById('hudRadarTargetList');

    if (targetCountEl) targetCountEl.textContent = String(sessions.length);
    if (lastPingEl) lastPingEl.textContent = new Date().toTimeString().split(' ')[0];

    // Sector Lock: newest or active session
    if (lockNameEl) {
      const activeSession = sessions.find(s => s.active_stream_id || s.streaming) || sessions[0];
      const title = activeSession?.title || 'SECTOR CLEAR';
      lockNameEl.textContent = title.length > 20 ? title.slice(0, 18) + '…' : title;
    }

    // Render Blips on the 130x130 radar scope
    if (blipsContainer) {
      blipsContainer.innerHTML = '';
      const blipPool = sessions.slice(0, 14); // up to 14 tactical blips
      const cx = 65;
      const cy = 65;

      blipPool.forEach((s, idx) => {
        const sid = String(s.session_id || idx);
        let hash = 0;
        for (let i = 0; i < sid.length; i++) {
          hash = ((hash << 5) - hash) + sid.charCodeAt(i);
          hash |= 0;
        }

        // Angle and radial distance from center
        const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
        const dist = 14 + (Math.abs(hash >> 6) % 44);
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;

        const blip = document.createElement('div');
        const isActive = idx === 0 || Boolean(s.active_stream_id || s.streaming);
        blip.className = `radar-blip ${isActive ? 'active' : ''}`;
        blip.style.left = `${x.toFixed(1)}px`;
        blip.style.top = `${y.toFixed(1)}px`;
        blip.title = s.title || `Session ${sid.slice(0, 8)}`;
        blipsContainer.appendChild(blip);
      });
    }

    // Render 3 recent target items in the tactical list
    if (targetList) {
      targetList.innerHTML = '';
      const recent = sessions.slice(0, 3);
      if (recent.length === 0) {
        targetList.innerHTML = '<div class="radar-target-item empty">NO ACTIVE TARGETS</div>';
      } else {
        recent.forEach((s, idx) => {
          const sid = String(s.session_id || idx);
          const shortId = sid.slice(0, 4).toUpperCase();
          const title = s.title || 'Untitled Session';
          const distKm = (1.5 + (idx * 2.3)).toFixed(1);

          const item = document.createElement('div');
          item.className = 'radar-target-item';
          item.innerHTML = `
            <span class="target-id">[0x${shortId}]</span>
            <span class="target-name truncate">${title}</span>
            <span class="target-dist">${distKm}kM</span>
          `;
          targetList.appendChild(item);
        });
      }
    }
  }

  // ── SSE Event Stream ─────────────────────────────────────────────────────
  function connectSSE() {
    if (typeof EventSource === 'undefined') return;
    if (sseSource) {
      try { sseSource.close(); } catch (_) {}
    }

    try {
      sseSource = new EventSource('/api/sessions/events');
      sseSource.onopen = () => {
        appendLog('SYS_LINK', 'SSE stream connected: /api/sessions/events');
      };
      sseSource.onerror = () => {
        // Handled silently by native EventSource reconnection
      };
      sseSource.addEventListener('session_list_changed', (e) => {
        appendLog('SESSION_SYNC', 'Session catalog modified');
        fetchSessions();
      });
      sseSource.addEventListener('session-updated', (e) => {
        appendLog('STREAM_ACK', 'Active stream payload updated');
        fetchTelemetry();
      });
      sseSource.addEventListener('stream_started', (e) => {
        appendLog('RUN_START', 'Agent turn streaming commenced');
        fetchTelemetry();
      });
    } catch (err) {
      console.debug('[arc-hud] SSE connection failed:', err);
    }
  }

  // ── Composer Left Relocation ─────────────────────────────────────────────
  function relocateComposerControls() {
    const mount = document.getElementById('hudControlsMount');
    const composerFooter = document.querySelector('.composer-footer');
    const composerLeft = document.querySelector('.composer-left');
    const composerRight = document.querySelector('.composer-right');

    if (!mount || !composerFooter || !composerLeft) return;

    // Check if placeholder already exists
    let placeholder = document.getElementById('arc-hud-composer-ph');
    if (!placeholder) {
      placeholder = document.createElement('div');
      placeholder.id = 'arc-hud-composer-ph';
      placeholder.style.display = 'none';
      if (composerRight) {
        composerFooter.insertBefore(placeholder, composerRight);
      } else {
        composerFooter.appendChild(placeholder);
      }
    }

    // Move .composer-left into our HUD controls mount
    if (composerLeft.parentElement !== mount) {
      mount.appendChild(composerLeft);
      appendLog('CONTROLS', 'Composer controls relocated to Subsystem panel');
    }
  }

  function restoreComposerControls() {
    const composerFooter = document.querySelector('.composer-footer');
    const composerLeft = document.querySelector('.composer-left');
    const placeholder = document.getElementById('arc-hud-composer-ph');

    if (composerFooter && composerLeft) {
      if (placeholder && placeholder.parentElement === composerFooter) {
        composerFooter.insertBefore(composerLeft, placeholder);
        placeholder.remove();
      } else {
        const composerRight = composerFooter.querySelector('.composer-right');
        if (composerRight) {
          composerFooter.insertBefore(composerLeft, composerRight);
        } else {
          composerFooter.appendChild(composerLeft);
        }
      }
    }
  }

  // ── HUD Lifecycle (Activate / Deactivate) ─────────────────────────────────
  function activateHud() {
    if (isHudActive) return;
    isHudActive = true;
    hudStartTime = Date.now();

    // Inject #arc-hud-overlay into body if not already present
    let overlay = document.getElementById('arc-hud-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'arc-hud-overlay';
      overlay.className = 'arc-hud-overlay';
      overlay.innerHTML = buildOverlayHtml();
      document.body.appendChild(overlay);
    }

    // Relocate real composer controls into Bottom-Left panel
    relocateComposerControls();

    // Initial logs
    appendLog('SYS_INIT', 'Arc HUD tactical subsystem v0.2.0 initialized');
    appendLog('REACTOR', 'Central Arc Core operating at 100% output');
    appendLog('RADAR', 'Sector scan engaged (360° sweep)');

    // Start Real Data polling (every 10s)
    fetchTelemetry();
    fetchSessions();
    pollTimer = setInterval(() => {
      fetchTelemetry();
      fetchSessions();
    }, 10000);

    // Live 1-second Uptime Ticker
    uptimeTimer = setInterval(() => {
      const uptimeEl = document.getElementById('hudStatUptime');
      if (uptimeEl) {
        const elapsed = (Date.now() - hudStartTime) / 1000;
        uptimeEl.textContent = formatDuration(elapsed);
      }
    }, 1000);

    // Start SSE Event stream
    connectSSE();
  }

  function deactivateHud() {
    if (!isHudActive) return;
    isHudActive = false;

    // Restore real composer controls back to .composer-footer
    restoreComposerControls();

    // Stop timers
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (uptimeTimer) {
      clearInterval(uptimeTimer);
      uptimeTimer = null;
    }
    if (sseSource) {
      try { sseSource.close(); } catch (_) {}
      sseSource = null;
    }

    // Remove HUD overlay
    const overlay = document.getElementById('arc-hud-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  // ── Observer for data-skin attribute ─────────────────────────────────────
  function checkSkinState() {
    const skin = document.documentElement && document.documentElement.dataset.skin;
    if (skin === 'arc-hud') {
      activateHud();
    } else {
      deactivateHud();
    }
  }

  function initObserver() {
    if (typeof MutationObserver === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-skin') {
          checkSkinState();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-skin']
    });

    checkSkinState();
  }

  // ── Send Button Arc Reactor Fire Pulse ───────────────────────────────────
  function initSendPulse() {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;

    function triggerPulse() {
      if (document.documentElement && document.documentElement.dataset.skin !== 'arc-hud') return;
      const sendBtn = document.getElementById('btnSend');
      if (!sendBtn || sendBtn.disabled) return;
      sendBtn.classList.remove('arc-hud-pulse');
      void sendBtn.offsetWidth; // re-arm animation
      sendBtn.classList.add('arc-hud-pulse');
      appendLog('FIRE', 'Arc Send pulse fired: payload transmitted');
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

  // ── Bootstrap ────────────────────────────────────────────────────────────
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        registerSkin();
        initObserver();
        initSendPulse();
      }, { once: true });
    } else {
      registerSkin();
      initObserver();
      initSendPulse();
    }
  } else {
    registerSkin();
  }
})();
