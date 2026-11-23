create or replace function public.save_user_preferences(changes jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;

  insert into public.user_preferences(user_id,name,value,edit_clock,edit_id)
  select auth.uid(), x.name,
    -- The reset marker is JSON null. Record conversion turns it into SQL NULL.
    case when x.name ~ '^module:[a-z0-9-]+:tempo$' then item.change -> 'value' else x.value end,
    x.edit_clock, x.edit_id
  from jsonb_array_elements(changes) as item(change)
  cross join lateral jsonb_to_record(item.change) as x(name text,value jsonb,edit_clock bigint,edit_id uuid)
  order by x.name
  on conflict (user_id,name) do update
    set value=excluded.value, edit_clock=excluded.edit_clock, edit_id=excluded.edit_id
    where (excluded.edit_clock,excluded.edit_id) > (user_preferences.edit_clock,user_preferences.edit_id);
end;
$$;
