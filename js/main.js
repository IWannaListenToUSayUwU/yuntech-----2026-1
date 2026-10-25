import { supabase } from "./supabase.js";

const el = {
  units: document.getElementById("units"),
  search: document.getElementById("search"),
  showAll: document.getElementById("show-all"),
  summary: document.getElementById("summary"),
  questions: document.getElementById("questions"),
  status: document.getElementById("status"),
};

const TYPE_LABEL = { single: "單選題", multiple: "多選題", truefalse: "是非題" };

let units = [];
let questions = [];
let currentUnit = null;

const letter = (i) => String.fromCharCode(65 + i);

function setStatus(text) {
  el.status.textContent = text;
  el.status.hidden = !text;
}

// 網址記住目前的單元（#unit=1），方便貼連結給同學
function unitFromHash() {
  const m = /unit=(\d+)/.exec(location.hash);
  return m ? Number(m[1]) : null;
}

function renderUnits() {
  el.units.replaceChildren(
    ...units.map((u) => {
      const a = document.createElement("a");
      a.href = `#unit=${u.id}`;
      a.textContent = u.title;
      if (u.id === currentUnit) a.setAttribute("aria-current", "page");
      return a;
    })
  );
}

function reveal(card, picked) {
  card.classList.add("revealed");
  if (picked) {
    const correct = picked.classList.contains("correct");
    picked.classList.add(correct ? "picked-right" : "picked-wrong");
  }
}

function renderQuestion(q, index) {
  const li = document.createElement("li");
  li.className = "card";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `第 ${index + 1} 題 · ${TYPE_LABEL[q.qtype] ?? q.qtype}`;

  const stem = document.createElement("p");
  stem.className = "stem";
  stem.textContent = q.stem;

  const opts = document.createElement("ul");
  opts.className = "options";
  q.options.forEach((text, i) => {
    const opt = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    if (q.answers.includes(text)) btn.classList.add("correct");
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = letter(i);
    const body = document.createElement("span");
    body.textContent = text;
    btn.append(label, body);
    btn.addEventListener("click", () => {
      if (!li.classList.contains("revealed")) reveal(li, btn);
    });
    opt.append(btn);
    opts.append(opt);
  });

  const footer = document.createElement("div");
  footer.className = "card-footer";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "link";
  toggle.textContent = "看答案";
  toggle.addEventListener("click", () => reveal(li));
  const answer = document.createElement("p");
  answer.className = "answer";
  const letters = q.answers
    .map((a) => q.options.indexOf(a))
    .filter((i) => i >= 0)
    .map(letter);
  answer.textContent = `正確答案：${letters.join("、") || q.answers.join("、")}`;
  footer.append(toggle, answer);

  li.append(meta, stem, opts, footer);
  if (q.explanation) {
    const exp = document.createElement("p");
    exp.className = "explanation";
    exp.textContent = `解釋：${q.explanation}`;
    li.append(exp);
  }
  if (el.showAll.checked) reveal(li);
  return li;
}

function renderQuestions() {
  const keyword = el.search.value.trim().toLowerCase();
  const shown = keyword
    ? questions.filter((q) =>
        [q.stem, ...q.options].some((s) => s.toLowerCase().includes(keyword))
      )
    : questions;

  const unit = units.find((u) => u.id === currentUnit);
  el.summary.textContent = keyword
    ? `${unit.title}：找到 ${shown.length} 題（共 ${questions.length} 題）`
    : `${unit.title}：共 ${questions.length} 題`;
  el.questions.replaceChildren(...shown.map(renderQuestion));
  setStatus(shown.length ? "" : keyword ? "找不到符合的題目" : "這個單元還沒有題目");
}

async function loadUnit(id) {
  currentUnit = id;
  renderUnits();
  el.questions.replaceChildren();
  el.summary.textContent = "";
  setStatus("載入中…");

  const { data, error } = await supabase
    .from("questions")
    .select("id, qtype, stem, options, answers, explanation")
    .eq("unit_id", id)
    .order("id");
  if (currentUnit !== id) return; // 載入途中切換了單元
  if (error) {
    setStatus(`載入題目失敗：${error.message}`);
    return;
  }
  questions = data;
  renderQuestions();
}

async function init() {
  const { data, error } = await supabase.from("units").select("id, title").order("id");
  if (error) {
    setStatus(`載入單元失敗：${error.message}`);
    return;
  }
  units = data;
  if (!units.length) {
    setStatus("目前還沒有任何單元");
    return;
  }
  const wanted = unitFromHash();
  loadUnit(units.some((u) => u.id === wanted) ? wanted : units[0].id);
}

window.addEventListener("hashchange", () => {
  const id = unitFromHash();
  if (id && id !== currentUnit && units.some((u) => u.id === id)) {
    el.search.value = "";
    loadUnit(id);
  }
});
el.search.addEventListener("input", renderQuestions);
el.showAll.addEventListener("change", () => {
  if (el.showAll.checked) {
    el.questions.querySelectorAll(".card").forEach((c) => reveal(c));
  } else {
    renderQuestions();
  }
});

init();
