-- Both libraries use the existing per-item, ordered preference journal.
-- Existing chart favorites and all account ownership policies stay intact.
alter table public.user_preferences drop constraint profile_preference_name;
alter table public.user_preferences add constraint profile_preference_name check (
  name in ('selectedModuleId','selectedChartId','instrumentId','keyMode','startKeyId','allKeys','selectedKeyIds','tempo','swing','guideTones','metronome','auto','headphonesTipSeen','lessons','modules','myCharts')
  or name ~ '^(chart|lick):[a-z0-9-]+$'
  or name ~ '^lesson:[a-z0-9:-]+:(tempo|melodyRegister)$'
  or name ~ '^module:[a-z0-9-]+:studyMode$'
);
