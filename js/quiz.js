// 測驗模式：選單元、題數 → 隨機出題 → 交卷看分數
import { h, letter, answerText, cardHead, explanation } from "./ui.js";

// 同一次開啟網頁內記住上次的設定，「再測一次」和切回來時沿用
let lastSettings = null;

function sample(items, n) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function showSetup(app, data) {
  const { units, questions } = data;
  const prev = lastSettings ?? { unitIds: units.map((u) => u.id), count: 20 };

  const boxes = units.map((u) =>
    h("input", { type: "checkbox", value: u.id, checked: prev.unitIds.includes(u.id) })
  );
  const countInput = h("input", { type: "number", class: "count", min: 1, value: prev.count, inputmode: "numeric" });
  const available = h("p", { class: "hint" });
  const start = h("button", { type: "button", class: "primary" }, "開始測驗");

  const selectedIds = () => boxes.filter((b) => b.checked).map((b) => Number(b.value));
  const poolSize = () => questions.filter((q) => selectedIds().includes(q.unit_id)).length;

  function update() {
    const n = poolSize();
    countInput.max = n;
    available.textContent = n ? `已選的單元共有 ${n} 題` : "請至少選一個單元";
    start.disabled = n === 0;
  }

  const quick = [10, 20, 50].map((n) =>
    h("button", { type: "button", class: "chip", onclick: () => { countInput.value = n; } }, `${n} 題`)
  );
  quick.push(h("button", { type: "button", class: "chip", onclick: () => { countInput.value = poolSize(); } }, "全部"));

  const toggleAll = h("button", {
    type: "button", class: "link",
    onclick: () => {
      const all = boxes.every((b) => b.checked);
      boxes.forEach((b) => { b.checked = !all; });
      update();
    },
  }, "全選／全不選");

  boxes.forEach((b) => b.addEventListener("change", update));
  start.addEventListener("click", () => {
    const ids = selectedIds();
    const pool = questions.filter((q) => ids.includes(q.unit_id));
    const count = Math.max(1, Math.min(Number(countInput.value) || 1, pool.length));
    lastSettings = { unitIds: ids, count };
    showRun(app, data, sample(pool, count));
  });

  app.replaceChildren(
    h("section", { class: "panel" },
      h("h2", {}, "測驗設定"),
      h("fieldset", {},
        h("legend", {}, "測驗範圍 ", toggleAll),
        units.map((u, i) =>
          h("label", { class: "check" }, boxes[i], `${u.title}（${u.count} 題）`)
        )
      ),
      h("fieldset", {},
        h("legend", {}, "題數"),
        h("div", { class: "count-row" }, countInput, quick),
        available
      ),
      start
    )
  );
  update();
}

function showRun(app, data, picked) {
  const { unitTitle } = data;
  const progress = h("span", {});
  const warn = h("p", { class: "warn", hidden: true });
  const submit = h("button", { type: "button", class: "primary" }, "交卷");
  let confirming = false;

  const cards = picked.map((q, idx) => {
    const multi = q.qtype === "multiple";
    const inputs = q.options.map(() =>
      h("input", { type: multi ? "checkbox" : "radio", name: `q${idx}` })
    );
    const li = h("li", { class: "card" },
      cardHead(q, idx + 1, unitTitle.get(q.unit_id)),
      multi ? h("p", { class: "hint" }, "（可複選）") : null,
      h("ul", { class: "options" },
        q.options.map((text, i) =>
          h("li", {},
            h("label", { class: q.answers.includes(text) ? "option choice correct" : "option choice" },
              inputs[i],
              h("span", { class: "label" }, letter(i)),
              h("span", {}, text)
            )
          )
        )
      ),
      h("p", { class: "answer" }, `正確答案：${answerText(q)}`),
      explanation(q)
    );
    return { q, li, inputs };
  });

  const answeredCount = () => cards.filter((c) => c.inputs.some((i) => i.checked)).length;
  function updateProgress() {
    progress.textContent = `已作答 ${answeredCount()} / ${cards.length} 題`;
    if (confirming) {
      confirming = false;
      submit.textContent = "交卷";
      warn.hidden = true;
    }
  }
  cards.forEach((c) => c.inputs.forEach((i) => i.addEventListener("change", updateProgress)));

  submit.addEventListener("click", () => {
    const left = cards.length - answeredCount();
    if (left > 0 && !confirming) {
      confirming = true;
      warn.textContent = `還有 ${left} 題沒作答，再按一次就交卷。`;
      warn.hidden = false;
      submit.textContent = "確定交卷";
      return;
    }
    showResult(app, data, cards);
  });

  app.replaceChildren(
    h("div", { class: "quiz-top" },
      h("button", { type: "button", class: "link", onclick: () => showSetup(app, data) }, "← 回到設定"),
      progress
    ),
    h("ol", { class: "questions" }, cards.map((c) => c.li)),
    h("div", { class: "submit-bar" }, warn, submit)
  );
  updateProgress();
  window.scrollTo(0, 0);
}

function showResult(app, data, cards) {
  let right = 0;
  for (const c of cards) {
    const chosen = c.q.options.filter((_, i) => c.inputs[i].checked);
    const ok = chosen.length === c.q.answers.length && chosen.every((t) => c.q.answers.includes(t));
    if (ok) right++;
    c.li.classList.add("revealed", ok ? "right" : "wrong");
    c.inputs.forEach((input) => {
      input.disabled = true;
      if (input.checked) input.closest(".option").classList.add(ok ? "picked-right" : "picked-wrong");
    });
  }

  const total = cards.length;
  const onlyWrong = h("input", { type: "checkbox" });
  onlyWrong.addEventListener("change", () => {
    cards.forEach((c) => { c.li.hidden = onlyWrong.checked && c.li.classList.contains("right"); });
  });

  app.replaceChildren(
    h("section", { class: "panel score" },
      h("p", { class: "score-num" }, `${right} / ${total}`),
      h("p", {}, `答對 ${Math.round((right / total) * 100)}%，錯 ${total - right} 題`),
      h("div", { class: "actions" },
        h("button", { type: "button", class: "primary", onclick: () => {
          const pool = data.questions.filter((q) => lastSettings.unitIds.includes(q.unit_id));
          showRun(app, data, sample(pool, lastSettings.count));
        } }, "再測一次"),
        h("button", { type: "button", class: "secondary", onclick: () => showSetup(app, data) }, "改設定")
      ),
      h("label", { class: "check" }, onlyWrong, "只看錯的題目")
    ),
    h("ol", { class: "questions" }, cards.map((c) => c.li))
  );
  window.scrollTo(0, 0);
}

export function showQuiz(app, data) {
  showSetup(app, data);
}
