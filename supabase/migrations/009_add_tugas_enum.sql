-- 009a: TAMBAH enum "tugas" SAJA
-- Harus di-COMMIT dulu sebelum dipakai di policy / CHECK (009b).
-- Jalankan file ini SENDIRI, lalu baru jalankan 009b_tugas_schema_rls.sql.

do $$ begin
  alter type public.announcement_category add value if not exists 'tugas';
exception
  when duplicate_object then null;
  when undefined_object then
    begin
      alter type public.announcement_category add value 'tugas';
    exception when duplicate_object then null;
    end;
  when others then
    begin
      alter type public.announcement_category add value 'tugas';
    exception when duplicate_object then null;
    end;
end $$;
