-- Bootstrap profil: insert self + RPC security definer
-- Jalankan di Supabase SQL Editor (setelah 001_init.sql)

-- 1) Policy: user boleh insert baris sendiri
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- 2) RPC: buat/isi profil sendiri (bypass RLS lewat security definer)
create or replace function public.ensure_own_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  u auth.users%rowtype;
  p public.profiles%rowtype;
  meta_name text;
  meta_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into u from auth.users where id = auth.uid();
  if not found then
    raise exception 'auth user missing';
  end if;

  meta_name := coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(coalesce(u.email, 'user'), '@', 1)
  );

  begin
    meta_role := coalesce(
      (u.raw_user_meta_data->>'role')::public.app_role,
      'siswa'::public.app_role
    );
  exception when others then
    meta_role := 'siswa'::public.app_role;
  end;

  insert into public.profiles (id, email, name, role)
  values (
    u.id,
    coalesce(u.email, u.id::text || '@unknown.local'),
    meta_name,
    meta_role
  )
  on conflict (id) do update set
    email = excluded.email,
    -- jangan overwrite name/role kalau sudah diisi admin
    name = coalesce(nullif(public.profiles.name, ''), excluded.name),
    updated_at = now()
  returning * into p;

  -- kalau on conflict + no change still return row
  if p.id is null then
    select * into p from public.profiles where id = u.id;
  end if;

  return p;
end;
$$;

revoke all on function public.ensure_own_profile() from public;
grant execute on function public.ensure_own_profile() to authenticated;
