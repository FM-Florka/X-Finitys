-- STEP 1/2 — tambah enum 'wakil' saja.
-- Wajib commit dulu sebelum 004 (Postgres 55P04).
-- Di Supabase SQL Editor: Run file ini, pastikan sukses, baru Run 004.

alter type public.app_role add value if not exists 'wakil';
