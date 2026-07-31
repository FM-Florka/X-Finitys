-- 014_attendance_materials.sql
--
-- Dua modul baru:
--   1. attendance_records — absensi harian. Hanya siswa yang TIDAK hadir
--      dicatat (sakit/izin/alfa). Tidak ada baris = dianggap hadir.
--   2. materials — materi & file pelajaran (bucket storage `materi`).
--
-- Catatan status absensi memakai `text` + CHECK, bukan enum baru, supaya
-- tabel + policy bisa dibuat dalam satu transaksi (enum baru tidak boleh
-- dipakai di policy pada transaksi yang sama — error 55P04, lihat 007/009).
--
-- Jalankan di Supabase SQL Editor setelah 013.

-- ═══════════════════════════════════════════════════════
-- 1. Absensi harian
-- ═══════════════════════════════════════════════════════

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  -- Hanya ketidakhadiran yang dicatat; 'hadir' sengaja TIDAK diizinkan
  -- supaya tidak ada baris redundan (absence-only model).
  status text not null check (status in ('sakit', 'izin', 'alfa')),
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Satu siswa hanya punya satu status per tanggal
  unique (user_id, date)
);

create index if not exists attendance_records_date_idx
  on public.attendance_records (date desc);

create index if not exists attendance_records_user_date_idx
  on public.attendance_records (user_id, date desc);

alter table public.attendance_records enable row level security;

-- Read: pengurus absensi lihat semua; siswa lihat miliknya sendiri
drop policy if exists "attendance_read" on public.attendance_records;
create policy "attendance_read"
  on public.attendance_records for select
  to authenticated
  using (
    public.has_role(array['guru','ketua','wakil','sekretaris']::public.app_role[])
    or user_id = auth.uid()
  );

-- Write: hanya wali / ketua / wakil / sekretaris
drop policy if exists "attendance_insert" on public.attendance_records;
create policy "attendance_insert"
  on public.attendance_records for insert
  to authenticated
  with check (
    public.has_role(array['guru','ketua','wakil','sekretaris']::public.app_role[])
  );

drop policy if exists "attendance_update" on public.attendance_records;
create policy "attendance_update"
  on public.attendance_records for update
  to authenticated
  using (
    public.has_role(array['guru','ketua','wakil','sekretaris']::public.app_role[])
  )
  with check (
    public.has_role(array['guru','ketua','wakil','sekretaris']::public.app_role[])
  );

drop policy if exists "attendance_delete" on public.attendance_records;
create policy "attendance_delete"
  on public.attendance_records for delete
  to authenticated
  using (
    public.has_role(array['guru','ketua','wakil','sekretaris']::public.app_role[])
  );

-- ═══════════════════════════════════════════════════════
-- 2. Materi & file pelajaran
-- ═══════════════════════════════════════════════════════

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject text,
  -- Path di bucket storage `materi`
  storage_path text not null unique,
  file_name text not null,
  file_size bigint,
  mime_type text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists materials_created_idx
  on public.materials (created_at desc);

create index if not exists materials_subject_idx
  on public.materials (subject);

alter table public.materials enable row level security;

-- Read: semua yang login
drop policy if exists "materials_read" on public.materials;
create policy "materials_read"
  on public.materials for select
  to authenticated
  using (true);

-- Insert: semua yang login boleh upload, tapi wajib mengaku sebagai dirinya
drop policy if exists "materials_insert" on public.materials;
create policy "materials_insert"
  on public.materials for insert
  to authenticated
  with check (uploaded_by = auth.uid());

-- Update: pemilik file, atau wali/ketua/wakil
drop policy if exists "materials_update" on public.materials;
create policy "materials_update"
  on public.materials for update
  to authenticated
  using (
    uploaded_by = auth.uid()
    or public.has_role(array['guru','ketua','wakil']::public.app_role[])
  )
  with check (
    uploaded_by = auth.uid()
    or public.has_role(array['guru','ketua','wakil']::public.app_role[])
  );

-- Delete: pemilik file, atau wali/ketua/wakil
drop policy if exists "materials_delete" on public.materials;
create policy "materials_delete"
  on public.materials for delete
  to authenticated
  using (
    uploaded_by = auth.uid()
    or public.has_role(array['guru','ketua','wakil']::public.app_role[])
  );

-- ═══════════════════════════════════════════════════════
-- 3. Storage bucket `materi`
-- ═══════════════════════════════════════════════════════
-- PRIVATE (beda dari `gallery` yang public read): materi diakses lewat
-- signed URL dari server, jadi file tidak bocor ke non-anggota kelas.

insert into storage.buckets (id, name, public)
values ('materi', 'materi', false)
on conflict (id) do update set public = false;

drop policy if exists "materi_read" on storage.objects;
create policy "materi_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'materi');

drop policy if exists "materi_insert" on storage.objects;
create policy "materi_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'materi' and owner = auth.uid());

drop policy if exists "materi_delete" on storage.objects;
create policy "materi_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'materi'
    and (
      owner = auth.uid()
      or public.has_role(array['guru','ketua','wakil']::public.app_role[])
    )
  );

-- Verifikasi (opsional):
--   select tablename, policyname from pg_policies
--   where tablename in ('attendance_records', 'materials');
