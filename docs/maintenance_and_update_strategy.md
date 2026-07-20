# 專案長期維護與分支更新策略

隨著上游專案持續更新，如何在不影響現有監控、又能使用到新功能的情況下進行升級？以下為你整理升級的必要性分析以及維護自訂分支的注意事項。

---

## 🔍 第一部分：我的 Cloudflare、Win11、Linux 需要常常更新嗎？

**結論：不需要。只要目前運作正常，只有在「需要新功能」或「解決特定 Bug」時才需要更新。**

各組件的更新建議與影響如下：

### 1. Cloudflare Worker Hub (更新頻率：極低)
* **核心職責**：儲存裝置上報的數據並提供 API / Web 網頁。
* **更新必要性**：專案開發者在 [AGENTS.md](../AGENTS.md) 中已將 **API 格式與 Wire Protocol 列為嚴格的「相容性表面 (Compatibility surfaces)」**。這表示即便上游更新了桌面端的介面，Hub 收集數據的 API 格式幾乎不會變動。
* **何時才需要更新？**：
  * 當你更新了 Agent，而新版 Agent 需要 Hub 支援新的 API 欄位時。
  * 你想要升級網頁儀表板的 UI 排版或修正網頁 bug 時。

### 2. Linux Agents & Win11 收集端 (更新頻率：中)
* **核心職責**：在你的工作機器上探測 token 檔案，並回報給 Hub。
* **更新必要性**：主要是為了**支援新的 AI 工具**（例如上游新增了對 Cline 或 Zed 新版本的支援，而你剛好有在使用）。
* **何時才需要更新？**：
  * 你開始使用新的 AI 編輯器，而舊版 Token Monitor 無法識別它時。
  * 上游修復了關於探測 WSL 或特定作業系統下的 token 檔案 bug 時。

---

## 🛠️ 第二部分：改用自訂分支後，更新上有什麼要注意？

因為我們新增了 `docs/` 文件，並在 `worker/src/index.js` 加入了 Web Dashboard，若要保持與上游（`origin/main`）同步，請注意以下幾點：

### 1. Git 同步與衝突處理流程
建議將你的倉庫設有兩個遠端（目前已設定）：
* `kurtlin`：你自己的 fork（包含 `feat/mobile-support` 分支）。
* `origin`：上游主倉庫 `Javis603/token-monitor`。

當你想同步上游更新時：
```bash
git checkout feat/mobile-support
git fetch origin                   # 取得上游最新程式碼
git merge origin/main              # 將上游變更合併到你的分支
```
* **注意衝突**：因為我們修改了 `worker/src/index.js`，如果上游也修改了同一個檔案，Git 會提示衝突。你只需要手動保留我們寫好的 `if (url.pathname === '/' || url.pathname === '/index.html')` 這段網頁回傳邏輯即可。

### 2. ⚠️ Cloudflare Worker 程式碼同步的隱藏地雷
在 [AGENTS.md](../AGENTS.md) 中有提到一個重要的架構設計：
> `worker/src/shared/` 中的檔案（例如 `usage.js` 等）是**自動生成**的複製品，目的是讓 Worker 能共用主專案的解析規則。

* **重要守則**：如果你以後想要修改關於 Token 計算、費用估計的邏輯，**千萬不要**直接改 `worker/src/shared/` 底下的檔案。你必須修改主專案根目錄下的 `src/shared/` 檔案，然後在專案根目錄執行：
  ```bash
  npm run sync:worker
  ```
  這會自動將改動同步過去。直接修改 `worker/shared` 會導致 CI 測試失敗，並在下次同步時被覆蓋。
  *(註：我們這次改的是 `worker/src/index.js`，它不屬於 shared 目錄，所以可以放心直接修改。)*

### 3. 部署生效
每當你透過 `git merge` 同步了上游程式碼，或修改了程式碼後，**記得手動重新部署 Worker**，否則雲端運作的依然是舊版代碼：
```bash
cd worker
npx wrangler deploy
```
