alter table public.user_preferences
  add column edit_clock bigint not null default 0 check (edit_clock between 0 and 9007199254740991),
  add column edit_id uuid not null default '00000000-0000-0000-0000-000000000000';
alter table public.user_preferences drop constraint profile_preference_name;
alter table public.user_preferences add constraint profile_preference_name check (
  name in ('selectedModuleId','instrumentId','keyMode','startKeyId','allKeys','selectedKeyIds','tempo','swing','guideTones','metronome','auto','headphonesTipSeen','lessons','modules','myCharts')
  or name ~ '^chart:[a-z0-9-]+$'
  or name ~ '^lesson:[a-z0-9:-]+:(tempo|melodyRegister)$'
  or name ~ '^module:[a-z0-9-]+:studyMode$'
);
-- Migrate existing collections without removing their original recovery copies.
insert into public.user_preferences(user_id,name,value)
select user_id, 'chart:' || chart, 'true'::jsonb from public.user_preferences,
lateral jsonb_array_elements_text(case when jsonb_typeof(value)='array' then value else '[]'::jsonb end) chart
where name='myCharts' on conflict do nothing;
insert into public.user_preferences(user_id,name,value)
select user_id, (case when name='lessons' then 'lesson:' else 'module:' end) || item.key || ':' || field.key, field.value
from public.user_preferences,
lateral jsonb_each(case when jsonb_typeof(value)='object' then value else '{}'::jsonb end) item,
lateral jsonb_each(case when jsonb_typeof(item.value)='object' then item.value else '{}'::jsonb end) field
where (name='lessons' and field.key in ('tempo','melodyRegister')) or (name='modules' and field.key='studyMode')
on conflict do nothing;

create function public.save_user_preferences(changes jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  insert into public.user_preferences(user_id,name,value,edit_clock,edit_id)
  select auth.uid(), x.name, x.value, x.edit_clock, x.edit_id
  from jsonb_to_recordset(changes) as x(name text,value jsonb,edit_clock bigint,edit_id uuid)
  order by x.name
  on conflict (user_id,name) do update
    set value=excluded.value, edit_clock=excluded.edit_clock, edit_id=excluded.edit_id
    where (excluded.edit_clock,excluded.edit_id) > (user_preferences.edit_clock,user_preferences.edit_id);
end;
$$;
revoke all on function public.save_user_preferences(jsonb) from public, anon;
grant execute on function public.save_user_preferences(jsonb) to authenticated;
