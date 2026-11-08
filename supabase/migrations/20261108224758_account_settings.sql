-- Record the existing preferences table and extend it to all saved settings.
create table if not exists public.user_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  value jsonb not null,
  primary key (user_id, name)
);
alter table public.user_preferences drop constraint if exists profile_preference_name;
alter table public.user_preferences add constraint profile_preference_name check (name in (
  'selectedModuleId', 'instrumentId', 'keyMode', 'startKeyId', 'allKeys',
  'selectedKeyIds', 'tempo', 'swing', 'guideTones', 'metronome', 'auto',
  'headphonesTipSeen', 'lessons', 'modules', 'myCharts'
));
alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from anon, authenticated;
grant select, insert, update on public.user_preferences to authenticated;
drop policy if exists "Read own preferences" on public.user_preferences;
drop policy if exists "Insert own preferences" on public.user_preferences;
drop policy if exists "Update own preferences" on public.user_preferences;
create policy "Read own preferences" on public.user_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Insert own preferences" on public.user_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own preferences" on public.user_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
