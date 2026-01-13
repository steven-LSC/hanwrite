# 實作完成筆記

## ✅ 已完成的所有工作

### 1. 基礎設定

#### CSS Variables 與全域樣式 (`app/globals.css`)
- ✅ 定義所有顏色變數（背景、文字、邊框、按鈕、學習元素）
- ✅ 設定 Pretendard 字體的 @font-face
- ✅ 全域使用 Pretendard 字體
- ✅ 載入 Google Material Symbols Rounded

#### 資料型別 (`lib/types.ts`)
- ✅ `Writing` - 文章資料結構
- ✅ `RecentWriting` - 最近文章列表項目
- ✅ `ExpressionBuilderResult` - Expression Builder 分析結果（4種類型：vocab, grammar, connective, example）

#### 假資料服務層 (`lib/data/writings.ts`)
- ✅ `getWriting(id)` - 取得文章內容
- ✅ `getRecentWritings()` - 取得最近文章列表
- ✅ `getExpressionBuilderResults(inputText)` - 取得 Expression Builder 分析結果
- ✅ 所有 function 都是 async，模擬 API 延遲
- ✅ 使用設計稿中的真實韓文內容作為假資料

### 2. 共用元件

#### Button 元件 (`components/ui/button.tsx`)
- ✅ 三個變體：primary (綠)、secondary (藍)、cancel (灰)
- ✅ 支援 icon + 文字、只有 icon、只有文字
- ✅ Icon 使用 Material Symbols Rounded，固定 20x20
- ✅ 所有按鈕都有 hover 效果（transition-colors duration-200）
- ✅ onClick 目前可選填（未來再實作真實行為）

### 3. 主要元件

#### Sidebar (`components/sidebar.tsx`)
- ✅ Logo 區域（固定，不滾動）- 使用 Next.js Image 元件
- ✅ 主要導航（固定，不滾動）：New Writing、Brainstorm Lab
- ✅ Recents 列表（可滾動）- 使用 flexbox `flex-1 overflow-y-auto`
- ✅ 選中狀態：背景色 bg-slate-100
- ✅ 所有導航項目都有 hover 效果
- ✅ 長文章標題會自動截斷（text-ellipsis）

#### Editor (`components/editor.tsx`)
- ✅ 頂部欄：標題 input + Focus 按鈕（variant: cancel）
- ✅ 內容區：textarea，line-height 1.8，可滾動
- ✅ 底部欄：即時字數統計 + Save 按鈕（variant: primary）
- ✅ 字數從 `content.length` 即時計算
- ✅ 支援 initialTitle、initialContent、onSave props

#### Tool Panel 架構

**ToolPanel 容器** (`components/tool-panel/tool-panel.tsx`)
- ✅ 固定寬度 498px，固定高度 100vh
- ✅ 白色背景，邊框
- ✅ 接收 `currentTool` prop（目前只有 'expression-builder'，未來可擴充）
- ✅ 提供統一的容器結構

**Expression Builder** (`components/tool-panel/expression-builder.tsx`)
- ✅ 頂部工具欄（固定）：Expression Builder 標籤 + 收合按鈕
- ✅ 輸入區（固定高度 154px）：textarea + Analyze 按鈕
- ✅ 結果顯示區（可滾動）：根據 `ExpressionBuilderResult[]` 順序渲染
- ✅ 四種結果卡片：
  - Vocabulary：黃色圓點，單字列表（vocab → translate）
  - Grammar：藍色圓點，文法模式 + 說明
  - Connective：綠色圓點，連接詞列表
  - Example：黃+藍圓點，例句
- ✅ 支援異步分析（loading 狀態）

### 4. 主頁面

#### writings/[writingId]/page.tsx
- ✅ 三欄佈局：Sidebar (192px) + Editor (670px) + ToolPanel (498px)
- ✅ 固定高度 `h-screen`
- ✅ 最小寬度 1200px（更小會出現水平滾動）
- ✅ 響應式間隔：
  - `< 1440px`：固定 20px
  - `≥ 1440px`：動態計算 `calc((100vw - 192px - 670px - 498px) / 2)`
- ✅ 使用 Tailwind 的任意值 `min-[1440px]:` 實作自定義 breakpoint
- ✅ 載入文章資料（async）
- ✅ Loading 和 Error 狀態處理

### 5. 樣式系統

#### 顏色系統
- ✅ 所有顏色使用 CSS Variables（`var(--color-*)`）
- ✅ 方便後續調整，一處修改全域生效

#### 間距系統
- ✅ 不使用 CSS Variables
- ✅ 每次根據設計直接用 Tailwind spacing（如 `gap-5`, `p-[20px]`）

#### Hover 效果
- ✅ 所有互動元素都有 hover 效果
- ✅ 統一使用 `transition-colors duration-200`

## 🚨 使用者需要完成的事項

### 必要操作

1. **下載並安裝 Pretendard 字體**
   
   請下載以下兩個字體檔案並放置到 `/public/fonts/` 目錄：
   
   - [Pretendard-Regular.woff2](https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2)
   - [Pretendard-Medium.woff2](https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/woff2/Pretendard-Medium.woff2)

   **放置位置：**
   ```
   /public/fonts/Pretendard-Regular.woff2
   /public/fonts/Pretendard-Medium.woff2
   ```

2. **Logo 圖片（選用）**
   
   從 Figma 下載 Logo（image 38），並存為 `/public/logo.png`。
   
   目前 Sidebar 使用 Next.js Image 元件，如果找不到圖片會顯示 placeholder。

### 啟動專案

```bash
npm run dev
```

訪問：http://localhost:3000/writings/1

## 📝 技術決策說明

### 為什麼用 CSS Variables 而不是 Tailwind Config？

- CSS Variables 可以在運行時修改（未來可能需要主題切換）
- 更容易在 DevTools 中調試和預覽
- 對於顏色來說，CSS Variables 提供更好的可維護性

### 為什麼間距不用 CSS Variables？

- 間距根據每個元件的具體情況設定，沒有固定模式
- Tailwind 的 spacing scale 已經足夠使用
- 避免過度抽象，保持程式碼簡潔

### 為什麼使用 `min-[1440px]:` 而不是自定義 breakpoint？

- Tailwind v4 使用新的配置方式（在 CSS 中）
- 使用任意值語法 `min-[1440px]:` 更簡單直觀
- 避免修改全域配置，只在需要的地方使用

### 為什麼 Button 元件這麼簡單？

- 遵循 YAGNI 原則（You Aren't Gonna Need It）
- 目前的需求只需要 3 種變體
- 未來如果需要更多變化，可以再擴充

## 🎨 設計還原度

所有元件都嚴格按照 Figma 設計稿實作：

- ✅ 顏色完全一致（使用 Figma 提供的色碼）
- ✅ 間距完全一致（20px, 40px, 5px, 10px）
- ✅ 圓角完全一致（主要卡片 10px，按鈕 5px）
- ✅ 字體大小完全一致（14px, 16px, 20px）
- ✅ 佈局結構完全一致（三欄固定寬度）
- ✅ Icon 使用 Material Symbols Rounded（20x20）

## 🚀 下一步

所有計劃中的項目都已完成！現在可以：

1. 安裝 Pretendard 字體
2. 下載 Logo 圖片（選用）
3. 啟動開發伺服器測試
4. 根據實際使用調整樣式細節

如有任何問題或需要調整，隨時告知！
