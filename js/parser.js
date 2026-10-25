// 把 TronClass 測驗結果頁「全選複製」出來的文字拆成題目。
// 開發用，給 scripts/make-seed.mjs 匯入手動複製的題目。
// 去除重複由資料庫負責（supabase/002_submit.sql 的 quiz_fingerprint）。

const TYPE_MAP = {
  單選題: "single",
  多選題: "multiple",
  是非題: "truefalse",
  判斷題: "truefalse",
};

const HEADER_RE = /^(\d+)\.\s*(.*)$/;
const TYPE_RE = /^(單選題|多選題|是非題|判斷題)/;
const LABEL_RE = /^[A-Z]$/;
const ANSWER_RE = /^正確答案\s*[:：]\s*(.*)$/;
const EXPLAIN_RE = /^答案解釋\s*[:：]\s*(.*)$/;
// 作答結果是個人資料，不存
const RESULT_SUFFIX_RE = /\s*(回答錯誤|回答正確|部分正確)\s*$/;

const isBlank = (line) => line.trim() === "";

function nextNonBlank(lines, from) {
  for (let i = from; i < lines.length; i++) {
    if (!isBlank(lines[i])) return lines[i].trim();
  }
  return null;
}

// 題號那一行之後（可能跨好幾行）接著題型那一行，才算是新題目的開頭
function isQuestionStart(lines, i) {
  if (!HEADER_RE.test(lines[i].trim())) return false;
  for (let j = i + 1; j < lines.length && j <= i + 5; j++) {
    const t = lines[j].trim();
    if (TYPE_RE.test(t)) return true;
    if (LABEL_RE.test(t) || ANSWER_RE.test(t)) return false;
  }
  return false;
}

export function parseQuizText(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const questions = [];
  let q = null;
  let mode = null; // "stem" | "option" | "explain"

  const finish = () => {
    if (!q) return;
    q.stem = q.stem.join("\n").replace(RESULT_SUFFIX_RE, "").trim();
    q.options = q.options.map((o) => o.text.join("\n").trim());
    q.explanation = q.explanation.join("\n").trim() || null;
    const letters = (q.rawAnswer.match(/[A-Z]/g) || []);
    q.answers = letters.length
      ? letters.map((l) => q.options[l.charCodeAt(0) - 65]).filter(Boolean)
      : [q.rawAnswer].filter(Boolean);
    delete q.rawAnswer;
    if (q.stem && q.options.length) questions.push(q);
    q = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();

    if (isQuestionStart(lines, i)) {
      finish();
      q = { qtype: "single", stem: [HEADER_RE.exec(t)[2]], options: [], rawAnswer: "", explanation: [] };
      mode = "stem";
      continue;
    }
    if (!q) continue;

    const typeMatch = TYPE_RE.exec(t);
    if (mode === "stem" && typeMatch) {
      q.qtype = TYPE_MAP[typeMatch[1]];
      mode = null;
      continue;
    }
    if (LABEL_RE.test(t) && nextNonBlank(lines, i + 1) === ".") {
      q.options.push({ text: [] });
      mode = "option";
      // 跳過字母下面那一行 "."
      while (lines[i + 1] !== undefined && lines[i + 1].trim() !== ".") i++;
      i++;
      continue;
    }
    const ans = ANSWER_RE.exec(t);
    if (ans) {
      q.rawAnswer = ans[1].trim();
      mode = null;
      continue;
    }
    const exp = EXPLAIN_RE.exec(t);
    if (exp) {
      if (exp[1]) q.explanation.push(exp[1]);
      mode = "explain";
      continue;
    }

    if (mode === "stem" && !isBlank(t)) q.stem.push(t);
    else if (mode === "option") {
      if (isBlank(t)) mode = null;
      else q.options[q.options.length - 1].text.push(t);
    } else if (mode === "explain" && !isBlank(t)) q.explanation.push(t);
  }
  finish();
  return questions;
}
