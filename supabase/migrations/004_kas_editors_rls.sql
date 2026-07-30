-- Kas RLS: ketua / wakil / bendahara / guru
-- Jalankan SETELAH 003_kas_wakil_rls.sql sudah sukses (enum wakil committed).

-- ─── IURAN ────────────────────────────────────────────────
drop policy if exists "iuran_write_bendahara" on public.iuran;
drop policy if exists "iuran_write_editors" on public.iuran;
create policy "iuran_write_editors"
  on public.iuran for all
  to authenticated
  using (public.has_role(array['ketua','wakil','bendahara','guru']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','bendahara','guru']::public.app_role[]));

-- ─── TRANSACTIONS ─────────────────────────────────────────
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

-- ─── PAYMENT STATUS ───────────────────────────────────────
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
