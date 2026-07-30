-- 007a: TAMBAH enum "peringatan" SAJA
-- Harus di-COMMIT dulu sebelum dipakai di policy (007b / 008).
-- Jalankan file ini SENDIRI, lalu baru jalankan 007b.

do $$ begin
  alter type public.announcement_category add value if not exists 'peringatan';
exception
  when duplicate_object then null;
  when undefined_object then
    -- PG lama tanpa IF NOT EXISTS
    begin
      alter type public.announcement_category add value 'peringatan';
    exception when duplicate_object then null;
    end;
  when others then
    begin
      alter type public.announcement_category add value 'peringatan';
    exception when duplicate_object then null;
    end;
end $$;
