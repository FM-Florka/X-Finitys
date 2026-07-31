-- 013_require_login_revoke_anon.sql
--
-- Semua halaman sekarang wajib login (landing publik dihapus, "/" → /login).
-- Konsekuensi RLS: role `anon` tidak boleh lagi membaca data kelas.
-- Policy read yang tadinya `to anon, authenticated` dipersempit ke
-- `authenticated` saja, plus grant SELECT untuk anon dicabut.
--
-- Storage bucket `gallery` TETAP public read: <img src> di browser memakai
-- URL publik tanpa Authorization header, jadi kalau anon dicabut, foto di
-- halaman galeri (yang sudah login) ikut gagal load. Path storage bersifat
-- unguessable; daftar album/foto tetap butuh login karena tabel albums/photos
-- sudah authenticated-only.
--
-- Jalankan di Supabase SQL Editor setelah 012.

-- ─── class_meta ──────────────────────────────────────────
drop policy if exists "class_meta_public_read" on public.class_meta;
create policy "class_meta_auth_read"
  on public.class_meta for select
  to authenticated
  using (true);

-- ─── announcements ───────────────────────────────────────
drop policy if exists "announcements_public_read" on public.announcements;
create policy "announcements_auth_read"
  on public.announcements for select
  to authenticated
  using (true);

-- ─── schedule_slots ──────────────────────────────────────
drop policy if exists "schedule_public_read" on public.schedule_slots;
create policy "schedule_auth_read"
  on public.schedule_slots for select
  to authenticated
  using (true);

-- ─── piket_groups ────────────────────────────────────────
drop policy if exists "piket_groups_public_read" on public.piket_groups;
create policy "piket_groups_auth_read"
  on public.piket_groups for select
  to authenticated
  using (true);

-- ─── piket_checks ────────────────────────────────────────
drop policy if exists "piket_checks_public_read" on public.piket_checks;
create policy "piket_checks_auth_read"
  on public.piket_checks for select
  to authenticated
  using (true);

-- ─── piket_task_defs (dari 011) ──────────────────────────
drop policy if exists "piket_task_defs_public_read" on public.piket_task_defs;
create policy "piket_task_defs_auth_read"
  on public.piket_task_defs for select
  to authenticated
  using (true);

-- ─── albums ──────────────────────────────────────────────
drop policy if exists "albums_public_read" on public.albums;
create policy "albums_auth_read"
  on public.albums for select
  to authenticated
  using (true);

-- ─── photos ──────────────────────────────────────────────
drop policy if exists "photos_public_read" on public.photos;
create policy "photos_auth_read"
  on public.photos for select
  to authenticated
  using (true);

-- ─── Grants: cabut akses baca anon ───────────────────────
-- Otorisasi final tetap di RLS, tapi grant dicabut sebagai lapisan kedua.
revoke select on all tables in schema public from anon;
revoke usage on schema public from anon;

-- Verifikasi (opsional, jalankan manual):
--   select tablename, policyname, roles
--   from pg_policies
--   where schemaname = 'public' and 'anon' = any(roles);
-- Harus mengembalikan 0 baris.
