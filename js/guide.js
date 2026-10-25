// 上傳頁的圖解：用內嵌 SVG 畫簡化的 Chrome 視窗，顏色跟著網站的深淺色主題

const CURSOR = (x, y) =>
  `<path class="cursor" transform="translate(${x} ${y})" d="M0 0v20l5-5 4 9 4-2-4-9h7z"/>`;

const KEY = (x, label, w = 34) =>
  `<rect class="key" x="${x}" y="0" width="${w}" height="30" rx="6"/>` +
  `<text class="key-t" x="${x + w / 2}" y="20" text-anchor="middle">${label}</text>`;

// 視窗外框：分頁、網址列、書籤列；bar 是書籤列裡要畫的東西
function chromeWindow({ url, tab, bar = "", body = "", barHighlight = false }) {
  return `
    <rect class="frame" x="1" y="1" width="598" height="278" rx="12"/>
    <path class="chrome" d="M1 13a12 12 0 0 1 12-12h574a12 12 0 0 1 12 12v117H1z"/>
    <circle class="dot" cx="20" cy="22" r="5"/><circle class="dot" cx="38" cy="22" r="5"/><circle class="dot" cx="56" cy="22" r="5"/>
    <rect class="tab" x="76" y="9" width="180" height="35" rx="8"/>
    <text class="t" x="92" y="31">${tab}</text>
    <rect class="tab" x="16" y="52" width="568" height="30" rx="15"/>
    <text class="t muted" x="34" y="72">${url}</text>
    ${barHighlight
      ? `<rect class="hl" x="8" y="90" width="584" height="34" rx="8"/>`
      : `<line class="sep" x1="1" y1="129" x2="599" y2="129"/>`}
    ${bar}
    ${body}`;
}

const CONTENT_LINES = `
  <rect class="line" x="40" y="160" width="300" height="10" rx="5"/>
  <rect class="line" x="40" y="182" width="420" height="10" rx="5"/>
  <rect class="line" x="40" y="204" width="360" height="10" rx="5"/>
  <rect class="line" x="40" y="226" width="240" height="10" rx="5"/>`;

const BOOKMARK = (cls) =>
  `<rect class="${cls}" x="20" y="96" width="132" height="24" rx="12"/>` +
  `<text class="t ${cls}-t" x="86" y="113" text-anchor="middle">📥 上傳到題庫</text>`;

export const ILLUSTRATIONS = {
  openBar: `
    <svg viewBox="0 0 600 340" role="img" aria-label="按 Command 或 Ctrl 加 Shift 加 B，網址列下方會出現書籤列">
      ${chromeWindow({
        url: "iwannalistentousayuwu.github.io/…",
        tab: "2026雲科管理學題庫",
        barHighlight: true,
        bar: `<text class="t accent" x="24" y="112">書籤列會出現在這裡（網址列正下方）</text>`,
        body: CONTENT_LINES,
      })}
      <g transform="translate(150 300)">
        ${KEY(0, "⌘")}<text class="t muted" x="42" y="20">+</text>
        ${KEY(54, "Shift", 56)}<text class="t muted" x="118" y="20">+</text>
        ${KEY(130, "B")}
        <text class="t muted" x="182" y="20">Windows：Ctrl + Shift + B</text>
      </g>
    </svg>`,

  drag: `
    <svg viewBox="0 0 600 300" role="img" aria-label="按住網頁上的藍色按鈕，拖到上方的書籤列再放開">
      ${chromeWindow({
        url: "iwannalistentousayuwu.github.io/…/#upload",
        tab: "2026雲科管理學題庫",
        bar: BOOKMARK("ghost"),
        body: `
          <rect class="line" x="40" y="160" width="260" height="10" rx="5"/>
          <rect class="btn" x="220" y="200" width="160" height="40" rx="10"/>
          <text class="btn-t" x="300" y="226" text-anchor="middle">📥 上傳到題庫</text>
          <path class="arrow" d="M290 196C270 150 200 130 160 118"/>
          <path class="arrow-head" d="M152 115l16-6-6 15z"/>
          ${CURSOR(362, 222)}
          <text class="t accent" x="400" y="226">按住，往上拖</text>`,
      })}
    </svg>`,

  click: `
    <svg viewBox="0 0 600 300" role="img" aria-label="在 eclass 頁面按書籤列上的上傳到題庫，右上角會出現面板">
      ${chromeWindow({
        url: "eclass.yuntech.edu.tw/…",
        tab: "eclass（任何一頁）",
        bar: BOOKMARK("mark") + CURSOR(140, 110),
        body: `
          ${CONTENT_LINES}
          <rect class="panel-r" x="372" y="142" width="212" height="124" rx="10"/>
          <text class="t" x="388" y="166" font-weight="600">📥 上傳到題庫</text>
          <text class="t ok" x="388" y="190">CH1：讀到 20 題</text>
          <text class="t ok" x="388" y="210">CH2：讀到 20 題</text>
          <rect class="btn" x="388" y="224" width="180" height="30" rx="8"/>
          <text class="btn-t" x="478" y="244" text-anchor="middle">上傳新題目</text>`,
      })}
    </svg>`,
};
