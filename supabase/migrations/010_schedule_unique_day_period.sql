-- Satu mapel per kombinasi hari + jam ke-
-- Dedup dulu (simpan baris id terbesar), lalu unique constraint.

delete from public.schedule_slots a
using public.schedule_slots b
where a.day_of_week = b.day_of_week
  and a.period = b.period
  and a.ctid < b.ctid;

alter table public.schedule_slots
  drop constraint if exists schedule_slots_day_period_unique;

alter table public.schedule_slots
  add constraint schedule_slots_day_period_unique
  unique (day_of_week, period);
