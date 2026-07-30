-- 011: piket fixed days (Senin–Jumat), bukan rotasi week_offset
-- Jalankan di Supabase SQL Editor setelah 008.
--
-- Model baru:
--   piket_groups: 1 baris per (section, day_of_week 1–5) — anggota tetap
--   piket_task_defs: template tugas permanen per hari
--   piket_checks: status selesai per tanggal (tetap)

-- ─── Bersihkan data rotasi lama ──────────────────────────
delete from public.piket_checks;
delete from public.piket_groups;

-- ─── Kolom day_of_week ───────────────────────────────────
alter table public.piket_groups
  add column if not exists day_of_week int;

-- Slot tetap 5 hari × 2 seksi
insert into public.piket_groups (name, section, day_of_week, members, week_offset)
values
  ('Senin',  'kebersihan', 1, '', 0),
  ('Selasa', 'kebersihan', 2, '', 0),
  ('Rabu',   'kebersihan', 3, '', 0),
  ('Kamis',  'kebersihan', 4, '', 0),
  ('Jumat',  'kebersihan', 5, '', 0),
  ('Senin',  'keamanan',   1, '', 0),
  ('Selasa', 'keamanan',   2, '', 0),
  ('Rabu',   'keamanan',   3, '', 0),
  ('Kamis',  'keamanan',   4, '', 0),
  ('Jumat',  'keamanan',   5, '', 0);

alter table public.piket_groups
  alter column day_of_week set not null;

alter table public.piket_groups
  drop constraint if exists piket_groups_day_of_week_check;

alter table public.piket_groups
  add constraint piket_groups_day_of_week_check
  check (day_of_week between 1 and 5);

-- Unique (section, day) — 1 kelompok tetap per hari
create unique index if not exists piket_groups_section_day_uidx
  on public.piket_groups (section, day_of_week);

-- week_offset tidak dipakai lagi (biarkan kolom agar aman; app ignore)
-- optional: alter table public.piket_groups drop column week_offset;

-- ─── Template tugas permanen ─────────────────────────────
create table if not exists public.piket_task_defs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.piket_groups (id) on delete cascade,
  task_label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, task_label)
);

create index if not exists piket_task_defs_group_idx
  on public.piket_task_defs (group_id);

alter table public.piket_task_defs enable row level security;

drop policy if exists "piket_task_defs_public_read" on public.piket_task_defs;
create policy "piket_task_defs_public_read"
  on public.piket_task_defs for select
  to anon, authenticated
  using (true);

drop policy if exists "piket_task_defs_insert" on public.piket_task_defs;
drop policy if exists "piket_task_defs_update" on public.piket_task_defs;
drop policy if exists "piket_task_defs_delete" on public.piket_task_defs;

create policy "piket_task_defs_insert"
  on public.piket_task_defs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (g.section = 'kebersihan'::public.piket_section
            and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[]))
          or (g.section = 'keamanan'::public.piket_section
            and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[]))
        )
    )
  );

create policy "piket_task_defs_update"
  on public.piket_task_defs for update
  to authenticated
  using (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (g.section = 'kebersihan'::public.piket_section
            and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[]))
          or (g.section = 'keamanan'::public.piket_section
            and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[]))
        )
    )
  )
  with check (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (g.section = 'kebersihan'::public.piket_section
            and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[]))
          or (g.section = 'keamanan'::public.piket_section
            and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[]))
        )
    )
  );

create policy "piket_task_defs_delete"
  on public.piket_task_defs for delete
  to authenticated
  using (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (g.section = 'kebersihan'::public.piket_section
            and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[]))
          or (g.section = 'keamanan'::public.piket_section
            and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[]))
        )
    )
  );
