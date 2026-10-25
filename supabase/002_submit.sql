-- 讓同學從網頁上傳題目。接在 schema.sql 之後執行，重複執行也不會出錯。
--
-- 網頁本身仍然沒有資料表的寫入權限，所有上傳都只能經過 submit_questions()：
-- 它檢查格式、去除重複、只新增不修改，找不到的單元才自動建立。

-- TronClass 的測驗名稱全都叫 HOMEWORK，看不出單元，所以用測驗編號對應單元
alter table public.units add column if not exists exam_id bigint unique;

-- 去重用的正規化：全半形統一、拿掉空白和標點、英文轉小寫
create or replace function public.quiz_normalize(s text)
returns text
language sql immutable
as $$
  select lower(regexp_replace(
    normalize(coalesce(s, ''), NFKC),
    '[[:space:][:punct:]　、。，．：；？！「」『』（）〔〕【】《》〈〉…‧·・—–～“”‘’]', '', 'g'
  ))
$$;

-- 同一題的判斷：題型 + 題目 + 選項（排序後），選項順序不同也算同一題
create or replace function public.quiz_fingerprint(qtype text, stem text, options text[])
returns text
language sql immutable
as $$
  select encode(sha256(convert_to(
    qtype || '|' || public.quiz_normalize(stem) || '|' ||
    coalesce((
      select string_agg(n, '|' order by n collate "C")
      from (select public.quiz_normalize(o) as n from unnest(options) as o) t
    ), ''),
    'UTF8'
  )), 'hex')
$$;

-- fingerprint 一律由資料庫算，不相信網頁送來的值
create or replace function public.questions_set_fingerprint()
returns trigger
language plpgsql
as $$
begin
  new.fingerprint := public.quiz_fingerprint(new.qtype, new.stem, new.options);
  return new;
end
$$;

drop trigger if exists questions_fingerprint on public.questions;
create trigger questions_fingerprint
  before insert or update of qtype, stem, options on public.questions
  for each row execute function public.questions_set_fingerprint();

-- 舊資料改用資料庫的算法重算一次
update public.questions set fingerprint = public.quiz_fingerprint(qtype, stem, options);

-- 上傳入口。p_items 是陣列，每一題長這樣：
--   {"unit": "CH1", "unit_no": 1, "exam_id": 58148, "qtype": "single", "stem": "...",
--    "options": ["...", "..."], "answers": ["..."], "explanation": "..."}
-- unit_no、exam_id 可省略（手動貼上時沒有）。建立新單元時，unit_no 沒被用過就拿來當單元編號，
-- 這樣 CH1、CH2… 不管誰先上傳，順序都對。有 exam_id 時先用它找單元，找不到再用單元名稱；
-- 用名稱找到、但那個單元還沒對應測驗時，順便記下對應。
-- p_dry_run = true 時只檢查、不寫入，給上傳頁預覽用。
create or replace function public.submit_questions(p_items jsonb, p_dry_run boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_unit text;
  v_exam_id bigint;
  v_unit_no int;
  v_unit_id int;
  v_unit_exam bigint;
  v_qtype text;
  v_stem text;
  v_options text[];
  v_answers text[];
  v_expl text;
  v_fp text;
  v_seen text[] := '{}';
  v_new_units text[] := '{}';
  n_new int := 0;
  n_dup int := 0;
  n_bad int := 0;
  by_unit jsonb := '{}';
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception '資料格式錯誤';
  end if;
  if jsonb_array_length(p_items) > 500 then
    raise exception '一次最多上傳 500 題';
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    begin
      v_unit := btrim(item ->> 'unit');
      v_exam_id := (item ->> 'exam_id')::bigint;
      v_unit_no := (item ->> 'unit_no')::int;
      v_qtype := coalesce(item ->> 'qtype', 'single');
      v_stem := btrim(item ->> 'stem');
      v_options := array(select btrim(x) from jsonb_array_elements_text(item -> 'options') as x);
      v_answers := array(select btrim(x) from jsonb_array_elements_text(item -> 'answers') as x);
      v_expl := nullif(btrim(item ->> 'explanation'), '');
    exception when others then
      n_bad := n_bad + 1;
      continue;
    end;

    if v_unit is null or length(v_unit) not between 1 and 50
      or v_qtype not in ('single', 'multiple', 'truefalse')
      or v_stem is null or length(v_stem) not between 1 and 2000
      or cardinality(v_options) not between 2 and 10
      or exists (select 1 from unnest(v_options) as o where length(o) not between 1 and 500)
      or cardinality(v_answers) < 1
      or not (v_answers <@ v_options)
      or (v_qtype <> 'multiple' and cardinality(v_answers) <> 1)
      or length(coalesce(v_expl, '')) > 2000
    then
      n_bad := n_bad + 1;
      continue;
    end if;

    -- 決定這題屬於哪個單元；預覽和結果都用單元的正式名稱
    v_unit_id := null;
    v_unit_exam := null;
    if v_exam_id is not null then
      select id, title into v_unit_id, v_unit from units where exam_id = v_exam_id;
      if v_unit_id is null then
        v_unit := btrim(item ->> 'unit');
      end if;
    end if;
    if v_unit_id is null then
      select id, exam_id into v_unit_id, v_unit_exam from units where title = v_unit;
      -- 同名單元已經對應到別的測驗，就不能混在一起
      if v_unit_id is not null and v_exam_id is not null and v_unit_exam is not null
         and v_unit_exam <> v_exam_id then
        n_bad := n_bad + 1;
        continue;
      end if;
    end if;

    v_fp := quiz_fingerprint(v_qtype, v_stem, v_options);
    if v_fp = any (v_seen) or exists (select 1 from questions where fingerprint = v_fp) then
      n_dup := n_dup + 1;
      by_unit := jsonb_set(by_unit, array[v_unit], jsonb_build_object(
        'new', coalesce((by_unit -> v_unit ->> 'new')::int, 0),
        'duplicate', coalesce((by_unit -> v_unit ->> 'duplicate')::int, 0) + 1));
      continue;
    end if;
    v_seen := v_seen || v_fp;
    n_new := n_new + 1;
    by_unit := jsonb_set(by_unit, array[v_unit], jsonb_build_object(
      'new', coalesce((by_unit -> v_unit ->> 'new')::int, 0) + 1,
      'duplicate', coalesce((by_unit -> v_unit ->> 'duplicate')::int, 0)));

    if v_unit_id is null and not (v_unit = any (v_new_units)) then
      v_new_units := v_new_units || v_unit;
    end if;

    if not p_dry_run then
      if v_unit_id is null then
        -- 同一次上傳裡前面的題目可能已經建好這個單元
        select id into v_unit_id from units where title = v_unit;
      end if;
      if v_unit_id is null then
        if (select count(*) from units) >= 40 then
          raise exception '單元數量已達上限，請聯絡管理者';
        end if;
        insert into units (id, title, exam_id)
          values (
            case
              when v_unit_no between 1 and 999 and not exists (select 1 from units where id = v_unit_no)
                then v_unit_no
              else (select greatest(coalesce(max(id), 0), 999) + 1 from units)
            end,
            v_unit, v_exam_id)
          returning id into v_unit_id;
      elsif v_exam_id is not null then
        update units set exam_id = v_exam_id where id = v_unit_id and exam_id is null;
      end if;
      insert into questions (unit_id, qtype, stem, options, answers, explanation)
        values (v_unit_id, v_qtype, v_stem, v_options, v_answers, v_expl)
        on conflict (fingerprint) do nothing;
    end if;
  end loop;

  return jsonb_build_object(
    'new', n_new,
    'duplicate', n_dup,
    'invalid', n_bad,
    'new_units', to_jsonb(v_new_units),
    'by_unit', by_unit,
    'dry_run', p_dry_run
  );
end
$$;

revoke execute on function public.submit_questions(jsonb, boolean) from public;
grant execute on function public.submit_questions(jsonb, boolean) to anon, authenticated;
