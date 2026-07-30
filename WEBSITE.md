# Prompt: Website Kelas

Buatkan saya sebuah website kelas yang berfungsi sebagai pusat informasi dan
administrasi kelas. Berikut spesifikasi lengkapnya:

## 1. Landing Page (Publik — tanpa login)
- Hero section: nama kelas, wali kelas, jumlah siswa, foto/identitas kelas
- Ringkasan singkat: pengumuman terbaru, jadwal piket hari ini, event
  mendatang
- Navigasi ke semua halaman publik (Galeri, Jadwal, Informasi/Kegiatan)
- Tampilan rapi dan mobile-friendly karena kemungkinan besar diakses lewat HP

## 2. Sistem Akun & Role
Gunakan sistem role-based access:

- **Publik (tanpa login)**: bisa melihat landing page, galeri, jadwal,
  informasi & update kegiatan
- **Siswa (login)**: bisa melihat data pribadi terkait dirinya (misal status
  bayar kas), tidak bisa mengedit data administratif
- **Pengurus (login, akses sesuai jabatan)**:
  - Ketua Kelas
  - Bendahara
  - Keamanan/Ketertiban
  - Kebersihan
  - Sekretaris (jika ada)
- **Guru (login)**: akses berbeda dari pengurus siswa, khusus untuk posting
  pengumuman/tugas

Setiap role pengurus hanya bisa mengedit modul yang menjadi tanggung
jawabnya, tapi bisa melihat modul lain (read-only) jika relevan.

## 3. Modul per Role

### Bendahara
- Catat pemasukan (kas rutin mingguan/bulanan per siswa) dan pengeluaran
- Catat **iuran khusus** (acara, study tour, dll) secara terpisah dari kas
  rutin — bisa buat "iuran" baru dengan nama, nominal target, dan tenggat
- Rekap status bayar per siswa (siapa sudah/belum bayar), baik untuk kas
  rutin maupun iuran khusus
- Saldo kas total (rutin + iuran) ditampilkan real-time
- Riwayat transaksi (bisa difilter per bulan/per jenis)
- Laporan sederhana yang bisa dilihat siswa (transparansi kas)

### Ketua Kelas
- Dashboard ringkasan: saldo kas, piket hari ini, pengumuman terbaru, jumlah
  siswa
- Bisa membuat/menyetujui pengumuman
- Bisa mengelola daftar pengurus (assign role ke siswa)

### Keamanan/Ketertiban
- Jadwal piket ketertiban (rotasi per kelompok/minggu)
- Checklist tugas piket (misal: kunci pintu, matikan kipas/AC/lampu)
- Log kejadian sederhana (opsional, misal barang hilang atau catatan
  ketertiban)

### Kebersihan
- Jadwal piket kebersihan (rotasi per kelompok/minggu)
- Checklist piket (status selesai/belum per hari)

### Guru
- Posting pengumuman dan tugas
- Melihat rekap kas (read-only) dan piket (read-only) jika diperlukan

## 4. Jadwal (Dipisah menjadi 2 sub-halaman)
- **Jadwal Pelajaran**: grid mingguan (Senin–Jumat x jam pelajaran), relatif
  statis, diedit oleh Ketua Kelas/Sekretaris
- **Jadwal Piket**: terpisah per seksi (Kebersihan, Keamanan), menampilkan
  kelompok/orang yang bertugas per minggu, dengan status checklist
  selesai/belum

## 5. Galeri
- Upload foto kegiatan kelas
- Dikelompokkan per album/acara (misal: "Study Tour 2026", "Class Meeting")
- Bisa dilihat publik tanpa login

## 6. Informasi & Update Kegiatan
- Feed pengumuman dan berita kelas (terbaru di atas)
- Event mendatang (dengan tanggal)
- Bisa difilter/kategori (misal: Akademik, Acara, Piket, Kas)

## 7. Catatan Tambahan
- Desain harus jelas membedakan tampilan publik vs dashboard pengurus/guru
- Prioritaskan kejelasan navigasi karena penggunanya siswa/guru yang mungkin
  awam teknologi
- Pastikan setiap role hanya bisa mengubah data sesuai kewenangannya, agar
  tidak terjadi manipulasi data (terutama untuk modul kas)
