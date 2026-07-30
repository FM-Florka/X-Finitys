-- XF Hub — schema + RLS (jalankan di Supabase SQL Editor)
-- Roles: siswa | ketua | wakil | bendahara | keamanan | kebersihan | sekretaris | guru

create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────
do $$ begin
  create type public.app_role as enum (
    'siswa', 'ketua', 'wakil', 'bendahara', 'keamanan', 'kebersihan', 'sekretaris', 'guru'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.announcement_category as enum (
    'akademik', 'acara', 'piket', 'kas', 'umum', 'peringatan'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_type as enum ('pemasukan', 'pengeluaran');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.kas_kind as enum ('rutin', 'iuran', 'lain');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.piket_section as enum ('kebersihan', 'keamanan');
exception when duplicate_object then null;
end $$;

-- ─── Profiles (1:1 auth.users) ───────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.app_role not null default 'siswa',
  nis text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'siswa')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Helper: current user's role (security definer, stable) ──
create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any (roles)
  );
$$;

create or replace function public.is_logged_in()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

-- ─── Class meta ──────────────────────────────────────────
create table if not exists public.class_meta (
  id text primary key default 'main',
  class_name text not null,
  wali_kelas text not null,
  motto text,
  description text,
  student_count int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

-- ─── Announcements ───────────────────────────────────────
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category public.announcement_category not null default 'umum',
  event_date date,
  pinned boolean not null default false,
  author_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Kas ─────────────────────────────────────────────────
create table if not exists public.iuran (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount int not null check (target_amount > 0),
  deadline date,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type public.transaction_type not null,
  kind public.kas_kind not null default 'rutin',
  amount int not null check (amount > 0),
  note text,
  date date not null default current_date,
  iuran_id uuid references public.iuran (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- iuran_key / period_key empty string instead of null for unique
create table if not exists public.payment_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  iuran_id uuid references public.iuran (id) on delete cascade,
  iuran_key text not null default '',
  period_key text not null default '',
  paid boolean not null default false,
  amount int not null default 0,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, iuran_key, period_key)
);

create index if not exists payment_status_user_idx on public.payment_status (user_id);

-- ─── Schedule ────────────────────────────────────────────
create table if not exists public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 1 and 5),
  period int not null check (period between 1 and 12),
  subject text not null,
  teacher text,
  room text
);

-- ─── Piket ───────────────────────────────────────────────
create table if not exists public.piket_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section public.piket_section not null,
  week_offset int not null default 0,
  members text not null
);

create table if not exists public.piket_checks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.piket_groups (id) on delete cascade,
  date date not null default current_date,
  task_label text not null,
  done boolean not null default false,
  checked_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (group_id, date, task_label)
);

create table if not exists public.incident_logs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  date date not null default current_date,
  author_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ─── Galeri ──────────────────────────────────────────────
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_path text,
  event_date date,
  author_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  storage_path text not null,
  caption text,
  author_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ─── Storage bucket (public read for gallery) ────────────
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- ─── RLS enable ──────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.class_meta enable row level security;
alter table public.announcements enable row level security;
alter table public.iuran enable row level security;
alter table public.transactions enable row level security;
alter table public.payment_status enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.piket_groups enable row level security;
alter table public.piket_checks enable row level security;
alter table public.incident_logs enable row level security;
alter table public.albums enable row level security;
alter table public.photos enable row level security;

-- ─── PROFILES policies ───────────────────────────────────
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_self_or_ketua" on public.profiles;
create policy "profiles_update_self_or_ketua"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or public.has_role(array['ketua']::public.app_role[])
  )
  with check (
    -- non-ketua hanya boleh update diri sendiri & tidak ganti role orang lain
    (
      id = auth.uid()
      and role = (select role from public.profiles where id = auth.uid())
      and not public.has_role(array['ketua']::public.app_role[])
    )
    or public.has_role(array['ketua']::public.app_role[])
  );

-- ─── CLASS META ──────────────────────────────────────────
drop policy if exists "class_meta_public_read" on public.class_meta;
create policy "class_meta_public_read"
  on public.class_meta for select
  to anon, authenticated
  using (true);

drop policy if exists "class_meta_ketua_write" on public.class_meta;
create policy "class_meta_ketua_write"
  on public.class_meta for all
  to authenticated
  using (public.has_role(array['ketua','wakil','guru']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru']::public.app_role[]));

-- ─── ANNOUNCEMENTS ───────────────────────────────────────
drop policy if exists "announcements_public_read" on public.announcements;
create policy "announcements_public_read"
  on public.announcements for select
  to anon, authenticated
  using (true);

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
        and category = 'peringatan'
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
      and category = 'peringatan'
      and author_id = auth.uid()
    )
  )
  with check (
    public.has_role(array['ketua','wakil','sekretaris','guru']::public.app_role[])
    or (
      public.has_role(array['keamanan','kebersihan']::public.app_role[])
      and category = 'peringatan'
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
      and category = 'peringatan'
      and author_id = auth.uid()
    )
  );

-- ─── IURAN ───────────────────────────────────────────────
drop policy if exists "iuran_read_auth" on public.iuran;
create policy "iuran_read_auth"
  on public.iuran for select
  to authenticated
  using (true);

-- Editor kas: ketua, wakil, bendahara, guru
drop policy if exists "iuran_write_bendahara" on public.iuran;
drop policy if exists "iuran_write_editors" on public.iuran;
create policy "iuran_write_editors"
  on public.iuran for all
  to authenticated
  using (public.has_role(array['ketua','wakil','bendahara','guru']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','bendahara','guru']::public.app_role[]));

-- ─── TRANSACTIONS ────────────────────────────────────────
drop policy if exists "transactions_read_auth" on public.transactions;
create policy "transactions_read_auth"
  on public.transactions for select
  to authenticated
  using (true);

drop policy if exists "transactions_write_bendahara" on public.transactions;
drop policy if exists "transactions_write_editors" on public.transactions;
create policy "transactions_write_editors"
  on public.transactions for insert
  to authenticated
  with check (
    public.has_role(array['ketua','wakil','bendahara','guru']::public.app_role[])
    and created_by = auth.uid()
  );

drop policy if exists "transactions_delete_bendahara" on public.transactions;
drop policy if exists "transactions_delete_editors" on public.transactions;
create policy "transactions_delete_editors"
  on public.transactions for delete
  to authenticated
  using (public.has_role(array['ketua','wakil','bendahara','guru']::public.app_role[]));

-- ─── PAYMENT STATUS ──────────────────────────────────────
-- Semua auth boleh baca (transparansi rekap kelas)
drop policy if exists "payment_select_self_or_staff" on public.payment_status;
drop policy if exists "payment_select_auth" on public.payment_status;
create policy "payment_select_auth"
  on public.payment_status for select
  to authenticated
  using (true);

drop policy if exists "payment_write_bendahara" on public.payment_status;
drop policy if exists "payment_write_editors" on public.payment_status;
create policy "payment_write_editors"
  on public.payment_status for all
  to authenticated
  using (public.has_role(array['ketua','wakil','bendahara','guru']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','bendahara','guru']::public.app_role[]));

-- ─── SCHEDULE ────────────────────────────────────────────
drop policy if exists "schedule_public_read" on public.schedule_slots;
create policy "schedule_public_read"
  on public.schedule_slots for select
  to anon, authenticated
  using (true);

drop policy if exists "schedule_write_editors" on public.schedule_slots;
create policy "schedule_write_editors"
  on public.schedule_slots for all
  to authenticated
  using (public.has_role(array['ketua','wakil','guru']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru']::public.app_role[]));

-- ─── PIKET GROUPS ────────────────────────────────────────
drop policy if exists "piket_groups_public_read" on public.piket_groups;
create policy "piket_groups_public_read"
  on public.piket_groups for select
  to anon, authenticated
  using (true);

drop policy if exists "piket_groups_write" on public.piket_groups;
create policy "piket_groups_write"
  on public.piket_groups for all
  to authenticated
  using (
    (section = 'kebersihan' and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[]))
    or (section = 'keamanan' and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[]))
  )
  with check (
    (section = 'kebersihan' and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[]))
    or (section = 'keamanan' and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[]))
  );

-- ─── PIKET CHECKS ────────────────────────────────────────
drop policy if exists "piket_checks_public_read" on public.piket_checks;
create policy "piket_checks_public_read"
  on public.piket_checks for select
  to anon, authenticated
  using (true);

drop policy if exists "piket_checks_write" on public.piket_checks;
create policy "piket_checks_write"
  on public.piket_checks for all
  to authenticated
  using (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (g.section = 'kebersihan' and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[]))
          or (g.section = 'keamanan' and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[]))
        )
    )
  )
  with check (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (g.section = 'kebersihan' and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[]))
          or (g.section = 'keamanan' and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[]))
        )
    )
  );

-- ─── INCIDENTS ───────────────────────────────────────────
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

-- ─── ALBUMS / PHOTOS ─────────────────────────────────────
drop policy if exists "albums_public_read" on public.albums;
create policy "albums_public_read"
  on public.albums for select
  to anon, authenticated
  using (true);

drop policy if exists "albums_write_editors" on public.albums;
create policy "albums_write_editors"
  on public.albums for all
  to authenticated
  using (public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[]));

drop policy if exists "photos_public_read" on public.photos;
create policy "photos_public_read"
  on public.photos for select
  to anon, authenticated
  using (true);

drop policy if exists "photos_write_editors" on public.photos;
create policy "photos_write_editors"
  on public.photos for all
  to authenticated
  using (public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[]));

-- ─── STORAGE policies (gallery bucket) ───────────────────
drop policy if exists "gallery_public_read" on storage.objects;
create policy "gallery_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');

drop policy if exists "gallery_upload_editors" on storage.objects;
create policy "gallery_upload_editors"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'gallery'
    and public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[])
  );

drop policy if exists "gallery_delete_editors" on storage.objects;
create policy "gallery_delete_editors"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'gallery'
    and public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[])
  );

-- ─── Grants ──────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
