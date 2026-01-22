# HanWrite - AI Korean Writing Assistant

這是一個韓文寫作輔助工具，幫助學習者提升韓文寫作能力。

## 重要：首次設定

### 1. 環境變數設定

在專案根目錄建立 `.env.local` 檔案，並設定以下環境變數：

```bash
# OpenAI API Key（用於 Expression Builder 等 AI 功能）
OPENAI_API_KEY=your_openai_api_key_here
```

**取得 OpenAI API Key：**
1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 登入或註冊帳號
3. 前往 [API Keys](https://platform.openai.com/api-keys) 頁面
4. 建立新的 API Key
5. 將 Key 複製到 `.env.local` 檔案中

**注意事項：**
- `.env.local` 檔案已加入 `.gitignore`，不會被提交到版本控制
- 請勿將 API Key 硬編碼在程式碼中
- 在 Vercel 部署時，請在專案設定中新增環境變數

### 2. 下載並安裝 Pretendard 字體

本專案使用 Pretendard 字體，請依照以下步驟設定：

1. 下載 Pretendard 字體：
   - [Pretendard-Regular.woff2](https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2)
   - [Pretendard-Medium.woff2](https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/woff2/Pretendard-Medium.woff2)

2. 將下載的字體檔案放置到 `/public/fonts/` 目錄：
   ```
   /public/fonts/Pretendard-Regular.woff2
   /public/fonts/Pretendard-Medium.woff2
   ```

### 3. Logo 圖片（選用）

如需更換 Logo，請：
1. 從 Figma 設計檔下載 Logo 圖片
2. 將圖片命名為 `logo.png`
3. 放置到 `/public/logo.png`

目前使用 Next.js Image 元件的 placeholder，會顯示替代圖片。

## 開始開發

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000/writings/1](http://localhost:3000/writings/1) with your browser to see the writing editor.

## 專案架構

```
/app
  /writings/[writingId]  - 主要的寫作編輯頁面
  /brainstorm           - 腦力激盪功能（待實作）
  /login                - 登入頁面（待實作）

/components
  /ui
    button.tsx          - 共用按鈕元件（primary/secondary/cancel）
  sidebar.tsx           - 左側導航欄
  editor.tsx            - 中間編輯器
  /tool-panel
    tool-panel.tsx      - 右側工具面板容器
    expression-builder.tsx - Expression Builder 工具

/lib
  types.ts              - TypeScript 型別定義
  /data
    writings.ts         - 假資料服務層（未來會接真實 API）
```

## 技術棧

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + CSS Variables
- **Font**: Pretendard (韓文優化字體)
- **Icons**: Google Material Symbols Rounded

## 設計系統

### 顏色（CSS Variables）

顏色定義在 `app/globals.css` 中：

- 背景：`--color-bg-primary`, `--color-bg-card`, `--color-bg-secondary`
- 文字：`--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
- 按鈕：`--color-primary`(綠), `--color-secondary`(藍), `--color-cancel`(灰)
- 學習元素：`--color-vocab`(黃), `--color-grammar`(藍), `--color-connective`(綠)

### 響應式設計

- **最小寬度**: 1200px
- **< 1440px**: 左右間隔固定 20px
- **≥ 1440px**: 左右間隔動態計算（均分剩餘空間）

## 目前狀態

✅ 已完成：
- CSS Variables 顏色系統
- 資料型別定義
- 假資料服務層
- Button 共用元件
- Sidebar 導航元件
- Editor 編輯器元件
- Tool Panel 工具面板架構
- Expression Builder 功能
- 主頁面佈局與響應式設計

⏳ 待開發：
- 真實 API 整合
- 儲存功能
- 用戶認證
- Brainstorm Lab 功能
- 其他工具面板功能

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
