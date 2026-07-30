# X-LINES Android App Setup

## Cara Utama: Build APK via GitHub Actions (Tanpa Android Studio)

### 1. Trigger Build Otomatis
- **Push ke branch `main`** → workflow jalan otomatis
- **Manual via GitHub UI**: Buka tab **Actions** → pilih **Build Debug APK** → klik **Run workflow** → pilih branch `main` → **Run workflow**

### 2. Download APK
- Tunggu workflow selesai (biasanya 3-5 menit)
- Klik workflow run yang selesai → di bagian **Artifacts** → klik **xlines-debug-apk** → download `app-debug.apk`

### 3. Install ke HP
**Opsi A: ADB (HP colok USB, USB Debugging on)**
```bash
adb install app-debug.apk
```

**Opsi B: Transfer manual**
- Kirim `app-debug.apk` ke HP (WhatsApp/Drive/USB)
- Buka file di HP → **Install** (izinkan "Install unknown apps" jika diminta)

### 4. Test
- Buka app → langsung ke `https://x-finitys.vercel.app/login`
- Login → session tersimpan (tidak perlu login ulang saat buka app lagi)
- Back button:
  - Di dashboard → kembali halaman sebelumnya
  - Di `/login` → minimize app (keluar dari app)

---

## Opsi Alternatif: Local Build via Android Studio (Jika Install Android Studio)

> Gunakan opsi ini hanya jika Anda ingin build lokal tanpa menunggu GitHub Actions.

### Prasyarat
- Android Studio (latest) + Android SDK (API 34+)
- JDK 17 (termasuk di Android Studio)

### Langkah
```bash
# 1. Sync Capacitor
npx cap sync android

# 2. Buka di Android Studio
npx cap open android
```

Di Android Studio:
1. Tunggu **Gradle sync** selesai
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Klik **locate** → dapat `app-debug.apk` di:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
4. Install ke HP (sama seperti Opsi A/B di atas)

### Release Build (Play Store)
- **Build → Generate Signed Bundle / APK** → pilih APK
- Buat/keystore → isi alias, password → **release** build
- Output: `app-release.apk` / `app-release.aab`

---

## Konfigurasi Capacitor (Ringkasan)

File: `capacitor.config.ts`
```typescript
{
  appId: 'com.xlines.app',
  appName: 'X-LINES',
  webDir: 'out',                    // fallback only
  server: {
    url: 'https://x-finitys.vercel.app/login',  // load langsung ke login
    cleartext: false
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
}
```

### Behavior Khusus App Android
| Fitur | Behavior |
|-------|----------|
| **Entry point** | Langsung `/login` (bukan landing page publik) |
| **Session/cookies** | Persisten antar buka-tutup app (Supabase Auth) |
| **Back button** | Di `/login` → minimize app; Halaman lain → WebView history back |
| **Icon** | Hijau X-LINES (`#15803D`) |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Workflow gagal di `npm ci` | Cek `package-lock.json` committed |
| Gradle gagal | Cek `android/gradlew` executable (workflow sudah handle) |
| APK tidak muncul di Artifacts | Cek logs step "Build Debug APK" |
| App crash buka | Cek logcat: `adb logcat | grep xlines` |
| Session tidak tersimpan | Pastikan `CookieManager.setAcceptThirdPartyCookies(true)` di MainActivity |

---

## Environment Variables (Vercel)
Pastikan sudah di-set di dashboard Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-side only
```