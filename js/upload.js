// 上傳模式：安裝書籤的說明，以及手動貼上題目
import { supabase } from "./supabase.js";
import { parseQuizText } from "./parser.js";
import { h } from "./ui.js";

const SITE = new URL("./", location.href).href;

// 書籤只負責載入網站上的 bookmarklet.js，之後改程式不用請大家重裝書籤
const BOOKMARKLET =
  "javascript:(function(){var s=document.createElement('script');" +
  `s.src='${SITE}bookmarklet.js?t='+Date.now();document.body.appendChild(s);})();`;

function resultText(r) {
  const parts = [`新題目 ${r.new} 題`, `重複 ${r.duplicate} 題`];
  if (r.invalid) parts.push(`格式不符 ${r.invalid} 題`);
  return parts.join("，");
}

function bookmarkletSection() {
  const link = h("a", { class: "bookmarklet", href: BOOKMARKLET, onclick: (e) => {
    e.preventDefault();
    hint.textContent = "不是用點的喔，要把這個按鈕「拖」到書籤列上。";
  } }, "📥 上傳到題庫");
  const hint = h("p", { class: "warn" });

  return h("section", { class: "panel" },
    h("h2", {}, "用書籤一鍵上傳（推薦）"),
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

function manualSection(data) {
  const unitSelect = h("select", { class: "field" },
    data.units.map((u) => h("option", { value: u.title }, u.title)),
    h("option", { value: "" }, "＋ 新單元…")
  );
  const newUnit = h("input", { class: "field", placeholder: "新單元名稱，例如：單元二", hidden: true, maxlength: 50 });
  const text = h("textarea", {
    class: "field paste",
    placeholder: "在 TronClass 測驗結果頁按 Ctrl+A（Mac 是 ⌘A）全選、複製，貼到這裡",
  });
  const preview = h("button", { type: "button", class: "secondary" }, "預覽");
  const submit = h("button", { type: "button", class: "primary", hidden: true }, "確認上傳");
  const status = h("p", { class: "result", hidden: true });
  let items = [];

  const unitTitle = () => (unitSelect.value || newUnit.value).trim();

  unitSelect.addEventListener("change", () => {
    newUnit.hidden = unitSelect.value !== "";
    reset();
  });
  [newUnit, text].forEach((el) => el.addEventListener("input", reset));

  function reset() {
    submit.hidden = true;
    status.hidden = true;
  }

  function show(msg, isError = false) {
    status.textContent = msg;
    status.classList.toggle("error", isError);
    status.hidden = false;
  }

  preview.addEventListener("click", async () => {
    reset();
    const unit = unitTitle();
    if (!unit) return show("請選擇或輸入單元名稱", true);
    const parsed = parseQuizText(text.value);
    if (!parsed.length) return show("沒有讀到題目。請確認貼的是測驗「結果頁」，而且有看到正確答案。", true);
    items = parsed.map((q) => ({ ...q, unit }));
    preview.disabled = true;
    const { data: r, error } = await supabase.rpc("submit_questions", { p_items: items, p_dry_run: true });
    preview.disabled = false;
    if (error) return show(`檢查失敗：${error.message}`, true);
    show(`讀到 ${parsed.length} 題：${resultText(r)}。` +
      (r.new_units.length ? `會新增單元「${r.new_units.join("、")}」。` : ""));
    submit.hidden = r.new === 0;
  });

  submit.addEventListener("click", async () => {
    submit.disabled = true;
    const { data: r, error } = await supabase.rpc("submit_questions", { p_items: items, p_dry_run: false });
    submit.disabled = false;
    if (error) return show(`上傳失敗：${error.message}`, true);
    submit.hidden = true;
    text.value = "";
    show(`上傳完成！${resultText(r)}。重新整理頁面就能在閱讀模式看到。`);
  });

  return h("section", { class: "panel" },
    h("h2", {}, "手動貼上"),
    h("p", { class: "hint" }, "沒辦法用書籤（例如用手機）的話，也可以一次貼一份測驗。"),
    h("div", { class: "form" },
      h("label", { class: "form-label" }, "單元", unitSelect),
      newUnit,
      text,
      h("div", { class: "actions start" }, preview, submit),
      status
    )
  );
}

export function showUpload(app, data) {
  app.replaceChildren(bookmarkletSection(), manualSection(data));
}
