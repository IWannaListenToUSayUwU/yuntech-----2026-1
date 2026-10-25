# 2026雲科管理學題庫（上）

班上共用的管理學題庫網站。借放區 wazaaaaaaaa 

- 網頁：GitHub Pages（純靜態，不需要建置）
- 資料庫與登入：Supabase

## 檔案結構

- `index.html`：首頁
- `css/style.css`：樣式
- `js/config.js`：Supabase 連線設定（只放 publishable key）
- `js/supabase.js`：建立 Supabase 連線
- `js/main.js`：載入題庫、切換模式
- `js/data.js`：從 Supabase 讀取單元與題目
- `js/read.js`：閱讀模式
- `js/quiz.js`：測驗模式
- `js/ui.js`：共用的小工具
- `js/upload.js`：上傳模式（安裝書籤的說明）
- `bookmarklet.js`：書籤「📥 上傳到題庫」實際執行的程式，在 eclass 頁面上讀題目並上傳
- `js/parser.js`：開發用，把 TronClass 測驗結果頁複製出來的文字拆成題目
- `supabase/schema.sql`：資料表與權限
- `supabase/002_submit.sql`：上傳入口 `submit_questions()`、資料庫端去重
- `supabase/003_unit1_is_ch2.sql`：一次性修正，最早的「單元一」其實是 CH2
- `supabase/seed_unitN.sql`：手動匯入的題目
- `scripts/make-seed.mjs`：從複製下來的文字產生 `seed_unitN.sql`

## 資料庫

全新的 Supabase 專案依序執行：`schema.sql` → `002_submit.sql` → 需要的話再匯入 `seed_*.sql`。

## 新增題目

- 同學：網站的「上傳」頁安裝書籤，在 eclass 按一下就會自動抓題目上傳
- 開發用：`node scripts/make-seed.mjs <單元編號> <單元名稱> <文字檔>` 產生 SQL（要先執行過 `002_submit.sql`）
