-- 一次性的資料修正：最早手動匯入的「單元一」其實是 eclass 的 CH2（測驗 58253），
-- 改成跟 eclass 一樣的章節名稱和編號，CH1 之後由書籤上傳時自動建立。
do $$
begin
  if exists (select 1 from public.units where id = 1 and title = '單元一' and exam_id is null)
     and not exists (select 1 from public.units where id = 2) then
    insert into public.units (id, title, exam_id) values (2, 'CH2', 58253);
    update public.questions set unit_id = 2 where unit_id = 1;
    delete from public.units where id = 1;
  end if;
end
$$;
