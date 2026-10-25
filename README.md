# 2026雲科管理學題庫（上）

班上共用的管理學題庫網站。借放區 wazaaaaaaaa 集結力量 解決骯髒出題人。

- 網頁：GitHub Pages（純靜態，不需要建置）
- 資料庫與登入：Supabase

## 檔案結構

- `index.html`：首頁
- `css/style.css`：樣式
- `js/config.js`：Supabase 連線設定（只放 publishable key）
- `js/supabase.js`：建立 Supabase 連線
- `js/main.js`：題目顯示頁
- `js/parser.js`：把 TronClass 測驗結果頁複製出來的文字拆成題目，並計算去重用的 fingerprint
- `supabase/schema.sql`：資料表與權限，貼到 Supabase 的 SQL Editor 執行
- `supabase/seed_unitN.sql`：各單元的題目
- `scripts/make-seed.mjs`：從複製下來的文字產生 `seed_unitN.sql`

## 新增一個單元的題目（目前的做法）

1. 把 TronClass 測驗結果頁全選複製，存成文字檔（不要放進這個專案，裡面有個人作答紀錄）
2. `node scripts/make-seed.mjs 2 "單元二" 文字檔路徑 > supabase/seed_unit2.sql`
3. 把產生的 SQL 貼到 Supabase 的 SQL Editor 執行。重複的題目會自動略過

## 本機預覽

ES module 不能直接用 `file://` 開，要開一個本機伺服器：

```
python3 -m http.server 8000
```

然後打開 http://localhost:8000
