-- 題庫資料表。在 Supabase 後台的 SQL Editor 整段貼上執行即可，重複執行也不會出錯。

create table if not exists public.units (
  id int primary key,          -- 單元編號：1、2、3…
  title text not null
);

create table if not exists public.questions (
  id bigint generated always as identity primary key,
  unit_id int not null references public.units (id),
  qtype text not null default 'single',   -- single / multiple / truefalse
  stem text not null,                     -- 題目
  options text[] not null,                -- 選項，照原本順序
  answers text[] not null,                -- 正確選項的「文字」，不存字母，選項順序被打亂也對得上
  explanation text,
  fingerprint text not null unique,       -- 去除重複用，由 js/parser.js 計算
  created_at timestamptz not null default now()
);

create index if not exists questions_unit_id_idx on public.questions (unit_id);

alter table public.units enable row level security;
alter table public.questions enable row level security;

-- 目前：任何人都可以讀，沒有人能從網頁寫入。
-- 之後加上登入功能時，會改成只有登入的同學能讀寫。
drop policy if exists "公開讀取" on public.units;
create policy "公開讀取" on public.units for select to anon, authenticated using (true);

drop policy if exists "公開讀取" on public.questions;
create policy "公開讀取" on public.questions for select to anon, authenticated using (true);

grant select on public.units, public.questions to anon, authenticated;
