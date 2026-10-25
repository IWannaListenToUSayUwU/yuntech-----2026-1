import { supabase } from "./supabase.js";

// Supabase 一次最多回 1000 筆，題目多了要分頁抓
const PAGE_SIZE = 1000;

async function fetchAllQuestions() {
  const all = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("questions")
      .select("id, unit_id, qtype, stem, options, answers, explanation")
      .order("unit_id")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE_SIZE) return all;
  }
}

export async function loadAll() {
  const { data: units, error } = await supabase.from("units").select("id, title").order("id");
  if (error) throw error;
  const questions = await fetchAllQuestions();
  const unitTitle = new Map(units.map((u) => [u.id, u.title]));
  for (const u of units) u.count = questions.filter((q) => q.unit_id === u.id).length;
  return { units, questions, unitTitle };
}
