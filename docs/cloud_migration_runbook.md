# Token Monitor 雲端遷移與手機監控部署指南 (Runbook)

本指南為你敲定後的最終部署步驟。請依序在各裝置執行對應的指令與設定，即可將 Token 監控遷移至 Cloudflare 雲端，並實現在 Win11 與手機上的雙向同步瀏覽。

---

## 📋 事前準備
1. 註冊好一個免費的 [Cloudflare 帳號](https://dash.cloudflare.com/)。
2. Win11 電腦上已安裝 [Node.js (>=22)](https://nodejs.org/)。

---

## 🛠️ 第一階段：部署 Cloudflare Worker (雲端數據中心)
請在你的 **Win11 電腦**（或任何有安裝 Git/Node.js 的電腦）開啟終端機，執行以下指令：

```bash
# 1. 進入專案的 worker 目錄
cd worker

# 2. 安裝 Cloudflare Wrangler 部署工具與依賴
npm install

# 3. 登入你的 Cloudflare 帳號 (會自動跳出瀏覽器，請點選授權)
npx wrangler login

# 4. 設定你的通訊密鑰 (請輸入一串自訂的隨機英文數字，所有機器都要用它來驗證)
npx wrangler secret put TOKEN_MONITOR_SECRET

# 5. 將 Hub 部署到雲端
npx wrangler deploy
```

> [!IMPORTANT]
> **部署完成後，請記錄終端機印出的 Worker 網址**，例如：
> `https://token-monitor-hub.yourname.workers.dev`
> *(以下步驟簡稱為 `你的Worker網址`)*

---

## 🐧 第二階段：設定 Linux Headless Agents (用量收集端)
請連線到你跑 AI 的 **多台 Linux 機器** 上，修改專案根目錄的 `.env` 檔案（若無則從 `.env.example` 複製）：

```env
# 填入第一階段取得的 Worker 網址與密鑰
TOKEN_MONITOR_HUB_URL=你的Worker網址
TOKEN_MONITOR_SECRET=你的自訂密鑰

# (選填) 設定該裝置的識別名稱，預設為 Linux 的 hostname
TOKEN_MONITOR_DEVICE_ID=my-linux-server
```

修改完成後，**重新啟動** Linux 上的 agent 服務：
```bash
# 重啟 agent 開始自動上報用量至雲端
npm run agent
```

---

## 💻 第三階段：設定 Win11 Widget (上報端兼桌面瀏覽端)
打開你的 **Win11 桌面版 Token Monitor 軟體**：

1. 點擊右下角的 **Settings (設定齒輪)**。
2. 找到 **Multi-device Sync (多裝置同步)** 區塊。
3. 進行以下設定：
   * **Hub Mode**：切換為 **`client`**。
   * **Hub URL**：填入 `你的Worker網址`。
   * **Secret**：填入 `你的自訂密鑰`。
4. 點選 **Save (儲存)**。

> [!NOTE]
> 儲存後，Win11 App 的狀態燈將會變為 `Live`。此時 Win11 桌面端會改為向雲端 Worker 讀取所有數據（包括 Linux 與 Win11 的加總）。

---

## 📱 第四階段：設定 Android/iOS 手機 (瀏覽端)
打開你的 **Android 手機** (或 iPhone) 的瀏覽器 (Chrome / Safari)：

1. 在網址列輸入帶有密鑰的網址：
   `https://你的Worker網址/?secret=你的自訂密鑰`
2. **加入主畫面**：
   * **Chrome (Android)**：點擊右上角 `┇` 選單 → 點選 **「加入主畫面」 (Add to Home screen)**。
   * **Safari (iOS)**：點擊分享按鈕 `⎋` → 點選 **「加入主畫面」 (Add to Home Screen)**。
3. **完成！** 手機桌面上會多出一個 Token Monitor 的圖示，點開即可像 App 一樣全螢幕、實時查看所有機器的 Token 使用量！
