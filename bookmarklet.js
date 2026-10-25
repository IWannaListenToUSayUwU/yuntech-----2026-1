// 書籤「📥 上傳到題庫」實際執行的程式。書籤本身只負責載入這個檔案。
// 在 eclass 的任何一頁執行：用登入中的身分讀管理學所有已交卷測驗的題目和正確答案，
// 預覽後上傳到題庫。只讀題目、選項、正確答案，不讀作答內容、分數和個人資料。
(() => {
  const SITE = "https://iwannalistentousayuwu.github.io/yuntech-----2026-1/";
  const SUPABASE_URL = "https://lqgjugwfdwcefysadhky.supabase.co";
  const SUPABASE_KEY = "sb_publishable_uD36QQO23lQNT7Z3IjsyBg_xtohEhZG";
  const ECLASS_HOST = "eclass.yuntech.edu.tw";
  const COURSE_ID = 130439; // 2026 管理學（上）
  const TEST_MODE = window.__QUIZBANK_TEST === true; // 只讀題目、不碰題庫，開發測試用

  const TYPE_MAP = { single_selection: "single", multiple_selection: "multiple", true_or_false: "truefalse" };

  if (window.__quizbankPanel) window.__quizbankPanel.remove();

  // ── 面板（放在 shadow DOM 裡，不受 eclass 樣式影響）──
  const host = document.createElement("div");
  window.__quizbankPanel = host;
  host.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      .box{width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;
        padding:16px 18px;background:#fff;color:#1d1d1f;border:1px solid #e4e4df;border-radius:14px;
        box-shadow:0 10px 30px rgb(0 0 0/.18);font:14px/1.6 -apple-system,"PingFang TC","Microsoft JhengHei",sans-serif}
      h2{margin:0 0 8px;font-size:16px;display:flex;justify-content:space-between;align-items:center}
      .x{border:0;background:none;font-size:20px;line-height:1;cursor:pointer;color:#6b6b70;padding:0 2px}
      .log{margin:0;padding:0;list-style:none;color:#6b6b70}
      .log li.ok{color:#1a7f37}.log li.err{color:#c62828}
      .sum{margin:10px 0 0;padding:10px 12px;background:#f5f5f2;border-radius:10px}
      .sum table{width:100%;border-collapse:collapse}.sum td{padding:2px 0}.sum td+td{text-align:right}
      .btns{display:flex;gap:8px;margin-top:12px}
      button.p{flex:1;padding:9px 14px;border:0;border-radius:10px;background:#2f5bd3;color:#fff;font:inherit;font-weight:600;cursor:pointer}
      button.p:disabled{opacity:.5;cursor:default}
      a{color:#2f5bd3}
    </style>
    <div class="box"><h2>📥 上傳到題庫<button class="x" title="關閉">×</button></h2><ul class="log"></ul><div class="slot"></div></div>`;
  document.body.appendChild(host);
  const log = root.querySelector(".log");
  const slot = root.querySelector(".slot");
  root.querySelector(".x").onclick = () => host.remove();

  const say = (text, cls = "") => {
    const li = document.createElement("li");
    li.textContent = text;
    if (cls) li.className = cls;
    log.appendChild(li);
    return li;
  };

  if (location.hostname !== ECLASS_HOST) {
    say("請先登入 eclass，在 eclass 的頁面上再按一次這個書籤。", "err");
    return;
  }

  // ── eclass 資料 ──
  async function get(path) {
    const res = await fetch(path, { credentials: "same-origin", headers: { Accept: "application/json" } });
    if (res.status === 401 || res.status === 403) throw new Error("讀不到資料，請確認已經登入 eclass");
    if (!res.ok) throw new Error(`eclass 回應錯誤（${res.status}）：${path}`);
    return res.json();
  }

  const listOf = (data, key) => (Array.isArray(data) ? data : data?.[key] ?? []);

  async function examStatuses() {
    const all = [];
    for (let page = 1; ; page++) {
      const data = await get(`/api/courses/${COURSE_ID}/exam-list?page=${page}&page_size=50`);
      all.push(...listOf(data, "exams"));
      if (!data.pages || page >= data.pages) return all;
    }
  }

  function htmlToText(html) {
    const doc = new DOMParser().parseFromString(`<div>${html ?? ""}</div>`, "text/html");
    doc.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    doc.querySelectorAll("p, div, li").forEach((el) => el.append("\n"));
    return doc.body.textContent
      .replace(/ /g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim();
  }

  const hasImage = (html) => /<img\b/i.test(html ?? "");

  // 一題 TronClass subject → 題庫格式；不支援的回傳略過原因
  function toItem(subject, correctIds, unit) {
    const qtype = TYPE_MAP[subject.type];
    if (!qtype) return { skip: "題型不支援" };
    const options = [...(subject.options ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    if (options.length < 2) return { skip: "題型不支援" };
    if (hasImage(subject.description) || options.some((o) => hasImage(o.content))) return { skip: "含圖片" };
    const texts = options.map((o) => htmlToText(o.content));
    const answers = options
      .filter((o) => o.is_answer === true || correctIds.has(o.id))
      .map((o) => htmlToText(o.content));
    if (!answers.length) return { skip: "看不到答案" };
    const explanation = htmlToText(subject.answer_explanation);
    return {
      item: {
        unit: unit.title,
        unit_no: unit.no,
        exam_id: unit.examId,
        qtype,
        stem: htmlToText(subject.description),
        options: texts,
        answers,
        explanation: explanation || null,
      },
    };
  }

  async function collect() {
    const [modulesData, examsData, statuses] = await Promise.all([
      get(`/api/courses/${COURSE_ID}/modules`),
      get(`/api/courses/${COURSE_ID}/exams`),
      examStatuses(),
    ]);
    const modules = listOf(modulesData, "modules");
    const moduleName = new Map(modules.map((m) => [m.id, (m.name ?? m.title ?? "").trim()]));
    const moduleOrder = new Map(
      [...modules].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map((m, i) => [m.id, i + 1])
    );
    const status = new Map(statuses.map((e) => [e.id, e]));

    const exams = listOf(examsData, "exams")
      .map((e) => ({ ...e, ...status.get(e.id) }))
      .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)) || a.id - b.id);

    const items = [];
    const skipped = {};
    for (const exam of exams) {
      const name = moduleName.get(exam.module_id) || exam.title || `測驗 ${exam.id}`;
      const no = Number(/\d+/.exec(name)?.[0]) || moduleOrder.get(exam.module_id) || null;
      const unit = { title: name, no, examId: exam.id };

      if (!(exam.submission_count > 0)) {
        say(`${name}：還沒交卷，略過`);
        continue;
      }
      if (exam.is_announce_answer_time_passed === false) {
        say(`${name}：還沒公布答案，略過`);
        continue;
      }

      const line = say(`${name}：讀取中…`);
      const subs = listOf(await get(`/api/exams/${exam.id}/submissions`), "submissions");
      const seen = new Set();
      let count = 0;
      // 有隨機抽題的話，每次交卷的題目可能不同，所以每一筆都讀
      for (const sub of subs) {
        const detail = await get(`/api/exams/${exam.id}/submissions/${sub.id}`);
        const correct = new Map(
          (detail.correct_answers_data?.correct_answers ?? []).map((c) => [c.subject_id, new Set(c.answer_option_ids ?? [])])
        );
        for (const subject of detail.subjects_data?.subjects ?? []) {
          if (seen.has(subject.id)) continue;
          seen.add(subject.id);
          if (subject.sub_subjects?.length) {
            skipped["題組"] = (skipped["題組"] ?? 0) + 1;
            continue;
          }
          const r = toItem(subject, correct.get(subject.id) ?? new Set(), unit);
          if (r.skip) skipped[r.skip] = (skipped[r.skip] ?? 0) + 1;
          else {
            items.push(r.item);
            count++;
          }
        }
      }
      line.textContent = `${name}：讀到 ${count} 題`;
      line.className = "ok";
    }
    return { items, skipped };
  }

  // ── 題庫 ──
  async function submit(items, dryRun) {
    const total = { new: 0, duplicate: 0, invalid: 0, by_unit: {} };
    for (let i = 0; i < items.length; i += 400) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_questions`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ p_items: items.slice(i, i + 400), p_dry_run: dryRun }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`題庫回應錯誤：${body.message ?? res.status}`);
      total.new += body.new;
      total.duplicate += body.duplicate;
      total.invalid += body.invalid;
      for (const [unit, c] of Object.entries(body.by_unit ?? {})) {
        const t = (total.by_unit[unit] ??= { new: 0, duplicate: 0 });
        t.new += c.new;
        t.duplicate += c.duplicate;
      }
    }
    return total;
  }

  function summary(r) {
    const rows = Object.entries(r.by_unit)
      .sort(([a], [b]) => a.localeCompare(b, "zh-Hant", { numeric: true }))
      .map(([unit, c]) => `<tr><td>${escapeHtml(unit)}</td><td>新 ${c.new} 題／已有 ${c.duplicate} 題</td></tr>`)
      .join("");
    const extra = r.invalid ? `<p style="margin:6px 0 0">格式不符 ${r.invalid} 題，不會上傳</p>` : "";
    return `<div class="sum"><table>${rows}</table>${extra}</div>`;
  }

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  async function main() {
    say("讀取管理學的線上測驗…");
    const { items, skipped } = await collect();
    const skippedText = Object.entries(skipped).map(([k, n]) => `${k} ${n} 題`).join("、");
    if (skippedText) say(`略過：${skippedText}`);

    if (TEST_MODE) {
      console.log("[quizbank] items", items);
      say(`測試模式：共讀到 ${items.length} 題，沒有上傳`, "ok");
      window.__quizbankResult = { items, skipped };
      return;
    }
    if (!items.length) {
      say("沒有可以上傳的題目。", "err");
      return;
    }

    say("和題庫比對中…");
    const preview = await submit(items, true);
    slot.innerHTML = summary(preview);
    if (preview.new === 0) {
      say("這些題目題庫裡都有了，謝謝！", "ok");
      slot.insertAdjacentHTML("beforeend", `<p><a href="${SITE}" target="_blank">打開題庫</a></p>`);
      return;
    }
    const btns = document.createElement("div");
    btns.className = "btns";
    btns.innerHTML = `<button class="p">上傳 ${preview.new} 題新題目</button>`;
    slot.appendChild(btns);
    const button = btns.querySelector("button");
    button.onclick = async () => {
      button.disabled = true;
      button.textContent = "上傳中…";
      try {
        const done = await submit(items, false);
        slot.innerHTML = summary(done);
        say(`上傳完成，新增 ${done.new} 題，謝謝！`, "ok");
        slot.insertAdjacentHTML("beforeend", `<p><a href="${SITE}" target="_blank">打開題庫看看</a></p>`);
      } catch (err) {
        button.disabled = false;
        button.textContent = "再試一次";
        say(err.message, "err");
      }
    };
  }

  main().catch((err) => say(err.message, "err"));
})();
