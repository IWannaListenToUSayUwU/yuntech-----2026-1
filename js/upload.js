// 上傳模式：安裝書籤的圖解說明。題目一律由書籤從 eclass 自動抓取
import { h } from "./ui.js";
import { ILLUSTRATIONS } from "./guide.js";

const SITE = new URL("./", location.href).href;

// 書籤只負責載入網站上的 bookmarklet.js，之後改程式不用請大家重裝書籤
const BOOKMARKLET =
  "javascript:(function(){var s=document.createElement('script');" +
  `s.src='${SITE}bookmarklet.js?t='+Date.now();document.body.appendChild(s);})();`;

function figure(svg) {
  const fig = h("figure", { class: "illustration" });
  fig.innerHTML = svg;
  return fig;
}

function step(no, title, ...body) {
  return h("li", { class: "step" },
    h("div", { class: "step-head" }, h("span", { class: "num" }, no), h("h3", {}, title)),
    ...body
  );
}

function keys(...names) {
  return names.flatMap((k, i) => (i ? ["+", h("kbd", {}, k)] : [h("kbd", {}, k)]));
}

function copyButton(text, label) {
  const btn = h("button", { type: "button", class: "secondary small" }, label);
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "已複製 ✓";
    } catch {
      btn.textContent = "複製失敗，請手動選取";
    }
    setTimeout(() => { btn.textContent = label; }, 2000);
  });
  return btn;
}

function fallback() {
  return h("details", { class: "fallback" },
    h("summary", {}, "拖不上去？改用手動新增書籤"),
    h("ol", { class: "steps-plain" },
      h("li", {}, "在書籤列的空白處按", h("strong", {}, "右鍵"), "，選「新增網頁…」（Edge 是「新增網頁」或「新增我的最愛」）。"),
      h("li", {}, "名稱填：", h("code", {}, "📥 上傳到題庫"), " ", copyButton("📥 上傳到題庫", "複製名稱")),
      h("li", {}, "網址（URL）貼上這段：", " ", copyButton(BOOKMARKLET, "複製網址"),
        h("pre", { class: "code" }, BOOKMARKLET)),
      h("li", {}, "按「儲存」。")
    )
  );
}

function guide() {
  const link = h("a", { class: "bookmarklet", href: BOOKMARKLET, draggable: "true", onclick: (e) => {
    e.preventDefault();
    hint.textContent = "不是用點的喔！要按住這個按鈕，「拖」到上面的書籤列再放開。";
    hint.hidden = false;
  } }, "📥 上傳到題庫");
  const hint = h("p", { class: "warn", hidden: true });

  return h("section", { class: "panel" },
    h("h2", {}, "用書籤一鍵上傳"),
    h("p", { class: "hint lead" },
      "只要設定一次。之後每次交完 eclass 的測驗，按一下書籤就能把題目分享到題庫。請用", h("strong", {}, "電腦版 Chrome 或 Edge"), "，手機不支援。"),
    h("ol", { class: "step-list" },
      step(1, "打開書籤列",
        h("p", {}, "書籤列是瀏覽器", h("strong", {}, "網址列正下方"), "那一條。沒看到的話，按 ",
          ...keys("⌘", "Shift", "B"), "（Windows 是 ", ...keys("Ctrl", "Shift", "B"), "）。已經有就跳過這步。"),
        figure(ILLUSTRATIONS.openBar)
      ),
      step(2, "把按鈕拖到書籤列",
        h("p", {}, "用滑鼠", h("strong", {}, "按住"), "下面的藍色按鈕不放，拖到書籤列上再放開。"),
        h("div", { class: "bookmarklet-row" }, link),
        hint,
        figure(ILLUSTRATIONS.drag),
        fallback()
      ),
      step(3, "到 eclass 按一下書籤",
        h("p", {}, "登入 eclass，", h("strong", {}, "停在任何一頁都可以"),
          "，按書籤列上的「📥 上傳到題庫」。右上角會出現面板，自動讀出管理學所有已交卷測驗的題目，先給你看會新增幾題，按確認才會上傳。"),
        figure(ILLUSTRATIONS.click)
      )
    ),
    h("p", { class: "hint" },
      "只會讀題目、選項和正確答案，不會讀你的作答、分數或個人資料，也不會幫你作答或交卷。")
  );
}

export function showUpload(app) {
  app.replaceChildren(guide());
}
