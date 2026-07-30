-- 012: field tambahan log keamanan (internal)
-- Jalankan di Supabase SQL Editor setelah 011.

alter table public.incident_logs
  add column if not exists student_name text;

alter table public.incident_logs
  add column if not exists occurred_at timestamptz;

-- Backfill dari created_at / date
update public.incident_logs
set occurred_at = coalesce(occurred_at, created_at, date::timestamptz, now())
where occurred_at is null;

alter table public.incident_logs
  alter column occurred_at set default now();

alter table public.incident_logs
  alter column occurred_at set not null;

-- Pastikan RLS: hanya role keamanan + full editors (ketua/wakil/guru)
-- (mirror policy 001 / 007b — idempotent)

drop policy if exists "incidents_read_auth" on public.incident_logs;
create policy "incidents_read_auth"
  on public.incident_logs for select
  to authenticated
  using (
    public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
  );

drop policy if exists "incidents_write_keamanan" on public.incident_logs;
create policy "incidents_write_keamanan"
  on public.incident_logs for insert
  to authenticated
  with check (
    public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
    and author_id = auth.uid()
  );

drop policy if exists "incidents_update_keamanan" on public.incident_logs;
create policy "incidents_update_keamanan"
  on public.incident_logs for update
  to authenticated
  using (
    public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
  )
  with check (
    public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
  );

drop policy if exists "incidents_delete_keamanan" on public.incident_logs;
create policy "incidents_delete_keamanan"
  on public.incident_logs for delete
  to authenticated
  using (
    public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
  );
