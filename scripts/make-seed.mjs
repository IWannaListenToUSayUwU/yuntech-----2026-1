// 開發用：把複製下來的測驗文字轉成可以貼進 Supabase SQL Editor 的 SQL。
// 用法：node scripts/make-seed.mjs <單元編號> <單元名稱> <文字檔> > supabase/seed_unitN.sql
import { readFileSync } from "node:fs";
import { parseQuizText } from "../js/parser.js";

const [unitId, unitTitle, file] = process.argv.slice(2);
if (!unitId || !unitTitle || !file) {
  console.error("用法：node scripts/make-seed.mjs <單元編號> <單元名稱> <文字檔>");
  process.exit(1);
}

const lit = (s) => (s == null ? "null" : `'${s.replaceAll("'", "''")}'`);
const arr = (xs) => `array[${xs.map(lit).join(", ")}]::text[]`;

const questions = parseQuizText(readFileSync(file, "utf8"));
// fingerprint 由資料庫的 trigger 計算，所以要先執行過 002_submit.sql
const rows = questions.map((q) =>
  `  (${Number(unitId)}, ${lit(q.qtype)}, ${lit(q.stem)}, ${arr(q.options)}, ${arr(q.answers)}, ${lit(q.explanation)})`
);

console.log(`-- 由 scripts/make-seed.mjs 產生：單元 ${unitId}，共 ${questions.length} 題
insert into public.units (id, title) values (${Number(unitId)}, ${lit(unitTitle)})
  on conflict (id) do update set title = excluded.title;

insert into public.questions (unit_id, qtype, stem, options, answers, explanation) values
${rows.join(",\n")}
on conflict (fingerprint) do nothing;`);
