# English

## What's changed

<!-- app-update-notes:en:start -->
### Added
- **Zed dashboard limits:** Adds Token Spend and Edit Predictions limits using a manually supplied dashboard cookie. (#580)
- **Daily model export:** Adds a daily per-model CSV export with token components and estimated cost to both manual and automatic exports. (#573)
- **Codex additional quotas:** Adds a setting to hide separately metered additional quotas while keeping the main Codex limit visible. (#577)
- **Taskbar/Dock icon:** Adds an option in Settings → Display to hide the Windows taskbar or macOS Dock icon while keeping the desktop widget visible. The option appears when the tray icon is enabled. (#587)
- **Model ranking:** Adds token- or cost-based ranking to the Models breakdown. (#585)

### Improved
- **First-run AI Limits:** Selects providers from detected tools on new installations, with Codex as the fallback when no supported tools are detected. (#566)
- **Hub settings:** Improves Save-state handling so the button is enabled only when connection settings change, while preventing duplicate submissions. (#445)
<!-- app-update-notes:en:end -->

## Download

- **macOS Apple Silicon** — [Token-Monitor-0.52.0-arm64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-arm64.dmg)
- **macOS Intel** — [Token-Monitor-0.52.0-x64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-x64.dmg)
- **Windows Installer** — [Token-Monitor-Setup-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-Setup-0.52.0.exe) (recommended)
- **Windows Portable** — [Token-Monitor-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.exe) (no install required)
- **Linux x64** — [Token-Monitor-0.52.0.AppImage](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.AppImage)

<details>
<summary><strong>First launch and other notes</strong></summary>

### First launch

**macOS:** the app is Developer ID-signed and notarized by Apple. Open the `.dmg`, then drag Token Monitor to Applications.

**Windows:** both executables are signed ([how to verify](https://github.com/Javis603/token-monitor/blob/main/docs/code-signing.md#verify-a-download)).

**Linux:** mark the AppImage executable, then run it:

```bash
chmod +x "Token Monitor"*.AppImage
./"Token Monitor"*.AppImage
```

### Other notes

Other platforms are not pre-built — run from source per the [README](https://github.com/Javis603/token-monitor#readme). The macOS `.zip` is the same app repackaged; ignore it unless you specifically need it.

### tokscale dependency

Tokscale is bundled with this app. See **Settings → Tokscale** for the exact version
and the option to download a newer version directly from npm. Tokscale is MIT,
open-source: https://github.com/junhoyeo/tokscale

</details>

---

# 中文

## 更新内容

<!-- app-update-notes:zh:start -->
### 新增
- **Zed 控制台额度：** 支持使用手动提供的控制台 Cookie 查看 Token Spend 和 Edit Predictions 额度。（#580）
- **每日模型导出：** 手动和自动导出均新增一份每日模型 CSV，包含 Token 组成和预估成本。（#573）
- **Codex 额外额度：** 新增隐藏单独计量额度的设置，同时保留 Codex 主额度。（#577）
- **任务栏／Dock 图标：** 可在“设置 → 显示”中隐藏 Windows 任务栏或 macOS Dock 图标，同时保留桌面小组件。启用托盘图标后才会显示此选项。（#587）
- **模型排序：** 支持在“模型”明细中按 Tokens 或成本排序。（#585）

### 改进
- **AI 工具额度初始设置：** 新安装会根据检测到的工具预选额度提供方；未检测到支持的工具时默认选择 Codex。（#566）
- **Hub 设置：** 改进“保存”按钮的状态判断，仅在连接设置发生变化时启用，并避免重复提交。（#445）
<!-- app-update-notes:zh:end -->

## 下载

- **macOS Apple Silicon** — [Token-Monitor-0.52.0-arm64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-arm64.dmg)
- **macOS Intel** — [Token-Monitor-0.52.0-x64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-x64.dmg)
- **Windows 安装版** — [Token-Monitor-Setup-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-Setup-0.52.0.exe)（推荐）
- **Windows 便携版** — [Token-Monitor-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.exe)（免安装）
- **Linux x64** — [Token-Monitor-0.52.0.AppImage](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.AppImage)

<details>
<summary><strong>首次启动与其他说明</strong></summary>

### 首次启动

**macOS：** 应用已使用 Developer ID 签名并通过 Apple 公证。打开 `.dmg`，然后把 Token Monitor 拖到 Applications。

**Windows：** 两个可执行文件均已签名（[查看验证方法](https://github.com/Javis603/token-monitor/blob/main/docs/code-signing.md#verify-a-download)）。

**Linux：** 先给 AppImage 执行权限，然后运行：

```bash
chmod +x "Token Monitor"*.AppImage
./"Token Monitor"*.AppImage
```

### 其他说明

其他平台暂不提供预构建版本，请参考 [README](https://github.com/Javis603/token-monitor#readme) 从源码运行。macOS 的 `.zip` 只是同一个 app 的重新打包版本，除非你明确需要，否则可以忽略。

### tokscale 依赖

Tokscale 已随应用内置。你可以在 **设置 → Tokscale** 查看确切版本，
也可以直接从 npm 下载更新版本。Tokscale 是 MIT 开源项目：
https://github.com/junhoyeo/tokscale

</details>

---

<details>
<summary><strong>Full Changelog:</strong> <a href="https://github.com/Javis603/token-monitor/compare/v0.51.0...v0.52.0">v0.51.0...v0.52.0</a></summary>

<!-- github-generated-release-notes -->

</details>

<details>
<summary>繁體中文 · 한국어 · 日本語</summary>

<details>
<summary><strong>繁體中文</strong></summary>

## 繁體中文

## 更新內容

<!-- app-update-notes:zh-TW:start -->
### 新增
- **Zed 控制台額度：** 支援使用手動提供的控制台 Cookie 查看 Token Spend 與 Edit Predictions 額度。（#580）
- **每日模型匯出：** 手動和自動匯出均新增一份每日模型 CSV，包含 Token 組成及預估成本。（#573）
- **Codex 額外額度：** 新增隱藏獨立計量額度的設定，同時保留 Codex 主要額度。（#577）
- **工作列／Dock 圖示：** 可在「設定 → 顯示」中隱藏 Windows 工作列或 macOS Dock 圖示，同時保留桌面小工具。啟用系統匣圖示後才會顯示此選項。（#587）
- **模型排序：** 支援在「模型」明細中按 Tokens 或成本排序。（#585）

### 改進
- **AI 工具額度初始設定：** 新安裝會根據偵測到的工具預選額度提供者；未偵測到支援的工具時預設選擇 Codex。（#566）
- **Hub 設定：** 改進「儲存」按鈕的狀態判斷，僅在連線設定變更時啟用，並避免重複提交。（#445）
<!-- app-update-notes:zh-TW:end -->

## 下載

- **macOS Apple Silicon** — [Token-Monitor-0.52.0-arm64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-arm64.dmg)
- **macOS Intel** — [Token-Monitor-0.52.0-x64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-x64.dmg)
- **Windows 安裝版** — [Token-Monitor-Setup-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-Setup-0.52.0.exe)（推薦）
- **Windows 便攜版** — [Token-Monitor-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.exe)（免安裝）
- **Linux x64** — [Token-Monitor-0.52.0.AppImage](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.AppImage)

</details>

<details>
<summary><strong>한국어</strong></summary>

## 한국어

## 업데이트 내용

<!-- app-update-notes:ko:start -->
### 추가
- **Zed 대시보드 한도:** 수동으로 입력한 대시보드 Cookie로 Token Spend와 Edit Predictions 한도를 확인할 수 있습니다. (#580)
- **일별 모델 내보내기:** 수동 및 자동 내보내기에 토큰 구성과 예상 비용을 담은 일별 모델 CSV를 추가했습니다. (#573)
- **Codex 추가 할당량:** Codex 기본 한도는 유지하면서 별도로 측정되는 추가 할당량을 숨기는 설정을 추가했습니다. (#577)
- **작업 표시줄/Dock 아이콘:** 설정 → 디스플레이에서 Windows 작업 표시줄 또는 macOS Dock 아이콘을 숨겨도 데스크톱 위젯은 계속 표시됩니다. 트레이 아이콘을 켜면 이 옵션이 나타납니다. (#587)
- **모델 정렬:** 모델 상세 내역을 토큰 또는 비용 기준으로 정렬할 수 있습니다. (#585)

### 개선
- **AI 도구 한도 첫 설정:** 새로 설치하면 감지된 도구에 맞춰 한도 제공자를 선택하며, 지원되는 도구가 감지되지 않으면 Codex를 사용합니다. (#566)
- **Hub 설정:** 연결 설정이 바뀐 경우에만 저장 버튼을 활성화하도록 상태 처리를 개선하고 중복 제출을 방지합니다. (#445)
<!-- app-update-notes:ko:end -->

## 다운로드

- **macOS Apple Silicon** — [Token-Monitor-0.52.0-arm64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-arm64.dmg)
- **macOS Intel** — [Token-Monitor-0.52.0-x64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-x64.dmg)
- **Windows 설치 버전** — [Token-Monitor-Setup-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-Setup-0.52.0.exe) (권장)
- **Windows 포터블 버전** — [Token-Monitor-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.exe) (설치 필요 없음)
- **Linux x64** — [Token-Monitor-0.52.0.AppImage](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.AppImage)

</details>

<details>
<summary><strong>日本語</strong></summary>

## 日本語

## 更新内容

<!-- app-update-notes:ja:start -->
### 追加
- **Zedダッシュボードの上限：** 手動で入力したダッシュボードのCookieから、Token SpendとEdit Predictionsの上限を確認できます。（#580）
- **日別モデルエクスポート：** 手動および自動エクスポートに、トークン内訳と推定コストを含む日別モデルCSVを追加しました。（#573）
- **Codexの追加割り当て：** Codexのメイン上限を残したまま、個別に計測される追加割り当てを非表示にする設定を追加しました。（#577）
- **タスクバー／Dockアイコン：** 「設定 → 表示」でWindowsのタスクバーまたはmacOSのDockアイコンを非表示にしても、デスクトップウィジェットは表示されたままです。トレイアイコンを有効にすると、この項目が表示されます。（#587）
- **モデルの並び順：** モデルの内訳をトークンまたはコスト順に並べられます。（#585）

### 改善
- **AIツール制限の初期設定：** 新規インストールでは検出したツールに合わせてプロバイダーを選択し、対応ツールが検出されない場合はCodexを使用します。（#566）
- **Hub設定：** 接続設定が変わった場合だけ保存ボタンが有効になるよう状態処理を改善し、重複送信を防ぎます。（#445）
<!-- app-update-notes:ja:end -->

## ダウンロード

- **macOS Apple Silicon** — [Token-Monitor-0.52.0-arm64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-arm64.dmg)
- **macOS Intel** — [Token-Monitor-0.52.0-x64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0-x64.dmg)
- **Windows インストーラー** — [Token-Monitor-Setup-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-Setup-0.52.0.exe)（推奨）
- **Windows ポータブル版** — [Token-Monitor-0.52.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.exe)（インストール不要）
- **Linux x64** — [Token-Monitor-0.52.0.AppImage](https://github.com/Javis603/token-monitor/releases/download/v0.52.0/Token-Monitor-0.52.0.AppImage)

</details>

</details>
