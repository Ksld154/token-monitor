# 行動裝置 (Android / iOS) 監控支援可行性與實作指南

目前本專案的桌面版（Electron）與 Headless 收集器（Agent Mode）已經打下了非常好的基礎。所有的資料都可以上報給一個集中的 Hub（如 Win11 上的 Hub 或是 Cloudflare Worker Hub）。

要在 Android 或 iOS 等行動裝置上瀏覽其他機器的 Token 使用情況，**「完全不需要」開發原生的 Android / iOS App**。由於 Hub 已經提供了完整的 API，我們只需要透過 **Web 網頁端儀表板（Web Dashboard）**，即可讓手機瀏覽器直接連線並享有一模一樣的瀏覽體驗。

---

## 核心技術可行性分析

1. **跨來源資源共享 (CORS) 支援**
   * 目前 [http.js](../src/shared/http.js) 的 `corsHeaders()` 中，已經預設回傳了 `'access-control-allow-origin': '*'`。這代表不管是執行於 Win11 的 Node Hub 還是 Cloudflare Worker Hub，**都已經支援跨網域 API 呼叫**。
2. **實時更新 (Server-Sent Events, SSE)**
   * Hub 提供 `/api/stats/stream` 路由。行動裝置的 Chrome、Safari 等主流瀏覽器都原生支援 `EventSource` (SSE)，能完美接收實時用量推送，不需要使用額外的 WebSocket。
3. **唯一的技術痛點：桌面端 UI 對 Electron IPC 的依賴**
   * 現有的前端網頁 (`src/electron/renderer/`) 是為 Electron 設計的，它透過 `preload.js` 暴露的 `window.tokenMonitor` 來呼叫 `ipcRenderer` 取得資料。
   * 如果直接在手機瀏覽器打開該網頁，會因為找不到 `window.tokenMonitor` 而報錯中斷。

---

## 💡 解決方案：網頁版相容層 (Web Shim)

我們可以在前端載入時加入一個相容層（Shim），當偵測到 `window.tokenMonitor` 不存在（即處於一般瀏覽器環境）時，自動注入一個**透過標準 HTTP / SSE 存取 Hub API** 的模擬物件。

### 1. 前端相容層 (Web Shim) 實作範例

可以在前端 HTML 中引入以下 `web-shim.js`（或直接寫在 `app.js` 初始化前）：

```javascript
// web-shim.js
if (!window.tokenMonitor) {
  console.log("[Web Shim] Detected standard browser environment. Injecting Hub API fallback...");

  // 取得當前網頁的 Host 作為 Hub 地址（若前端與 Hub 部署在一起）
  // 或是從 LocalStorage 讀取使用者設定的 Hub URL 與 Secret
  const HUB_URL = localStorage.getItem("TM_HUB_URL") || window.location.origin;
  const HUB_SECRET = localStorage.getItem("TM_HUB_SECRET") || "";

  const headers = {
    "content-type": "application/json",
  };
  if (HUB_SECRET) {
    headers["x-token-monitor-secret"] = HUB_SECRET;
  }

  window.tokenMonitor = {
    // 1. 取得設定
    getSettings: async () => {
      // 在 Web 端，大部分 settings 可以儲存在 LocalStorage
      const localSettings = localStorage.getItem("TM_SETTINGS");
      return localSettings ? JSON.parse(localSettings) : {
        language: "auto",
        theme: "dark",
        historyEnabled: true,
        // 其他預設值...
      };
    },
    updateSettings: async (patch) => {
      const current = await window.tokenMonitor.getSettings();
      const updated = { ...current, ...patch };
      localStorage.setItem("TM_SETTINGS", JSON.stringify(updated));
      return updated;
    },

    // 2. 取得統計數據 (拉取)
    getStats: async () => {
      const res = await fetch(`${HUB_URL}/api/stats`, { headers });
      return await res.json();
    },

    // 3. 取得歷史紀錄
    getDashboardHistory: async () => {
      const res = await fetch(`${HUB_URL}/api/history`, { headers });
      return await res.json();
    },

    // 4. 實時推送 (SSE)
    onStatsPush: (callback) => {
      const sseUrl = `${HUB_URL}/api/stats/stream` + (HUB_SECRET ? `?secret=${encodeURIComponent(HUB_SECRET)}` : "");
      const eventSource = new EventSource(sseUrl);
      
      const listener = (event) => {
        try {
          const payload = JSON.parse(event.data);
          callback(payload);
        } catch (e) {
          console.error("Failed to parse SSE payload", e);
        }
      };

      eventSource.addEventListener("stats", listener);
      eventSource.addEventListener("snapshot", listener);

      // 回傳一個用來取消監聽的 cleanup 函式
      return () => {
        eventSource.removeEventListener("stats", listener);
        eventSource.removeEventListener("snapshot", listener);
        eventSource.close();
      };
    },

    // Mock 掉 Electron 特有的視窗控制 API，避免報錯
    dashboard: {
      ready: () => console.log("Dashboard ready"),
      minimize: () => {},
      close: () => {}
    },
    getAppInfo: async () => ({ version: "1.0.0-web", platform: "web" }),
    getTokscaleStatus: async () => ({ installed: false }),
    getAppUpdateState: async () => ({ status: "idle" }),
  };
}
```

---

## 🚀 部署與存取方案

有了 Web Shim 後，你有兩種方式讓手機連線上網頁：

### 方案 A：區域網路 (LAN) 直接連線 (適合在家/辦公室)

如果你的手機與 Win11 處於同一個 WiFi 網路下，你可以讓 Win11 上的 Hub 直接當作網頁伺服器（Web Server）：

1. **設定 Win11 Hub 允許區域網路連線**：
   修改 Win11 上的 `.env` 設定：
   ```env
   TOKEN_MONITOR_HOST=0.0.0.0   # 允許監聽所有網路卡 IP
   TOKEN_MONITOR_SECRET=你的密鑰 # 跨裝置存取時，強烈建議設定密鑰以保證安全
   ```
2. **修改 Node Hub 支持靜態檔案服務**：
   在 [server.js](../src/hub/server.js) 中，加入一個簡單的靜態檔案路由。例如當請求不是以 `/api/` 開頭時，自動去讀取 `src/electron/renderer/` 目錄下的靜態檔案：
   ```javascript
   // 簡易靜態檔案處理邏輯示意 (插入至 handleRequest 開頭)
   if (!url.pathname.startsWith('/api/')) {
     const fs = require('node:fs');
     const safePath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, '');
     let filePath = path.join(__dirname, '../electron/renderer', safePath === '/' ? 'index.html' : safePath);
     
     if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
       const ext = path.extname(filePath);
       const contentType = {
         '.html': 'text/html',
         '.js': 'application/javascript',
         '.css': 'text/css',
         '.svg': 'image/svg+xml'
       }[ext] || 'text/plain';
       
       res.writeHead(200, { 'content-type': contentType });
       fs.createReadStream(filePath).pipe(res);
       return;
     }
   }
   ```
3. **手機連線**：
   手機打開瀏覽器，直接輸入 `http://<win11-的-局域網-IP>:17321/`，即可直接開始瀏覽！

---

### 方案 B：網際網路雲端監控 (使用 Cloudflare Worker + 網頁託管)

如果你希望手機在外面（使用 4G/5G 行動網路）也能隨時查看 Token 使用量，不需要對 Win11 做複雜的 Port Forwarding：

1. **部署 Cloudflare Worker Hub**：
   利用專案中現有的 `worker/` 目錄，將 Hub 部署到 Cloudflare Worker 上。
2. **修改上報路徑**：
   * 將 Linux Agent 的上報目標改為 Cloudflare Worker 的網址（並帶上 `TOKEN_MONITOR_SECRET`）。
   * 將 Win11 上的上報目標也改為該 Cloudflare Worker。
3. **部署前端網頁**：
   將加入了 Web Shim 的前端網頁資料夾（`src/electron/renderer` 加上相容層後）部署到 **Cloudflare Pages**、**GitHub Pages** 或 **Vercel** 等免費靜態網頁空間。
4. **手機連線與設定**：
   * 用手機開啟該網頁（例如 `https://your-token-monitor.pages.dev`）。
   * 第一次開啟時，網頁會彈出視窗請你輸入 **Cloudflare Worker Hub URL** 以及 **Secret**。
   * 輸入後，網頁將這兩項資訊記在 `localStorage`，隨後即可隨時隨地查看你所有機器的 AI 用量！
   * 你甚至可以將此網頁在手機瀏覽器中「**加入主畫面**」，它就會像一個獨立的 App 一樣運作。

---

## 總結

本專案**非常有機會且容易**支援 Android / iOS。因為底層的 Hub API 設計得非常乾淨，且已支援跨網域 CORS 以及 SSE。

最推薦的開發路徑是：**為前端 UI 撰寫一個 Web Shim，並微調 Hub Server 讓其具備 serve 靜態檔案能力的修改**。這樣不需要額外維護 Android/iOS 專案，就能完美達成你的需求！
