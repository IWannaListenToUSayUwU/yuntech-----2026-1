// 閱讀模式和測驗模式共用的小工具

export const TYPE_LABEL = { single: "單選題", multiple: "多選題", truefalse: "是非題" };

export const letter = (i) => String.fromCharCode(65 + i);

export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  node.append(...children.flat().filter((c) => c != null && c !== false));
  return node;
}

export function answerText(q) {
  const letters = q.answers.map((a) => q.options.indexOf(a)).filter((i) => i >= 0).map(letter);
  return letters.length ? letters.join("、") : q.answers.join("、");
}

// 題目卡片的上半部：題號、題目，必要時加上單元和題型
// unitTitle 傳 null 表示不用顯示（例如只看單一單元時）；單選題是預設，不另外標
export function cardHead(q, number, unitTitle) {
  const tags = [unitTitle, q.qtype === "single" ? null : TYPE_LABEL[q.qtype] ?? q.qtype].filter(Boolean);
  return h("div", { class: "card-head" },
    h("span", { class: "num" }, number),
    h("div", {},
      tags.length ? h("div", { class: "meta" }, tags.join(" · ")) : null,
      h("p", { class: "stem" }, q.stem)
    )
  );
}

export function explanation(q) {
  return q.explanation ? h("p", { class: "explanation" }, `解釋：${q.explanation}`) : null;
}

export function matches(q, keyword) {
  return [q.stem, ...q.options].some((s) => s.toLowerCase().includes(keyword));
}
