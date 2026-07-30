-- 009b: kolom subject, task_submissions, RLS tugas
-- PRASYARAT: 009_add_tugas_enum.sql sudah dijalankan & sukses (commit terpisah).
--
-- Siapa boleh kelola kategori "tugas" di announcements:
--   ketua | wakil | sekretaris | guru  (sama full editor pengumuman)
-- Siapa boleh batalkan submission siswa:
--   ketua | wakil | guru  (siswa insert-only, final)

-- ─── Kolom mapel (tugas) ───────────────────────────────────
alter table public.announcements
  add column if not exists subject text;

-- Deadline wajib untuk kategori tugas
alter table public.announcements
  drop constraint if exists announcements_tugas_deadline_chk;

alter table public.announcements
  add constraint announcements_tugas_deadline_chk
  check (
    category <> 'tugas'::public.announcement_category
    or event_date is not null
  );

-- ─── Status kumpul per siswa per tugas ─────────────────────
create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  submitted boolean not null default true,
  submitted_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

create index if not exists task_submissions_announcement_idx
  on public.task_submissions (announcement_id);
create index if not exists task_submissions_user_idx
  on public.task_submissions (user_id);

alter table public.task_submissions enable row level security;

-- ─── Announcements writers ─────────────────────────────────
-- Full editors (ketua/wakil/sekretaris/guru): semua kategori incl. tugas
-- Seksi piket: hanya peringatan milik sendiri (insert/update/delete)
drop policy if exists "announcements_insert_editors" on public.announcements;
drop policy if exists "announcements_insert_writers" on public.announcements;
create policy "announcements_insert_writers"
  on public.announcements for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.has_role(array['ketua','wakil','sekretaris','guru']::public.app_role[])
      or (
        public.has_role(array['keamanan','kebersihan']::public.app_role[])
        and category = 'peringatan'::public.announcement_category
      )
    )
  );

drop policy if exists "announcements_update_editors" on public.announcements;
drop policy if exists "announcements_update_writers" on public.announcements;
create policy "announcements_update_writers"
  on public.announcements for update
  to authenticated
  using (
    public.has_role(array['ketua','wakil','sekretaris','guru']::public.app_role[])
    or (
      public.has_role(array['keamanan','kebersihan']::public.app_role[])
      and category = 'peringatan'::public.announcement_category
      and author_id = auth.uid()
    )
  )
  with check (
    public.has_role(array['ketua','wakil','sekretaris','guru']::public.app_role[])
    or (
      public.has_role(array['keamanan','kebersihan']::public.app_role[])
      and category = 'peringatan'::public.announcement_category
      and author_id = auth.uid()
    )
  );

drop policy if exists "announcements_delete_editors" on public.announcements;
drop policy if exists "announcements_delete_writers" on public.announcements;
create policy "announcements_delete_writers"
  on public.announcements for delete
  to authenticated
  using (
    public.has_role(array['ketua','wakil','sekretaris','guru']::public.app_role[])
    or (
      public.has_role(array['keamanan','kebersihan']::public.app_role[])
      and category = 'peringatan'::public.announcement_category
      and author_id = auth.uid()
    )
  );

-- ─── task_submissions RLS ──────────────────────────────────
drop policy if exists "task_submissions_select_auth" on public.task_submissions;
create policy "task_submissions_select_auth"
  on public.task_submissions for select
  to authenticated
  using (true);

-- Siswa (dan semua role): insert sekali miliknya sendiri, submitted=true, target harus tugas
drop policy if exists "task_submissions_insert_self" on public.task_submissions;
create policy "task_submissions_insert_self"
  on public.task_submissions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and submitted = true
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_id
        and a.category = 'tugas'::public.announcement_category
    )
  );

-- Batal kumpul: hanya ketua|wakil|guru (bukan siswa, bukan sekretaris)
drop policy if exists "task_submissions_update_editors" on public.task_submissions;
create policy "task_submissions_update_editors"
  on public.task_submissions for update
  to authenticated
  using (public.has_role(array['ketua','wakil','guru']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru']::public.app_role[]));

drop policy if exists "task_submissions_delete_editors" on public.task_submissions;
create policy "task_submissions_delete_editors"
  on public.task_submissions for delete
  to authenticated
  using (public.has_role(array['ketua','wakil','guru']::public.app_role[]));
