# X-Finitys — project context for agents

**Baca file ini dulu** sebelum eksplorasi codebase atau ubah fitur.  
Jangan re-discover dari nol apa yang sudah terdokumentasi di sini.

@AGENTS.md

---

## 1. Ringkasan project

| | |
|---|---|
| **Nama** | **X-Finitys** (brand UI: X-Finitys; logo `public/icon.png`) |
| **Konteks** | Website kelas **10 F / X F**, **SMAN 11 Pontianak** — pusat info + administrasi kelas |
| **Stack** | **Next.js 16** (App Router, React 19) + **Supabase** (Postgres, Auth, Storage, **RLS**) + Tailwind 4 |
| **Package** | `xf-hub` (`package.json`) |
| **Deploy** | **Vercel** (env: Supabase URL + keys) |
| **Bahasa UI** | Indonesia |

### Area app

| Area | Path | Auth |
|------|------|------|
| Auth | `/login` | Guest (satu-satunya route terbuka) |
| Root | `/` | Redirect → `/login` (guest) / `/dashboard` (login) |
| Internal | `/jadwal`, `/informasi`, `/galeri`, `/galeri/[id]` | **Login wajib** |
| Dashboard | `/dashboard/*` | Login wajib + guard role |

**Tidak ada landing page publik.** Sejak `013_require_login_revoke_anon.sql`,
role `anon` tidak punya SELECT di schema `public` — semua data kelas
authenticated-only. Storage bucket `gallery` tetap public read (dibutuhkan
`<img src>`; daftar album/foto sendiri sudah di balik login).

Spesifikasi produk awal: `WEBSITE.md` (boleh partial outdated vs kode).

---

## 2. Struktur role & permission

### Role di DB (`profiles.role` / enum `app_role`)

| Nilai DB | Label UI | Catatan |
|----------|----------|---------|
| `guru` | **Wali Kelas** | Bukan “guru mapel generik” di label |
| `ketua` | Ketua Kelas | |
| `wakil` | Wakil Ketua | |
| `bendahara` | Bendahara | |
| `sekretaris` | Sekretaris | |
| `keamanan` | Keamanan | |
| `kebersihan` | Kebersihan | |
| `siswa` | Siswa | |

### Matriks akses (dashboard modul)

Path di bawah = **route app** (prefix `/dashboard/...`). `/jadwal`, `/informasi`, `/galeri` bisa dibuka **semua role yang sudah login** (read-only), bukan guest.

| Role | View modul | Edit / tulis |
|------|------------|--------------|
| **Wali (`guru`), Ketua, Wakil** | **Semua** (kas, pengumuman, pengurus, jadwal, galeri, piket kebersihan, **keamanan**/log) | **Semua** |
| **Bendahara** | kas, pengumuman, galeri | **kas** saja |
| **Sekretaris** | pengumuman, galeri | pengumuman, galeri |
| **Keamanan** | **keamanan** (log internal), pengumuman, galeri | **keamanan**; **pengumuman hanya kategori `peringatan`** |
| **Kebersihan** | piket-kebersihan, pengumuman, galeri | piket-kebersihan; **pengumuman hanya `peringatan`** |
| **Siswa** | Hanya ringkasan `/dashboard` + `/dashboard/saya` | — |
| **Publik / guest** | **Tidak ada** — hanya `/login` | — |

**Jadwal:**

- **Edit:** `/dashboard/jadwal` — hanya Wali / Ketua / Wakil (`canEdit(..., "jadwal")`).
- **Preview:** `/jadwal` — semua role yang login, **tanpa** tombol ubah/tambah (kecuali link “Mode edit” jika user editor).

**Pengumuman kategori `peringatan`:**

- Dibuat keamanan/kebersihan (atau full editor).
- Field: nama siswa, keterangan pelanggaran, tanggal kejadian opsional.
- UI tegas (danger / warning icon), filter di `/dashboard/pengumuman` & `/informasi`.

### Di mana logic permission diimplementasikan

**Ubah role → edit file-file ini (berlapis, jangan client-only):**

| Lapisan | File | Fungsi |
|---------|------|--------|
| **Source of truth matrix** | `src/lib/roles.ts` | `VIEW_ACCESS`, `EDIT_ACCESS`, `canView` / `canEdit`, `canCreatePeringatan`, `canAccessPengumuman`, `moduleForDashboardPath`, `dashboardHome`, `ROLE_LABEL` |
| **Server guards** | `src/lib/auth-helpers.ts` | `requireProfile`, `requireView`, `requireEdit`, `requirePengumumanWrite` |
| **Middleware route** | `src/middleware.ts` → `src/lib/supabase/middleware.ts` | Session refresh; guest → `/login`; role tanpa akses modul → `dashboardHome(role)` |
| **Nav UI** | `src/components/layout/DashboardShell.tsx` | Item nav per `canView` / `canAccessPengumuman` |
| **Server actions** | `src/app/actions/*.ts` | `requireEdit` / `requirePengumumanWrite` sebelum mutate |
| **Types kategori** | `src/lib/types.ts`, `src/lib/announcements.ts` | `AnnouncementCategory` incl. `peringatan` |
| **RLS (wajib)** | `supabase/migrations/*.sql` | Policy `has_role(...)` per tabel — **otorisasi final di DB** |

**Aturan:** cek di client/middleware/UI **boleh** untuk UX, tapi **wajib** mirror di **RLS**. Jangan andalkan hide tombol saja.

---

## 3. Skema database (ringkasan)

Folder: **`supabase/migrations/`**.  
Apply lewat **Supabase SQL Editor** (urutan di bawah). Tidak ada CLI migrate otomatis di script npm.

### Urutan migration

| File | Isi |
|------|-----|
| `001_init.sql` | Schema + enum + RLS baseline (boleh di-sync manual dengan matriks terbaru) |
| `002_profiles_bootstrap.sql` | Insert self + RPC `ensure_own_profile` |
| `003_kas_wakil_rls.sql` | Kas + role wakil (historis) |
| `004_kas_editors_rls.sql` | Editor kas: ketua/wakil/bendahara/guru |
| `005_profiles_gender.sql` | Kolom `gender` |
| `006_profiles_wakil_rls.sql` | Update profiles: ketua+wakil assign role |
| `007_add_peringatan_enum.sql` | **Hanya** `ALTER TYPE ... ADD VALUE 'peringatan'` — **harus commit sendiri** |
| `007b_role_matrix_rls.sql` | RLS matriks role + announcements peringatan + piket/schedule/galeri |
| `007_role_matrix_peringatan.sql` | **Jangan jalankan utuh** — penunjuk (error 55P04 jika digabung enum+policy) |
| `008_piket_groups_rls_fix.sql` | Fix RLS insert/update/delete `piket_groups` / `piket_checks` |
| `009_add_tugas_enum.sql` | **Hanya** `ALTER TYPE ... ADD VALUE 'tugas'` — commit sendiri |
| `009b_tugas_schema_rls.sql` | Kolom `subject`, tabel `task_submissions` + RLS (setelah 009) |
| `010_schedule_unique_day_period.sql` | Unique `(day_of_week, period)` + dedup slot bentrok |
| `011_piket_fixed_days.sql` | Piket fixed Senin–Jumat (`day_of_week`), bukan rotasi; `piket_task_defs` + RLS |
| `012_incident_log_fields.sql` | Log keamanan: `student_name`, `occurred_at` + RLS internal (bukan publik) |
| `013_require_login_revoke_anon.sql` | **Semua wajib login**: policy read `anon` → `authenticated`, revoke grant anon (bucket `gallery` tetap public read) |

**Penting Postgres:** nilai enum baru **tidak boleh** dipakai di policy dalam transaksi yang sama → selalu **007 enum dulu**, commit, baru **007b**; sama untuk **009 → 009b**.

### Helper SQL

- `public.current_role()` → role user login  
- `public.has_role(app_role[])` → boolean (security definer)  
- `public.ensure_own_profile()` → bootstrap baris `profiles`

### Tabel utama

| Tabel | Kolom penting | Relasi / catatan |
|-------|---------------|------------------|
| **profiles** | `id` (= auth.users), `email`, `name`, `role`, `nis`, `gender`, timestamps | 1:1 auth |
| **class_meta** | `id` (`main`), `class_name`, `wali_kelas`, `motto`, `description`, `student_count` | Meta landing |
| **announcements** | `title`, `body`, `category` (akademik/acara/piket/kas/umum/**peringatan**/**tugas**), `event_date` (deadline utk tugas), `subject` (mapel tugas), `pinned`, `author_id` | Feed + dashboard |
| **task_submissions** | `announcement_id`, `user_id`, `submitted`, `submitted_at` | Status kumpul per siswa per tugas (final; siswa insert-only) |
| **iuran** | `name`, `target_amount`, `deadline`, `active` | Kas iuran khusus |
| **transactions** | `type` pemasukan/pengeluaran, `kind` rutin/iuran/lain, `amount`, `date`, `iuran_id`, `created_by` | Kas |
| **payment_status** | `user_id`, `iuran_id`, `iuran_key`, `period_key`, `paid`, `amount` | Status bayar per siswa/period |
| **schedule_slots** | `day_of_week` 1–5, `period`, `subject`, `teacher`, `room` · **unique (day, period)** | Jadwal pelajaran (1 mapel/sel) |
| **piket_groups** | `name` (label hari), `section` kebersihan (utama), `day_of_week` 1–5, `members` · **unique (section, day)** | Regu **tetap** piket kebersihan per hari |
| **piket_task_defs** | `group_id`, `task_label`, `sort_order` · unique (group, label) | Template tugas permanen per hari |
| **piket_checks** | `group_id`, `date`, `task_label`, `done`, `checked_by` | Status selesai **per tanggal** (template di defs) |
| **incident_logs** | `title`, `description`, `student_name?`, `occurred_at`, `date`, `author_id` | Log **Keamanan** internal (RLS; bukan feed publik) |
| **albums** / **photos** | album meta + `storage_path` di bucket **`gallery`** | Galeri publik |

Storage bucket: **`gallery`** (public read; upload editor).

Seed SQL opsional: `supabase/seed.sql`. User Auth: script Node di `scripts/`.

---

## 4. Konsep desain

- **Tema:** Vercel-like **light** — monokrom putih / abu / hitam; **hijau = satu-satunya aksen** (CSS vars: `--accent`, dll.).
- **Border** tipis ~1px; **radius** kecil–menengah; **hindari** gradient kencang, gloss, shadow tebal.
- **Dashboard layout:** bento **asimetris** — 1 elemen hero + side metrics, bukan grid seragam.
- Komponen UI: `src/components/ui/*` (Button, Card, Badge, Modal, Input, Select, …).
- Ikon: `lucide-react`.
- Gaya form “flat”: border + `muted-bg`, fokus ring aksen tipis.

---

## 5. Konvensi kode

### Supabase clients

| File | Dipakai |
|------|---------|
| `src/lib/supabase/client.ts` | Browser / client components |
| `src/lib/supabase/server.ts` | Server components, server actions |
| `src/lib/supabase/middleware.ts` | Edge middleware session + route guard |
| `src/lib/supabase/admin.ts` | Service role (server-only scripts / admin) |

Entry middleware: `src/middleware.ts`.

### Env

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # anon / publishable
SUPABASE_SERVICE_ROLE_KEY=              # SERVER ONLY — seed/admin, NEVER NEXT_PUBLIC_
```

Contoh: `.env.example`.

### Pola app

- **Server Actions** di `src/app/actions/` (`"use server"`).
- Dashboard pages: `src/app/dashboard/<modul>/`.
- Root: `src/app/page.tsx` (redirect → `/login`). Read-only internal: `jadwal`, `informasi`, `galeri`.
- Types: `src/lib/types.ts`. Utils: `src/lib/utils.ts`. Kas helpers: `src/lib/kas.ts`.
- Next 16: baca `node_modules/next/dist/docs/` jika API tidak familiar (`AGENTS.md`).

### Otorisasi

1. Update `roles.ts`  
2. Guard page/action  
3. **RLS migration baru** (jangan only middleware)  
4. Nav `DashboardShell` jika perlu  

---

## 6. Command penting

```bash
npm run dev              # Next dev server
npm run build            # production build
npm run start            # serve build
npm run lint             # eslint

npm run db:seed-users    # scripts/seed-users.mjs (butuh SERVICE_ROLE)
npm run db:seed-siswa    # scripts/seed-siswa.mjs — 36 siswa X F
```

**Migration:** tidak ada `npm run migrate`. Copy-paste SQL ke Supabase SQL Editor berurutan.

Script lain di `scripts/`: `cleanup-xf-local.mjs`, `verify-*.mjs`, `apply-006-wakil-rls.mjs`.

---

## 7. Status fitur (checklist)

### Selesai (implementasi kode)

- [x] Root `/` redirect → `/login` (landing publik dihapus; semua wajib login)
- [x] Auth login Supabase + bootstrap profile
- [x] Dashboard ringkasan + Data saya (status bayar)
- [x] Modul **Kas** (iuran, transaksi, payment status, role editor)
- [x] Modul **Pengumuman** (CRUD editor + kategori incl. **Peringatan**)
- [x] Modul **Pengurus** (assign role — ketua/wakil)
- [x] **Piket kebersihan** (5 hari tetap, template tugas, checklist harian, shortcut peringatan)
- [x] **Keamanan** (`/dashboard/keamanan`) — log kejadian internal + shortcut peringatan (bukan grid 5 hari)
- [x] **Jadwal** grid mingguan (preview `/jadwal` + edit `/dashboard/jadwal`, unique hari+jam, klik-sel)
- [x] **Galeri** (login) + kelola album/foto (storage)
- [x] **Informasi** (login) + filter kategori
- [x] Matriks role view/edit + middleware guard + helpers
- [x] Kategori pengumuman **peringatan** (form siswa + UI tegas)
- [x] Kategori pengumuman **tugas** (deadline, mapel, status kumpul per siswa, final)
- [x] Seed siswa format email `@xfinitys.my.id`
- [x] Script cleanup akun demo `@xf.local`

### Perhatian / follow-up ops

- [ ] Pastikan migration `007`→`011` + **`012_incident_log_fields`** + **`013_require_login_revoke_anon`** sudah di-run di Supabase
- [ ] Verifikasi end-to-end per role (kas, piket kebersihan, log keamanan, peringatan, jadwal) di environment live
- [ ] Deploy Vercel + env production terset lengkap
- [ ] Typecheck: ada error pre-existing di `src/app/actions/pengurus.ts` (Promise builder Supabase) — perbaiki jika menyentuh file itu
- [ ] README default create-next-app masih generik — opsional diganti

### Belum / di luar scope saat ini

- [ ] Dark mode
- [ ] Notifikasi push / email
- [ ] Mobile app native
- [ ] Multi-kelas / multi-tenant

---

## 8. Catatan penting

1. **Jangan expose** `SUPABASE_SERVICE_ROLE_KEY` ke client / `NEXT_PUBLIC_*`.
2. Akun demo **`@xf.local`** harus dihapus / tidak dipakai; gunakan siswa asli.
3. **~36 siswa** kelas X F di-seed; email pola **`<namapendek>@xfinitys.my.id`**.
4. Role **Wali Kelas** di kode = **`guru`**.
5. Enum Postgres baru: **commit terpisah** sebelum policy (hindari `55P04`).
6. Insert `piket_groups` gagal RLS → jalankan `008_piket_groups_rls_fix.sql` (dan pastikan role profil benar).
7. Otorisasi **final di RLS**; app guard hanya lapisan depan.
8. Saat ubah permission: sinkronkan **`roles.ts` + migration RLS + actions`**.
9. Next.js di repo ini **bukan** mental model Next 13 lama — lihat `AGENTS.md` + docs di `node_modules/next/dist/docs/`.

---

## Peta file cepat

```
src/
  app/
    page.tsx, jadwal/, informasi/, galeri/, login/
    dashboard/          # kas, pengumuman, pengurus, jadwal, galeri, piket/kebersihan, keamanan, saya
    actions/            # server mutations (piket.ts, keamanan.ts, …)
  components/layout/    # DashboardShell, PublicShell, PublicNav
  components/piket/     # PiketBoard (kebersihan)
  components/ui/
  lib/
    roles.ts, auth-helpers.ts, types.ts, announcements.ts, kas.ts, piket.ts, utils.ts
    supabase/           # client, server, middleware, admin
  middleware.ts
supabase/migrations/    # 001 … 012
scripts/                # seed & cleanup
```

**Sesi baru:** baca `CLAUDE.md` → cek `roles.ts` / migration terkait fitur → baru edit. Jangan full re-explore kecuali area belum terdokumentasi.
