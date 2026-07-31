# X-Finitys Android App Setup

## Debug APK vs Release APK (untuk developer)

| | **Debug** | **Release (signed)** |
|---|-----------|----------------------|
| **Gradle task** | `assembleDebug` | `assembleRelease` |
| **Signing** | Otomatis **debug keystore** generik Android SDK | **Keystore project** (file `.jks` / `.keystore` milik kita) |
| **Artifact GHA** | `xlines-debug-apk` → `app-debug.apk` | `xlines-release-apk` → `app-release.apk` |
| **Install warning** | Sering “app tidak dikenal / tidak diverifikasi” lebih agresif; tiap mesin debug key beda | Masih sideload (bukan Play Store), tapi **signed konsisten** — warning lebih ringan & update install overwrite lebih stabil |
| **Kapan pakai** | Dev cepat, CI smoke, coba fitur | **Bagikan ke teman / kelas** (distribusi internal) |
| **Secrets GHA** | Tidak perlu | Wajib 4 secret (lihat bawah) |
| **Play Store** | Tidak | Masih perlu AAB + Play Console; APK release ini **bukan** upload Play otomatis |

**Catatan teknis:** Android menolak update app jika signature key beda (debug vs release, atau keystore beda). Install release di atas debug → uninstall dulu, atau sebaliknya.

---

## Cara Utama: Build APK via GitHub Actions

### 1. Trigger
- Push ke `main`, atau
- **Actions** → **Build APK** → **Run workflow**

### 2. Download
Setelah hijau:
- **Debug:** Artifacts → `xlines-debug-apk` → `app-debug.apk`
- **Release:** Artifacts → `xlines-release-apk` → `app-release.apk`  
  (hanya muncul jika secret keystore sudah di-set)

### 3. Install ke HP
**ADB**
```bash
adb install -r app-release.apk
```

**Manual:** kirim file → buka di HP → Install (izinkan unknown sources).

### 4. Test checklist
- Buka app → `https://x-finitys.vercel.app/login`
- Login → session cookie persist
- Back: dashboard = history; `/login` = minimize

---

## Setup Release Signing (sekali, manual)

Keystore **tidak** di-commit. Hanya GitHub Secrets + backup lokal aman.

### A. Generate keystore (`keytool`, JDK)

PowerShell / CMD (path `keytool` dari JDK 17/21):

```bash
keytool -genkeypair -v ^
  -keystore xlines-release.jks ^
  -alias xlines ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity 10000 ^
  -storetype JKS
```

Bash / Git Bash:

```bash
keytool -genkeypair -v \
  -keystore xlines-release.jks \
  -alias xlines \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storetype JKS
```

Prompt yang diisi (boleh sederhana — **bukan** Play Store formal):

| Field | Contoh |
|-------|--------|
| Keystore password | password kuat, **ingat** → jadi `ANDROID_KEYSTORE_PASSWORD` |
| Re-enter | sama |
| What is your first and last name? | `X-LINES` |
| Organizational unit | `X F` |
| Organization | `SMAN 11 Pontianak` |
| City | `Pontianak` |
| State | `Kalimantan Barat` |
| Country code | `ID` |
| Confirm | `yes` |
| Key password for `<xlines>` | Enter = **sama** store password, atau beda → `ANDROID_KEY_PASSWORD` |

Simpan file `xlines-release.jks` di folder **luar repo** (backup Drive offline / password manager).  
**Alias default di doc:** `xlines` → secret `ANDROID_KEY_ALIAS`.

### B. Encode keystore → Base64 (untuk Secret teks)

**PowerShell:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("E:\path\to\xlines-release.jks")) | Set-Clipboard
# atau tulis file:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("E:\path\to\xlines-release.jks")) | Out-File -Encoding ascii xlines-release.jks.b64
```

**Git Bash / Linux / macOS:**
```bash
base64 -w 0 xlines-release.jks > xlines-release.jks.b64
# macOS: base64 -i xlines-release.jks -o xlines-release.jks.b64
```

Copy **seluruh** string base64 (satu baris) ke secret. Hapus file `.b64` lokal setelah secret tersimpan jika tidak perlu.

### C. GitHub Secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Isi |
|------|-----|
| `ANDROID_KEYSTORE_BASE64` | Seluruh string base64 dari `.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Password keystore |
| `ANDROID_KEY_ALIAS` | Alias key (contoh: `xlines`) |
| `ANDROID_KEY_PASSWORD` | Password key (sering sama store password) |

Workflow decode secret → file temp di runner → `assembleRelease` lewat env → upload artifact → **hapus** file keystore.  
Password/keystore **tidak** di-echo ke log. File `*.jks` / `*.keystore` di-gitignore.

Tanpa secret: job tetap build **debug**; step release di-skip.

### D. Verifikasi setelah secret di-set
1. Push kecil ke `main` atau **Run workflow**
2. Cek log: “Keystore decoded OK”, `assembleRelease` sukses
3. Artifact `xlines-release-apk` ada
4. Install di HP; idealnya warning lebih “jinak” vs debug generik

---

## Local build (opsional)

### Prasyarat
Android Studio + SDK API 34+, JDK 17/21

```bash
npx cap sync android
npx cap open android
```

- Debug: **Build → Build APK(s)** → `android/app/build/outputs/apk/debug/app-debug.apk`
- Release signed di IDE: **Build → Generate Signed Bundle / APK** + keystore yang sama

**CLI release lokal** (env, jangan commit):

```bash
# Windows PowerShell
$env:ANDROID_KEYSTORE_PATH = "E:\secure\xlines-release.jks"
$env:ANDROID_KEYSTORE_PASSWORD = "..."
$env:ANDROID_KEY_ALIAS = "xlines"
$env:ANDROID_KEY_PASSWORD = "..."
cd android
.\gradlew assembleRelease --no-daemon
# output: app/build/outputs/apk/release/app-release.apk
```

`android/app/build.gradle` baca env di atas hanya jika `ANDROID_KEYSTORE_PATH` ter-set.

---

## Konfigurasi Capacitor (ringkas)

`capacitor.config.ts`: `appId` `com.xlines.app`, server URL login Vercel, cookie/WebView di `MainActivity` lewat `getBridge().getWebView()`.

| Fitur | Behavior |
|-------|----------|
| Entry | Langsung `/login` |
| Session | Cookie third-party accept + persist |
| Back | `/login` minimize; else WebView back |
| Icon | Hijau X-LINES |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Release step skip | Secret `ANDROID_KEYSTORE_BASE64` belum di-set / kosong |
| `assembleRelease` fail signing | Alias / password salah; re-encode base64 (tanpa newline aneh) |
| “App not installed” update | Signature beda → uninstall dulu |
| `npm ci` fail | `package-lock.json` committed |
| Session hilang | `MainActivity` cookie + `getBridge().getWebView()` |

---

## Env Vercel (web, bukan APK)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server only
```
