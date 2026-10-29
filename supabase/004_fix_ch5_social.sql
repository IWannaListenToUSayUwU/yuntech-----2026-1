-- CH5「企業在法律規範下，滿足其經濟責任時，稱為」：老師更正答案為「社會責任」
update public.questions
   set answers = array['社會責任']
 where unit_id = 5
   and stem = '企業在法律規範下，滿足其經濟責任時，稱為：'
   and answers = array['社會義務'];
