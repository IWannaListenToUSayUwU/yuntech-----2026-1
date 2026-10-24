# 2026雲科管理學題庫（上）

班上共用的管理學題庫網站。借放區 wazaaaaaaaa 

- 網頁：GitHub Pages（純靜態，不需要建置）
- 資料庫與登入：Supabase

## 檔案結構

- `index.html`：首頁
- `css/style.css`：樣式
- `js/config.js`：Supabase 連線設定（只放 publishable key）
- `js/supabase.js`：建立 Supabase 連線
- `js/main.js`：首頁程式

## 本機預覽

ES module 不能直接用 `file://` 開，要開一個本機伺服器：

```
python3 -m http.server 8000
```

然後打開 http://localhost:8000
