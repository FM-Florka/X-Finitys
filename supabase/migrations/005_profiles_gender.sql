-- Tambah kolom gender (L/P) ke profiles; nis sudah ada di 001_init
-- Idempotent: aman dijalankan ulang

alter table public.profiles
  add column if not exists gender text;

do $$ begin
  alter table public.profiles
    add constraint profiles_gender_check
    check (gender is null or gender in ('L', 'P'));
exception
  when duplicate_object then null;
end $$;

comment on column public.profiles.nis is 'Nomor Induk Siswa';
comment on column public.profiles.gender is 'Jenis kelamin: L atau P';

-- Index opsional untuk lookup NIS (unique partial — hanya baris yang punya NIS)
create unique index if not exists profiles_nis_unique
  on public.profiles (nis)
  where nis is not null and btrim(nis) <> '';
