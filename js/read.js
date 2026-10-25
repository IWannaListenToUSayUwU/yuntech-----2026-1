// 閱讀模式：一次列出題目，答案直接標好
import { h, letter, answerText, cardHead, explanation, matches } from "./ui.js";

function readCard(q, number, unitTitle) {
  return h("li", { class: "card" },
    cardHead(q, number, unitTitle),
    h("ul", { class: "options" },
      q.options.map((text, i) =>
        h("li", { class: q.answers.includes(text) ? "option correct" : "option" },
          h("span", { class: "label" }, letter(i)),
          h("span", {}, text)
        )
      )
    ),
    h("p", { class: "answer" }, `正確答案：${answerText(q)}`),
    explanation(q)
  );
}

export function showRead(app, { units, questions, unitTitle }, params) {
  const unitParam = Number(params.get("unit"));
  const unitId = units.some((u) => u.id === unitParam) ? unitParam : null; // null = 全部單元
  const pool = unitId == null ? questions : questions.filter((q) => q.unit_id === unitId);

  const tab = (href, label, current) =>
    h("a", { href, "aria-current": current ? "page" : false }, label);

  const search = h("input", { type: "search", class: "search", placeholder: "搜尋題目或選項…", autocomplete: "off" });
  const summary = h("p", { class: "summary" });
  const list = h("ol", { class: "questions" });
  const empty = h("p", { class: "status" });

  function renderList() {
    const keyword = search.value.trim().toLowerCase();
    const shown = keyword ? pool.filter((q) => matches(q, keyword)) : pool;
    const scope = unitId == null ? "全部單元" : unitTitle.get(unitId);
    summary.textContent = keyword
      ? `${scope}：找到 ${shown.length} 題（共 ${pool.length} 題）`
      : `${scope}：共 ${pool.length} 題`;
    list.replaceChildren(...shown.map((q, i) => readCard(q, i + 1, unitTitle.get(q.unit_id))));
    empty.textContent = shown.length ? "" : keyword ? "找不到符合的題目" : "這個單元還沒有題目";
    empty.hidden = shown.length > 0;
  }
  search.addEventListener("input", renderList);

  app.replaceChildren(
    h("nav", { class: "tabs", "aria-label": "單元" },
      tab("#read", `全部單元（${questions.length}）`, unitId == null),
      units.map((u) => tab(`#read?unit=${u.id}`, `${u.title}（${u.count}）`, u.id === unitId))
    ),
    h("div", { class: "toolbar" }, search),
    summary,
    list,
    empty
  );
  renderList();
}
