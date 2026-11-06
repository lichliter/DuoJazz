create table public.practice_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null check (length(lesson_id) between 1 and 100),
  key_id text not null check (length(key_id) between 1 and 20),
  kind text not null check (kind in ('passedKeys', 'learnedKeys')),
  primary key (user_id, lesson_id, key_id, kind)
);
alter table public.practice_progress enable row level security;
revoke all on public.practice_progress from anon, authenticated;
grant select, insert on public.practice_progress to authenticated;
create policy "Read own progress" on public.practice_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own progress" on public.practice_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
