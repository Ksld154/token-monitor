import { publicLimits } from './shared/limits.js';
import { aggregateDevices, mergeDeviceRecord, aggregateHistory } from './shared/usage.js';
import { historyPreview, historyRevision } from './shared/history.js';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type,x-token-monitor-secret'
};

function jsonResponse(status, payload, extra = {}) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store, no-transform', ...CORS_HEADERS, ...extra }
  });
}

function textResponse(status, body, contentType = 'text/plain; charset=utf-8') {
  return new Response(body, { status, headers: { 'content-type': contentType, ...CORS_HEADERS } });
}

function requestSecret(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const headerSecret = String(request.headers.get('x-token-monitor-secret') || '').trim();
  if (headerSecret) return headerSecret;
  try {
    const url = new URL(request.url);
    return String(url.searchParams.get('secret') || '').trim();
  } catch (_) { return ''; }
}

function isAuthorized(request, expectedSecret) {
  if (!expectedSecret) return true;
  return requestSecret(request) === expectedSecret;
}

function sseFormat(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return textResponse(204, '');
    const id = env.HUB.idFromName('hub');
    const stub = env.HUB.get(id);
    return stub.fetch(request);
  }
};

export class HubDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sseClients = new Set();
    this.heartbeatTimer = null;
    this.encoder = new TextEncoder();
  }

  get secret() {
    return String(this.env.TOKEN_MONITOR_SECRET || '').trim();
  }

  get staleAfterMs() {
    return Number(this.env.STALE_AFTER_MS || 10 * 60 * 1000);
  }

  get publicStatsEnabled() {
    return ['1', 'true', 'yes', 'on'].includes(String(this.env.PUBLIC_STATS_ENABLED || '').trim().toLowerCase());
  }

  async listDevices() {
    const entries = await this.state.storage.list({ prefix: 'dev:' });
    return Array.from(entries.values());
  }

  async getStats() {
    const devices = await this.listDevices();
    const stats = aggregateDevices(devices, this.staleAfterMs);
    stats.staleAfterMs = this.staleAfterMs;
    const history = aggregateHistory(devices);
    stats.historyPreview = historyPreview(history);
    stats.historyRevision = historyRevision(history);
    return stats;
  }

  ensureHeartbeat() {
    if (this.heartbeatTimer || this.sseClients.size === 0) return;
    this.heartbeatTimer = setInterval(() => {
      const chunk = this.encoder.encode(': hb\n\n');
      for (const writer of this.sseClients) {
        writer.write(chunk).catch(() => this.dropClient(writer));
      }
      if (this.sseClients.size === 0 && this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    }, 30000);
  }

  dropClient(writer) {
    this.sseClients.delete(writer);
    try { writer.close(); } catch (_) {}
    if (this.sseClients.size === 0 && this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async broadcast(reason = 'update') {
    if (this.sseClients.size === 0) return;
    const stats = await this.getStats();
    const payload = this.encoder.encode(sseFormat('stats', {
      type: 'stats', reason, stats, at: new Date().toISOString()
    }));
    for (const writer of this.sseClients) {
      writer.write(payload).catch(() => this.dropClient(writer));
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (!isAuthorized(request, this.secret)) {
        return new Response('Unauthorized - Please provide ?secret=your_secret in URL', {
          status: 401,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        });
      }
      
      const stats = await this.getStats();
      
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Token Monitor Mobile</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

          :root {
            --bg-gradient: linear-gradient(135deg, #090e1a, #0b152d, #090e1a);
            --card-bg: rgba(17, 25, 40, 0.65);
            --card-border: rgba(255, 255, 255, 0.08);
            --text-primary: #f3f4f6;
            --text-secondary: #9ca3af;
            --text-tertiary: #6b7280;
            --accent-blue: #3b82f6;
            --accent-cyan: #06b6d4;
            --accent-green: #10b981;
            --accent-purple: #8b5cf6;
            --accent-orange: #f59e0b;
            --accent-red: #ef4444;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            background: #090d16;
            background-image: var(--bg-gradient);
            color: var(--text-primary);
            font-family: 'Outfit', -apple-system, sans-serif;
            min-height: 100vh;
            padding: 24px 16px;
            -webkit-font-smoothing: antialiased;
          }

          .app-container {
            max-width: 600px;
            margin: 0 auto;
          }

          header {
            margin-bottom: 24px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.04);
            padding: 4px 12px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.06);
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-secondary);
          }

          .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
          }

          .status-dot.connected {
            background: var(--accent-green);
            box-shadow: 0 0 8px var(--accent-green);
            animation: pulse 1.8s infinite;
          }

          .status-dot.connecting {
            background: var(--accent-orange);
            box-shadow: 0 0 8px var(--accent-orange);
            animation: pulse 1.8s infinite;
          }

          .status-dot.disconnected {
            background: var(--accent-red);
            box-shadow: 0 0 8px var(--accent-red);
            animation: pulse 1.8s infinite;
          }

          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }

          h1 {
            font-size: 1.6rem;
            font-weight: 700;
            letter-spacing: -0.025em;
            background: linear-gradient(to right, #60a5fa, #c084fc);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .subtitle {
            font-size: 0.8rem;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .section-container {
            margin-top: 24px;
          }

          h2 {
            font-size: 0.9rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary);
            margin-bottom: 12px;
            padding-left: 4px;
          }

          .glass-card {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.25);
          }

          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .main-stat-card {
            display: flex;
            flex-direction: column;
          }

          .card-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
          }

          .card-icon {
            font-size: 1rem;
          }

          .card-header h3 {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-secondary);
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }

          .stat-value {
            font-size: 1.25rem;
            font-weight: 700;
            font-family: 'Outfit', -apple-system, sans-serif;
            color: #fff;
            margin-bottom: 2px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .stat-meta {
            font-size: 0.8rem;
            color: var(--text-secondary);
          }

          .stat-meta span {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
          }

          /* Agent Limits Styling */
          .limits-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .limit-item {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .limit-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
          }

          .limit-provider {
            font-weight: 600;
            color: #fff;
            text-transform: capitalize;
          }

          .limit-label {
            color: var(--text-secondary);
            font-size: 0.75rem;
            margin-left: 4px;
          }

          .limit-remaining {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
          }

          .limit-remaining.high { color: var(--accent-green); }
          .limit-remaining.medium { color: var(--accent-orange); }
          .limit-remaining.low { color: var(--accent-red); }

          .progress-track {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 4px;
            overflow: hidden;
          }

          .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .progress-fill.high { background: linear-gradient(90deg, #10b981, #34d399); }
          .progress-fill.medium { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
          .progress-fill.low { background: linear-gradient(90deg, #ef4444, #f87171); }

          .limit-footer {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: var(--text-tertiary);
          }

          /* Tabs Styling */
          .tabs {
            display: flex;
            background: rgba(0, 0, 0, 0.2);
            padding: 4px;
            border-radius: 12px;
            margin-bottom: 16px;
            border: 1px solid rgba(255, 255, 255, 0.04);
          }

          .tab-btn {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-family: 'Outfit', sans-serif;
            font-size: 0.85rem;
            font-weight: 500;
            padding: 8px 0;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .tab-btn.active {
            background: rgba(255, 255, 255, 0.08);
            color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          /* Model Breakdown Styling */
          .models-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .model-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          }

          .model-item:last-child {
            padding-bottom: 0;
            border-bottom: none;
          }

          .model-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.85rem;
          }

          .model-name {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
            color: #fff;
          }

          .model-cost {
            font-weight: 600;
            color: var(--accent-green);
          }

          .model-bar-wrapper {
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 2px;
          }

          .model-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
            border-radius: 2px;
          }

          .model-meta {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: var(--text-tertiary);
          }

          /* Devices Styling */
          .devices-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .device-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          }

          .device-item:last-child {
            border-bottom: none;
            padding-bottom: 0;
          }

          .device-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .device-name {
            font-weight: 600;
            color: #fff;
            font-size: 0.9rem;
          }

          .device-os {
            font-size: 0.75rem;
            color: var(--text-tertiary);
          }

          .device-status {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .device-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
          }

          .device-status-dot.online {
            background: var(--accent-green);
            box-shadow: 0 0 6px var(--accent-green);
          }

          .device-status-dot.offline {
            background: var(--accent-red);
            box-shadow: 0 0 6px var(--accent-red);
          }

          .device-status.online { color: var(--accent-green); }
          .device-status.offline { color: var(--text-tertiary); }

          .loading-state, .empty-state {
            text-align: center;
            color: var(--text-tertiary);
            font-size: 0.85rem;
            padding: 20px 0;
          }

          /* Brand Theme Colors */
          .progress-fill.brand-gpt { background: linear-gradient(90deg, #14b8a6, #06b6d4); }
          .progress-fill.brand-claude { background: linear-gradient(90deg, #db7551, #e08b6c); }
          .progress-fill.brand-gemini { background: linear-gradient(90deg, #2563eb, #3b82f6); }
          .progress-fill.brand-default { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }

          .limit-remaining.brand-gpt { color: #06b6d4; }
          .limit-remaining.brand-claude { color: #db7551; }
          .limit-remaining.brand-gemini { color: #60a5fa; }
          .limit-remaining.brand-default { color: #a78bfa; }

          @media (max-width: 480px) {
            body {
              padding: 16px 12px;
            }
            .stats-grid {
              gap: 10px;
            }
            .glass-card {
              padding: 14px;
            }
            .stat-value {
              font-size: 1.1rem;
            }
            h1 {
              font-size: 1.4rem;
            }
          }
        </style>
      </head>
      <body>
        <div class="app-container">
          <header>
            <div class="brand">
              <h1>Token Monitor</h1>
              <div class="status-indicator">
                <span class="status-dot disconnected" id="status-dot"></span>
                <span class="status-text" id="status-text">Disconnected</span>
              </div>
            </div>
            <div class="subtitle">Cloud Hub • Realtime Sync</div>
          </header>

          <!-- Hero Stats Section -->
          <div class="stats-grid">
            <div class="glass-card main-stat-card">
              <div class="card-header">
                <span class="card-icon">⚡</span>
                <h3>TODAY</h3>
              </div>
              <div class="stat-value" id="today-cost">NT$0.00</div>
              <div class="stat-meta">
                <span id="today-tokens">0</span> tokens
              </div>
            </div>

            <div class="glass-card main-stat-card">
              <div class="card-header">
                <span class="card-icon">📅</span>
                <h3>MONTH</h3>
              </div>
              <div class="stat-value" id="month-cost">NT$0.00</div>
              <div class="stat-meta">
                <span id="month-tokens">0</span> tokens
              </div>
            </div>
          </div>

          <!-- Agent Limits -->
          <section class="section-container">
            <h2>Agent Limits & Allowances</h2>
            <div class="glass-card">
              <div id="limits-container" class="limits-list">
                <div class="loading-state">Loading limit data...</div>
              </div>
            </div>
          </section>

          <!-- Model Breakdown -->
          <section class="section-container">
            <h2>Model breakdown</h2>
            <div class="glass-card">
              <div class="tabs">
                <button class="tab-btn active" id="btn-today" onclick="switchPeriod('today')">Today</button>
                <button class="tab-btn" id="btn-month" onclick="switchPeriod('month')">Month</button>
              </div>
              <div id="models-container" class="models-list">
                <div class="loading-state">Loading model data...</div>
              </div>
            </div>
          </section>

          <!-- Connected Devices -->
          <section class="section-container">
            <h2>Connected Devices</h2>
            <div class="glass-card">
              <div id="devices-container" class="devices-list">
                <div class="loading-state">Loading device data...</div>
              </div>
            </div>
          </section>
        </div>

        <script>
          const INITIAL_STATS = ${JSON.stringify(stats)};
          const SECRET = ${JSON.stringify(this.secret)};
          
          let currentStats = INITIAL_STATS;
          let activePeriod = 'today';

          function formatTWD(usd) {
            const twd = (usd || 0) * 31.5;
            if (twd === 0) return 'NT$0.00';
            if (twd < 0.1) return 'NT$' + twd.toFixed(4);
            if (twd < 1) return 'NT$' + twd.toFixed(3);
            return 'NT$' + twd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }

          function formatTokens(num) {
            return Number(num || 0).toLocaleString();
          }

          function getLimitStatusText(window) {
            const percentText = Math.round(window.remainingPercent) + '%';
            let timeText = '';
            
            if (window.resetsAt) {
              const diffMs = new Date(window.resetsAt) - Date.now();
              if (diffMs > 0) {
                const diffMins = Math.ceil(diffMs / 60000);
                if (diffMins < 60) {
                  timeText = diffMins + 'm';
                } else {
                  const diffHours = (diffMins / 60).toFixed(1);
                  timeText = diffHours + 'hr';
                }
              }
            }
            
            if (!timeText && window.resetDescription) {
              timeText = window.resetDescription;
            }
            
            if (!timeText) {
              timeText = window.kind || 'limit';
            }
            
            return percentText + ' (' + timeText + ')';
          }

          function getLimitStatusClass(remainingPercent) {
            if (remainingPercent > 50) return 'high';
            if (remainingPercent > 20) return 'medium';
            return 'low';
          }

          function updateDashboard(stats) {
            if (!stats) return;
            currentStats = stats;
            
            // Today's summary
            const todayPeriod = stats.periods?.today || { totalTokens: 0, costUsd: 0 };
            document.getElementById('today-cost').textContent = formatTWD(todayPeriod.costUsd);
            document.getElementById('today-tokens').textContent = formatTokens(todayPeriod.totalTokens);
            
            // Month's summary
            const monthPeriod = stats.periods?.month || { totalTokens: 0, costUsd: 0 };
            document.getElementById('month-cost').textContent = formatTWD(monthPeriod.costUsd);
            document.getElementById('month-tokens').textContent = formatTokens(monthPeriod.totalTokens);
            
            // Render Limits
            renderLimits(stats);
            
            // Render Models for the currently active tab
            renderModels(stats);
            
            // Render Devices
            renderDevices(stats);
          }

          function getProviderColorClass(provider) {
            if (provider === 'claude') return 'brand-claude';
            if (provider === 'antigravity') return 'brand-gemini';
            if (provider === 'copilot' || provider === 'codex' || provider === 'gpt') return 'brand-gpt';
            return 'brand-default';
          }

          function renderLimits(stats) {
            const container = document.getElementById('limits-container');
            const providers = stats.limits?.providers || [];
            
            // Find active limits (status ok or has windows)
            let activeProviders = providers.filter(p => p.status === 'ok' && p.windows && p.windows.length > 0);
            
            if (activeProviders.length === 0) {
              container.innerHTML = '<div class="empty-state">No active agent limits reported.</div>';
              return;
            }

            // Sort providers by priority: gpt -> claude -> gemini
            const PROVIDER_ORDER = {
              'copilot': 1,
              'codex': 1,
              'claude': 2,
              'antigravity': 3
            };
            activeProviders.sort((a, b) => {
              const orderA = PROVIDER_ORDER[a.provider] || 99;
              const orderB = PROVIDER_ORDER[b.provider] || 99;
              return orderA - orderB;
            });
            
            const providerLabels = {
              'claude': 'Claude Code',
              'antigravity': 'Gemini',
              'cursor': 'Cursor',
              'copilot': 'GitHub Copilot',
              'grok': 'Grok',
              'codex': 'Codex',
              'deepseek': 'DeepSeek',
              'kimi': 'Kimi Code',
              'qwen': 'Qwen'
            };

            // Map/transform providers
            const processedProviders = activeProviders.map(p => {
              const cp = { ...p, windows: [...p.windows] };
              if (p.provider === 'antigravity') {
                // Find all Gemini windows
                const geminiWindows = cp.windows.filter(w => String(w.label).toLowerCase().includes('gemini'));
                // Filter out Gemini windows from the list
                cp.windows = cp.windows.filter(w => !String(w.label).toLowerCase().includes('gemini'));
                
                if (geminiWindows.length > 0) {
                  // Collapse Gemini windows into a single Gemini session window
                  let minRemaining = 100;
                  let earliestReset = null;
                  
                  geminiWindows.forEach(w => {
                    if (w.remainingPercent !== null && w.remainingPercent < minRemaining) {
                      minRemaining = w.remainingPercent;
                    }
                    if (w.resetsAt) {
                      const d = new Date(w.resetsAt);
                      if (!earliestReset || d < earliestReset) {
                        earliestReset = d;
                      }
                    }
                  });
                  
                  cp.windows.push({
                    kind: 'session',
                    label: '',
                    remainingPercent: minRemaining,
                    usedPercent: 100 - minRemaining,
                    used: null,
                    limit: null,
                    resetsAt: earliestReset ? earliestReset.toISOString() : null,
                    resetDescription: '5hr'
                  });
                }
              }
              return cp;
            });

            let html = '';
            processedProviders.forEach(p => {
              const displayProvider = providerLabels[p.provider] || p.provider;
              const brandClass = getProviderColorClass(p.provider);
              
              p.windows.forEach(w => {
                // Skip rendering Google's built-in Claude/GPT limit under Antigravity
                if (p.provider === 'antigravity' && (w.label === 'Claude' || String(w.label).toLowerCase().includes('claude') || String(w.label).toLowerCase().includes('gpt'))) return;

                const remainingPercent = w.remainingPercent !== null ? w.remainingPercent : 100;
                const remainingText = getLimitStatusText(w);
                
                const usedText = w.used !== null ? formatTokens(w.used) : '';
                const limitText = w.limit !== null ? formatTokens(w.limit) : '';
                const valuesLabel = (usedText && limitText) ? usedText + ' / ' + limitText : '';
                
                html += \`
                  <div class="limit-item">
                    <div class="limit-meta">
                      <div>
                        <span class="limit-provider">\${displayProvider}</span>
                        <span class="limit-label">\${w.label || ''}</span>
                      </div>
                      <span class="limit-remaining \${brandClass}">\${remainingText}</span>
                    </div>
                    <div class="progress-track">
                      <div class="progress-fill \${brandClass}" style="width: \${remainingPercent}%"></div>
                    </div>
                    <div class="limit-footer">
                      <span>\${w.kind || 'session'} limit</span>
                      <span>\${valuesLabel}</span>
                    </div>
                  </div>
                \`;
              });
            });
            
            container.innerHTML = html;
          }

          function switchPeriod(period) {
            activePeriod = period;
            document.getElementById('btn-today').classList.toggle('active', period === 'today');
            document.getElementById('btn-month').classList.toggle('active', period === 'month');
            renderModels(currentStats);
          }

          function renderModels(stats) {
            const container = document.getElementById('models-container');
            const periodData = stats.periods?.[activePeriod] || { totalTokens: 0, costUsd: 0, models: {}, modelCosts: {} };
            
            const models = periodData.models || {};
            const modelCosts = periodData.modelCosts || {};
            const modelKeys = Object.keys(models);
            
            if (modelKeys.length === 0) {
              container.innerHTML = '<div class="empty-state">No model usage recorded for this period.</div>';
              return;
            }
            
            // Calculate total tokens for percentages
            const totalTokens = periodData.totalTokens || 1;
            
            // Sort models by token count descending
            const sortedModels = modelKeys.map(k => ({
              name: k,
              tokens: models[k],
              costUsd: modelCosts[k] || 0
            })).sort((a, b) => b.tokens - a.tokens);
            
            let html = '';
            sortedModels.forEach(m => {
              const percent = Math.min(100, (m.tokens / totalTokens) * 100);
              html += \`
                <div class="model-item">
                  <div class="model-header">
                    <span class="model-name">\${m.name}</span>
                    <span class="model-cost">\${formatTWD(m.costUsd)}</span>
                  </div>
                  <div class="model-bar-wrapper">
                    <div class="model-bar-fill" style="width: \${percent}%"></div>
                  </div>
                  <div class="model-meta">
                    <span>\${formatTokens(m.tokens)} tokens</span>
                    <span>\${percent.toFixed(1)}% of total</span>
                  </div>
                </div>
              \`;
            });
            
            container.innerHTML = html;
          }

          function renderDevices(stats) {
            const container = document.getElementById('devices-container');
            const devices = stats.devices || [];
            
            if (devices.length === 0) {
              container.innerHTML = '<div class="empty-state">No devices registered.</div>';
              return;
            }
            
            let html = '';
            devices.forEach(d => {
              const isOnline = !d.stale;
              const statusText = isOnline ? 'Online' : 'Offline';
              const statusClass = isOnline ? 'online' : 'offline';
              
              // Parse reported/updated time
              const lastActive = d.updatedAt ? new Date(d.updatedAt).toLocaleTimeString() : 'unknown';
              
              html += \`
                <div class="device-item">
                  <div class="device-info">
                    <span class="device-name">\${d.hostname || d.deviceId}</span>
                    <span class="device-os">\${d.platform || 'Unknown OS'} • Active at \${lastActive}</span>
                  </div>
                  <div class="device-status \${statusClass}">
                    <span class="device-status-dot \${statusClass}"></span>
                    <span>\${statusText}</span>
                  </div>
                </div>
              \`;
            });
            
            container.innerHTML = html;
          }

          // Initialize
          updateDashboard(INITIAL_STATS);

          // SSE connection
          function startSSE() {
            const statusDot = document.getElementById('status-dot');
            const statusText = document.getElementById('status-text');
            
            statusDot.className = 'status-dot connecting';
            statusText.textContent = 'Connecting';
            
            const sse = new EventSource('/api/stats/stream?secret=' + encodeURIComponent(SECRET));
            
            sse.onopen = () => {
              statusDot.className = 'status-dot text-online connected';
              statusText.textContent = 'Live';
            };
            
            sse.onerror = (err) => {
              statusDot.className = 'status-dot disconnected';
              statusText.textContent = 'Reconnecting';
            };
            
            const handleMessage = (e) => {
              try {
                const data = JSON.parse(e.data);
                if (data && data.stats) {
                  updateDashboard(data.stats);
                }
              } catch (err) {
                console.error('Failed to parse SSE stats:', err);
              }
            };
            
            sse.addEventListener('snapshot', handleMessage);
            sse.addEventListener('stats', handleMessage);
          }

          // Start SSE connection
          startSSE();
        </script>
      </body>
      </html>`;
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/api/health') {
      const devices = await this.listDevices();
      return jsonResponse(200, {
        ok: true,
        role: 'hub',
        runtime: 'cloudflare-worker',
        version: 1,
        deviceCount: devices.length,
        secretRequired: Boolean(this.secret),
        now: new Date().toISOString()
      });
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/public/stats') {
      if (!this.publicStatsEnabled) return jsonResponse(404, { error: 'not_found' });
      const stats = await this.getStats();
      const { devices, limits, periods, ...rest } = stats;
      return jsonResponse(200, {
        ok: true,
        source: 'cloudflare-worker',
        deviceCount: devices.length,
        limits: publicLimits(limits),
        periods: publicPeriods(periods),
        ...rest
      }, { 'cache-control': 'public, max-age=15, s-maxage=15' });
    }

    // A Worker is an internet-facing URL with no trusted-LAN fallback, so it must
    // never serve data unauthenticated. Without a secret every data route is refused
    // (health and the opt-in, already-scrubbed /api/public/stats are handled above).
    if (!this.secret) {
      return jsonResponse(503, { error: 'secret_required', message: 'TOKEN_MONITOR_SECRET must be set on the worker; unauthenticated access is refused.' });
    }
    if (!isAuthorized(request, this.secret)) return jsonResponse(401, { error: 'unauthorized' });

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/stats') {
      return jsonResponse(200, await this.getStats());
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/devices') {
      const devices = await this.listDevices();
      return jsonResponse(200, { devices });
    }

    if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/api/history') {
      const devices = await this.listDevices();
      return jsonResponse(200, aggregateHistory(devices));
    }

    if (request.method === 'GET' && url.pathname === '/api/stats/stream') {
      const stats = await this.getStats();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      writer.write(this.encoder.encode(sseFormat('snapshot', {
        type: 'stats', reason: 'snapshot', stats, at: new Date().toISOString()
      }))).catch(() => {});
      this.sseClients.add(writer);
      this.ensureHeartbeat();
      request.signal.addEventListener('abort', () => this.dropClient(writer));
      return new Response(readable, {
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache, no-transform',
          'connection': 'keep-alive',
          'x-accel-buffering': 'no',
          ...CORS_HEADERS
        }
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/ingest') {
      let payload;
      try { payload = await request.json(); }
      catch (error) { return jsonResponse(400, { error: 'bad_request', message: error.message }); }
      if (!payload.deviceId && !payload.id) return jsonResponse(400, { error: 'deviceId_required' });
      const deviceId = String(payload.deviceId || payload.id);
      const existing = await this.state.storage.get(`dev:${deviceId}`);
      const record = mergeDeviceRecord(existing, { ...payload, receivedAt: new Date().toISOString() });
      await this.state.storage.put(`dev:${record.deviceId}`, record);
      this.broadcast('ingest').catch(() => {});
      return jsonResponse(200, { ok: true, deviceId: record.deviceId, stats: await this.getStats() });
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/devices/')) {
      const deviceId = decodeURIComponent(url.pathname.slice('/api/devices/'.length));
      await this.state.storage.delete(`dev:${deviceId}`);
      this.broadcast('delete').catch(() => {});
      return jsonResponse(200, { ok: true, deviceId });
    }

    return jsonResponse(404, { error: 'not_found' });
  }
}

function publicPeriods(periods) {
  return Object.fromEntries(Object.entries(periods || {}).map(([name, period]) => {
    const safePeriod = { ...(period || {}) };
    delete safePeriod.projects;
    return [name, {
      ...safePeriod,
      sessions: Object.fromEntries(Object.entries(period?.sessions || {}).map(([key, session]) => {
      const { projectId, projectLabel, projectPath, ...safe } = session;
      return [key, safe];
      }))
    }];
  }));
}

export { publicPeriods };
