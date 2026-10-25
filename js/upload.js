// 上傳模式：安裝書籤的說明。題目一律由書籤從 eclass 自動抓取
import { h } from "./ui.js";

const SITE = new URL("./", location.href).href;

// 書籤只負責載入網站上的 bookmarklet.js，之後改程式不用請大家重裝書籤
const BOOKMARKLET =
  "javascript:(function(){var s=document.createElement('script');" +
  `s.src='${SITE}bookmarklet.js?t='+Date.now();document.body.appendChild(s);})();`;

function bookmarkletSection() {
  const link = h("a", { class: "bookmarklet", href: BOOKMARKLET, onclick: (e) => {
    e.preventDefault();
    hint.textContent = "不是用點的喔，要把這個按鈕「拖」到書籤列上。";
  } }, "📥 上傳到題庫");
  const hint = h("p", { class: "warn" });

  return h("section", { class: "panel" },
    h("h2", {}, "用書籤一鍵上傳"),
    h("ol", { class: "steps" },
      h("li", {}, "用電腦版 Chrome 或 Edge 開這個網頁。如果沒看到書籤列，按 ",
        h("kbd", {}, "Ctrl"), "+", h("kbd", {}, "Shift"), "+", h("kbd", {}, "B"),
        "（Mac 是 ", h("kbd", {}, "⌘"), "+", h("kbd", {}, "Shift"), "+", h("kbd", {}, "B"), "）打開。"),
      h("li", {}, "把下面這個按鈕", h("strong", {}, "拖曳"), "到書籤列：",
        h("div", { class: "bookmarklet-row" }, link), hint),
      h("li", {}, "登入 eclass，停在任何一頁都可以，按一下書籤列上的「📥 上傳到題庫」。"),
      h("li", {}, "它會自己找到管理學所有已經交卷的測驗，讀出題目和答案，先給你看會新增幾題，按確認才會上傳。")
    ),
    h("p", { class: "hint" },
      "只會讀題目、選項和正確答案，不會讀你的作答、分數或個人資料，也不會幫你作答或交卷。手機不支援書籤，請用電腦。")
  );
}

export function showUpload(app) {
  app.replaceChildren(bookmarkletSection());
}
