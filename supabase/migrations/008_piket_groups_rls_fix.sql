-- 008: fix RLS write piket_groups / piket_checks
-- Error: "new row violates row-level security policy for table piket_groups"
--
-- Jalankan di Supabase SQL Editor (boleh diulang / idempotent).
-- Role yang boleh tulis:
--   kebersihan section → kebersihan, ketua, wakil, guru
--   keamanan section   → keamanan, ketua, wakil, guru

-- Pastikan helper ada
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

-- ─── piket_groups ───────────────────────────────────────────
drop policy if exists "piket_groups_write" on public.piket_groups;
drop policy if exists "piket_groups_insert" on public.piket_groups;
drop policy if exists "piket_groups_update" on public.piket_groups;
drop policy if exists "piket_groups_delete" on public.piket_groups;

-- Pisah per command biar INSERT (new row) jelas lewat WITH CHECK saja
create policy "piket_groups_insert"
  on public.piket_groups for insert
  to authenticated
  with check (
    (
      section = 'kebersihan'::public.piket_section
      and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[])
    )
    or (
      section = 'keamanan'::public.piket_section
      and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
    )
  );

create policy "piket_groups_update"
  on public.piket_groups for update
  to authenticated
  using (
    (
      section = 'kebersihan'::public.piket_section
      and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[])
    )
    or (
      section = 'keamanan'::public.piket_section
      and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
    )
  )
  with check (
    (
      section = 'kebersihan'::public.piket_section
      and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[])
    )
    or (
      section = 'keamanan'::public.piket_section
      and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
    )
  );

create policy "piket_groups_delete"
  on public.piket_groups for delete
  to authenticated
  using (
    (
      section = 'kebersihan'::public.piket_section
      and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[])
    )
    or (
      section = 'keamanan'::public.piket_section
      and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
    )
  );

-- ─── piket_checks ───────────────────────────────────────────
drop policy if exists "piket_checks_write" on public.piket_checks;
drop policy if exists "piket_checks_insert" on public.piket_checks;
drop policy if exists "piket_checks_update" on public.piket_checks;
drop policy if exists "piket_checks_delete" on public.piket_checks;

create policy "piket_checks_insert"
  on public.piket_checks for insert
  to authenticated
  with check (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (
            g.section = 'kebersihan'::public.piket_section
            and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[])
          )
          or (
            g.section = 'keamanan'::public.piket_section
            and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
          )
        )
    )
  );

create policy "piket_checks_update"
  on public.piket_checks for update
  to authenticated
  using (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (
            g.section = 'kebersihan'::public.piket_section
            and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[])
          )
          or (
            g.section = 'keamanan'::public.piket_section
            and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (
            g.section = 'kebersihan'::public.piket_section
            and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[])
          )
          or (
            g.section = 'keamanan'::public.piket_section
            and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
          )
        )
    )
  );

create policy "piket_checks_delete"
  on public.piket_checks for delete
  to authenticated
  using (
    exists (
      select 1 from public.piket_groups g
      where g.id = group_id
        and (
          (
            g.section = 'kebersihan'::public.piket_section
            and public.has_role(array['kebersihan','ketua','wakil','guru']::public.app_role[])
          )
          or (
            g.section = 'keamanan'::public.piket_section
            and public.has_role(array['keamanan','ketua','wakil','guru']::public.app_role[])
          )
        )
    )
  );

-- Cek cepat (opsional): role login sekarang
-- select auth.uid(), public.current_role(), public.has_role(array['ketua','wakil','guru','keamanan','kebersihan']::public.app_role[]);
