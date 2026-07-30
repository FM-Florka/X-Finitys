-- Profiles update: ketua + wakil boleh assign role orang lain
-- (halaman /dashboard/pengurus + action assignRole)

drop policy if exists "profiles_update_self_or_ketua" on public.profiles;
drop policy if exists "profiles_update_self_or_leaders" on public.profiles;

create policy "profiles_update_self_or_leaders"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or public.has_role(array['ketua','wakil']::public.app_role[])
  )
  with check (
    -- non-leader: hanya update diri sendiri & tidak ganti role
    (
      id = auth.uid()
      and role = (select role from public.profiles where id = auth.uid())
      and not public.has_role(array['ketua','wakil']::public.app_role[])
    )
    -- ketua / wakil: full manage (assign role pengurus)
    or public.has_role(array['ketua','wakil']::public.app_role[])
  );
