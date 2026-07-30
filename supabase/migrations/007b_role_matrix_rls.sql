-- 007b: matriks role + RLS (pakai enum peringatan)
-- PRASYARAT: 007_add_peringatan_enum.sql sudah dijalankan & sukses (commit terpisah).
-- Error 55P04 = enum belum committed → jalankan 007 dulu, baru file ini.

-- ─── ANNOUNCEMENTS write ────────────────────────────────────
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

-- ─── SCHEDULE: ketua / wakil / guru ─────────────────────────
drop policy if exists "schedule_write_editors" on public.schedule_slots;
create policy "schedule_write_editors"
  on public.schedule_slots for all
  to authenticated
  using (public.has_role(array['ketua','wakil','guru']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru']::public.app_role[]));

-- ─── GALERI: ketua / wakil / guru / sekretaris ──────────────
drop policy if exists "albums_write_editors" on public.albums;
create policy "albums_write_editors"
  on public.albums for all
  to authenticated
  using (public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[]));

drop policy if exists "photos_write_editors" on public.photos;
create policy "photos_write_editors"
  on public.photos for all
  to authenticated
  using (public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru','sekretaris']::public.app_role[]));

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

-- ─── PIKET: + wakil + guru ──────────────────────────────────
drop policy if exists "piket_groups_write" on public.piket_groups;
drop policy if exists "piket_groups_insert" on public.piket_groups;
drop policy if exists "piket_groups_update" on public.piket_groups;
drop policy if exists "piket_groups_delete" on public.piket_groups;

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

-- ─── INCIDENTS: + wakil ─────────────────────────────────────
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

-- ─── CLASS META: + wakil + guru ─────────────────────────────
drop policy if exists "class_meta_ketua_write" on public.class_meta;
create policy "class_meta_ketua_write"
  on public.class_meta for all
  to authenticated
  using (public.has_role(array['ketua','wakil','guru']::public.app_role[]))
  with check (public.has_role(array['ketua','wakil','guru']::public.app_role[]));
