-- Seed data (jalankan SETELAH 001_init.sql + user auth dibuat)
-- Buat user lewat Auth dashboard / script seed admin, lalu update profiles.role.
-- Contoh class meta & konten publik (bisa dijalankan service role / SQL editor):

insert into public.class_meta (id, class_name, wali_kelas, motto, description, student_count)
values (
  'main',
  'XII IPA 1 — XF Hub',
  'Bu Rani',
  'Kompak, bersih, transparan.',
  'Pusat informasi & administrasi kelas. Cek jadwal, piket, kas, dan kegiatan di sini.',
  36
)
on conflict (id) do update set
  class_name = excluded.class_name,
  wali_kelas = excluded.wali_kelas,
  motto = excluded.motto,
  description = excluded.description,
  student_count = excluded.student_count;

-- Jadwal pelajaran sample (Senin–Jumat x 8 jam)
truncate public.schedule_slots;
insert into public.schedule_slots (day_of_week, period, subject, teacher, room)
select
  d.day,
  p.period,
  (array['Matematika','Fisika','Kimia','Biologi','Bahasa Indonesia','Bahasa Inggris','Sejarah','PJOK'])[((d.day + p.period) % 8) + 1],
  (array['Pak Andi','Bu Sari','Pak Budi','Bu Rani','Bu Lestari','Mr. John','Pak Doni','Pak Riko'])[((d.day + p.period) % 8) + 1],
  'R-' || (10 + d.day)
from generate_series(1, 5) as d(day)
cross join generate_series(1, 8) as p(period);

-- Piket: 5 hari tetap × 2 seksi (bukan rotasi)
truncate public.piket_checks, public.piket_task_defs, public.piket_groups cascade;
insert into public.piket_groups (name, section, day_of_week, members, week_offset) values
  ('Senin',  'kebersihan', 1, 'Fajar, Gita, Hadi', 0),
  ('Selasa', 'kebersihan', 2, 'Indah, Alya, Bima', 0),
  ('Rabu',   'kebersihan', 3, 'Citra, Dina, Eka', 0),
  ('Kamis',  'kebersihan', 4, 'Fajar, Citra', 0),
  ('Jumat',  'kebersihan', 5, 'Gita, Hadi, Indah', 0),
  ('Senin',  'keamanan',   1, 'Citra, Eka, Fajar', 0),
  ('Selasa', 'keamanan',   2, 'Gita, Hadi', 0),
  ('Rabu',   'keamanan',   3, 'Indah, Alya', 0),
  ('Kamis',  'keamanan',   4, 'Bima, Dina, Eka', 0),
  ('Jumat',  'keamanan',   5, 'Citra, Fajar', 0);

-- Template tugas permanen (contoh di Senin tiap seksi)
insert into public.piket_task_defs (group_id, task_label, sort_order)
select g.id, t.task, t.ord
from public.piket_groups g
cross join (
  values
    ('kebersihan', 'Sapu & pel lantai', 0),
    ('kebersihan', 'Bersihkan papan tulis', 1),
    ('kebersihan', 'Buang sampah', 2),
    ('keamanan', 'Kunci pintu', 0),
    ('keamanan', 'Matikan lampu/AC', 1),
    ('keamanan', 'Cek barang tertinggal', 2)
) as t(section, task, ord)
where g.section::text = t.section and g.day_of_week = 1;

-- Checklist hari ini untuk slot hari berjalan (Sen–Jum)
insert into public.piket_checks (group_id, date, task_label, done)
select g.id, current_date, d.task_label,
  case when d.task_label like '%sampah%' or d.task_label like '%Kunci%' then false else true end
from public.piket_groups g
join public.piket_task_defs d on d.group_id = g.id
where g.day_of_week = (
  case extract(isodow from current_date)::int
    when 6 then 1 when 7 then 1
    else extract(isodow from current_date)::int
  end
);

-- Albums sample (tanpa foto storage dulu)
insert into public.albums (title, description, cover_path, event_date)
values
  ('Study Tour Prep 2026', 'Persiapan dan momen kelas.', null, current_date + 30),
  ('Class Meeting', 'Dokumentasi class meeting.', null, current_date + 14)
on conflict do nothing;
