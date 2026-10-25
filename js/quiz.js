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
  const countInput = h("input", {
    type: "number", class: "count", min: 1, value: prev.count, inputmode: "numeric", "aria-label": "自訂題數",
  });
  const available = h("p", { class: "hint" });
  const start = h("button", { type: "button", class: "primary wide" }, "開始測驗");

  const selectedIds = () => boxes.filter((b) => b.checked).map((b) => Number(b.value));
  const poolSize = () => questions.filter((q) => selectedIds().includes(q.unit_id)).length;

  const presets = [10, 20, 50, "all"];
  const presetButtons = presets.map((p) =>
    h("button", {
      type: "button", class: "chip",
      onclick: () => { countInput.value = p === "all" ? poolSize() : p; update(); },
    }, p === "all" ? "全部" : `${p} 題`)
  );

  function update() {
    const n = poolSize();
    countInput.max = n;
    const value = Number(countInput.value);
    // 數字按鈕優先亮；沒有剛好對到的數字，題數又等於全部時才亮「全部」
    const numberHit = presets.includes(value);
    presetButtons.forEach((b, i) => {
      const p = presets[i];
      b.disabled = p !== "all" && p > n;
      b.setAttribute("aria-pressed", String(p === "all" ? !numberHit && value >= n && n > 0 : value === p));
    });
    if (!n) available.textContent = "請至少選一個單元";
    else if (value > n) available.textContent = `已選的單元只有 ${n} 題，會全部出`;
    else available.textContent = `已選的單元共有 ${n} 題`;
    start.disabled = n === 0;
  }

  const toggleAll = h("button", {
    type: "button", class: "link",
    onclick: () => {
      const all = boxes.every((b) => b.checked);
      boxes.forEach((b) => { b.checked = !all; });
      update();
    },
  }, "全選／全不選");

  boxes.forEach((b) => b.addEventListener("change", update));
  countInput.addEventListener("input", update);
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
        h("legend", {}, "範圍"),
        h("div", { class: "unit-list" },
          units.map((u, i) =>
            h("label", { class: "check" }, boxes[i],
              h("span", {}, u.title), h("span", { class: "chip-count" }, `${u.count} 題`))
          )
        ),
        units.length > 1 ? toggleAll : null
      ),
      h("fieldset", {},
        h("legend", {}, "題數"),
        h("div", { class: "count-row" }, presetButtons, h("label", { class: "custom" }, "自訂", countInput)),
        available
      ),
      start
    )
  );
  update();
}

function showRun(app, data, picked) {
  const { unitTitle } = data;
  const showUnit = lastSettings.unitIds.length > 1;
  const progress = h("span", { class: "progress-text" });
  const bar = h("span", { class: "progress-fill" });
  const warn = h("p", { class: "warn", hidden: true });
  const submit = h("button", { type: "button", class: "primary" }, "交卷");
  let confirming = false;

  const cards = picked.map((q, idx) => {
    const multi = q.qtype === "multiple";
    const inputs = q.options.map(() =>
      h("input", { type: multi ? "checkbox" : "radio", name: `q${idx}` })
    );
    const li = h("li", { class: "card" },
      cardHead(q, idx + 1, showUnit ? unitTitle.get(q.unit_id) : null),
      multi ? h("p", { class: "hint" }, "可複選") : null,
      h("ul", { class: "options" },
        q.options.map((text, i) =>
          h("li", {},
            h("label", { class: q.answers.includes(text) ? "option choice correct" : "option choice" },
              inputs[i],
              h("span", { class: "label" }, letter(i)),
              h("span", { class: "text" }, text)
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
    const done = answeredCount();
    progress.textContent = `已作答 ${done} / ${cards.length}`;
    bar.style.width = `${(done / cards.length) * 100}%`;
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
      warn.textContent = `還有 ${left} 題沒寫`;
      warn.hidden = false;
      submit.textContent = "確定交卷";
      return;
    }
    showResult(app, data, cards);
  });

  app.replaceChildren(
    h("div", { class: "quiz-top" },
      h("button", { type: "button", class: "link", onclick: () => showSetup(app, data) }, "← 回到設定")
    ),
    h("ol", { class: "questions" }, cards.map((c) => c.li)),
    h("div", { class: "submit-bar" },
      h("span", { class: "progress-track" }, bar),
      h("div", { class: "submit-row" },
        h("div", { class: "submit-info" }, progress, warn),
        submit
      )
    )
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
  const pct = Math.round((right / total) * 100);
  const onlyWrong = h("input", { type: "checkbox", disabled: right === total });
  onlyWrong.addEventListener("change", () => {
    cards.forEach((c) => { c.li.hidden = onlyWrong.checked && c.li.classList.contains("right"); });
  });

  app.replaceChildren(
    h("section", { class: `panel score ${pct >= 60 ? "pass" : "fail"}` },
      h("p", { class: "score-num" }, `${right}`, h("span", {}, ` / ${total}`)),
      h("p", { class: "score-sub" }, `答對 ${pct}%${right === total ? "，全對！" : `，錯 ${total - right} 題`}`),
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
