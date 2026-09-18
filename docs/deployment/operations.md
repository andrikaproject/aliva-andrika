# Menjalankan, membangun, dan merawat undangan

Repositori ini berisi satu undangan statis (Astro) dan satu API kecil (Node + SQLite).
Keduanya berjalan pada origin yang sama: `/` dan aset dilayani sebagai file statis,
`/api/guestbook` diteruskan proxy ke API.

## Prasyarat

- Node 22.12 atau lebih baru (`engines` di `package.json` menegakkan ini).
- Instalasi memakai lockfile: `npm ci`.

## Perintah

| Perintah | Guna |
| --- | --- |
| `npm run dev` | Server pengembangan Astro. `/api` diproksikan ke `http://127.0.0.1:4000`; ubah lewat `API_ORIGIN`. |
| `npm run api:dev` | Menjalankan API. Selalu berikan `DATABASE_PATH` ke berkas sementara saat pengembangan. |
| `npm run check` | Typecheck Astro dan TypeScript. |
| `npm run build` | Build produksi ke `dist/`. |
| `npm run preview` | Melayani hasil build. **Bukan** server produksi. |
| `npm test` | Tes countdown, kamus bahasa, dan integrasi API. |

Menjalankan keduanya secara lokal:

```bash
DATABASE_PATH=/tmp/rsvp-dev.sqlite npm run api:dev &
npm run dev
```

## Mengubah isi undangan

| Yang ingin diubah | Berkas |
| --- | --- |
| Nama, orang tua, tanggal, jam acara, venue, Maps, rekening, alamat hadiah | `src/data/wedding.ts` |
| Target countdown | `src/data/wedding.ts`, konstanta `countdownTarget` (wajib membawa offset `+07:00`) |
| Teks Indonesia dan Inggris | `src/i18n/id.ts` dan `src/i18n/en.ts` |
| Sapaan tamu pada tiket cover | `cover.guestGreetingPrefix` / `guestGreetingName`, dan pasangan `groupGreeting*` untuk `?type=group` |
| Daftar foto galeri dan teks alt-nya | `src/data/gallery.ts` |
| Warna, font, radius, bayangan | `src/styles/tokens.css` |
| Tata letak satu bagian | `src/components/<Bagian>.astro` dan `src/styles/sections/<bagian>.css` |

Kamus bahasa hanya berisi kalimat. Fakta acara tidak pernah diduplikasi ke sana, sehingga
tanggal atau nomor rekening tidak bisa berbeda antar bahasa. Tes `npm test` menolak kunci
yang hanya ada di satu bahasa dan menolak markup yang menyelinap ke dalam kamus.

## Menambah foto galeri

1. Letakkan berkasnya di `assets/pict/Pre-wedd-Gredding/`.
2. Tambahkan `import` dan satu entri pada `galleryPhotos` di `src/data/gallery.ts`,
   lengkap dengan teks alt Indonesia dan Inggris yang menggambarkan isi foto.
3. `npm run build`. Ukuran responsif dihasilkan otomatis; jangan menaruh foto konten di `public/`.

## Ilustrasi cover

Cover menampilkan ilustrasi pasangan di atas kartu tiket. Aturan tata letaknya:

- `#cover-screen` memegang `--cover-ticket-top` dan `--cover-ticket-lift`, yaitu posisi tiket.
- Tinggi band ilustrasi diturunkan dari kedua variabel itu, dikurangi jarak 1rem. Jadi
  ilustrasi **tidak mungkin** tertimpa kartu; kalau posisi tiket digeser, band ikut menyesuaikan.
- Ilustrasi memakai `background-size: contain` dan menempel ke bawah band, sehingga tidak pernah
  terpotong oleh tata letak.

Gambar yang dilayani adalah cut-out transparan hasil olahan dari sumber milik pasangan.
Sumbernya `assets/couple/Animated-andrika.webp` (latar putih rata); hasilnya
`assets/couple/animated-couple-cover.webp`. Untuk membuat ulang:

```bash
node tools/cut-out-cover-figure.mjs   assets/couple/Animated-andrika.webp   assets/couple/animated-couple-cover.webp 0.70
```

Argumen terakhir adalah bagian tinggi yang dipakai, dihitung dari atas. `0.70` menyisakan
kedua wajah, batik, dan pucuk buket; nilai lebih kecil memperbesar wajah tetapi membuang buket.
Skrip membanjiri alpha dari tepi gambar, bukan mengambang semua warna putih, sehingga kebaya,
orkid, dan bagian mata tetap utuh.

Pada viewport yang tingginya di bawah sekitar 660 px, tiket hampir mengisi layar dan band
ilustrasi hanya tersisa sekitar 110 px. Ilustrasi tetap utuh, hanya kecil. Memperbesarnya di
layar tersebut berarti mengurangi tinggi tiket, dan itu keputusan desain tersendiri.

## Gambar pratinjau tautan (WhatsApp, Telegram, Twitter)

Yang dikirim sebagai `og:image` adalah `assets/social/og-card.jpg`, kartu 1200x630 berisi
ilustrasi pasangan di atas kertas parchment. Untuk membuat ulang setelah ilustrasinya berubah:

```bash
node tools/build-og-card.mjs
```

Skrip memakai cut-out dari `tools/cut-out-cover-figure.mjs`, jadi tidak ada berkas perantara
yang perlu dikomit. Alasan ukurannya dipilih demikian:

- Layanan pratinjau menata kartu sekitar 1,91:1. Ilustrasi aslinya potret 1360x2228, sehingga
  kalau dikirim apa adanya akan diberi bilah blur di samping oleh Telegram.
- `CROP_FRACTION` 0,78 menyisakan wajah yang masih terbaca di daftar percakapan, sekaligus
  tetap memuat batik dan buket. Figur penuh menyusut jadi sekitar 130 px pada kartu Telegram
  nyata, terlalu kecil untuk dikenali.
- Hasilnya 55 kB, jauh di bawah batas aman layanan pratinjau.

Meta `og:image` memakai URL absolut. URL relatif membuat pratinjau tampil tanpa gambar sama
sekali, dan itulah kondisi produksi sebelum refactor.

**Setelah rilis, pratinjau lama masih tersimpan di cache** WhatsApp dan Telegram. Nama berkas
mengandung hash isi, jadi tautan baru menunjuk berkas berbeda, tetapi layanan tersebut
mencache per URL halaman. Untuk memaksa penyegaran, kirim tautan dengan query berbeda
(misalnya `?to=`, yang memang sudah dipakai per tamu) atau gunakan alat debug milik platform.

## Font hero

Hanya satu bobot Reflow Sans yang dipakai, dan yang dilayani adalah subset Latin.
Bila berkas sumbernya diperbarui, bangun ulang subsetnya:

```bash
python3 -m fontTools.subset assets/fonts/ReflowSans-Bold.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2026,U+00D7,U+2022" \
  --layout-features='*' --name-IDs='*' \
  --output-file=assets/fonts/ReflowSans-Bold-latin.ttf
```

## API

- Kontrak: `GET /api/guestbook` mengembalikan `{ entries: [...] }`,
  `POST /api/guestbook` menerima `{ name, message, attendance, guests }` dan
  mengembalikan `{ entry }` dengan status 201.
- Respons galat membawa `error` (kalimat Inggris, seperti versi lama) **dan** `code`
  yang stabil. Frontend memetakan `code` ke pesan ID/EN; `error` tetap ada agar klien lama
  tidak rusak.
- Aturan: nama wajib, pesan wajib, tamu 1–4, kehadiran `attending` atau `not_attending`.
- Batas kirim: satu kiriman per 30 detik per alamat.

### Variabel lingkungan

| Nama | Bawaan | Arti |
| --- | --- | --- |
| `PORT` | `4000` | Port dengar. |
| `DATABASE_PATH` | `/data/rsvp.sqlite` | Lokasi SQLite. Harus pada volume persisten. |
| `TRUSTED_PROXY_HOPS` | `1` | Jumlah proxy di depan API. Nilai 1 berarti entri **terakhir** pada `X-Forwarded-For` dipercaya, yaitu yang ditulis Caddy. |
| `INVITATION_ADMIN_CODE_HASH` | tidak ada | Verifier scrypt untuk kode akses dashboard privat. Wajib diisi pada deployment yang mengaktifkan `/guest-manager`; jangan menyimpan kode mentah. |

`TRUSTED_PROXY_HOPS` harus cocok dengan rantai proxy sebenarnya. Terlalu besar membuat batas
kirim dapat dilewati dengan header palsu; terlalu kecil membuat semua tamu berbagi satu jatah.
Nilai 0 mengabaikan header sepenuhnya dan hanya benar bila API dijangkau langsung.

`/healthz` menjalankan satu query ke SQLite, sehingga status 200 berarti database benar-benar
menjawab, bukan sekadar proses hidup.

### Dashboard pengelola undangan

`/guest-manager` memakai sesi cookie server dan endpoint berikut. Semua endpoint selain login,
logout, dan session memerlukan sesi yang valid.

```text
POST /api/invitation-admin/login
POST /api/invitation-admin/logout
GET  /api/invitation-admin/session
GET/POST /api/invitation-admin/guests
PATCH/DELETE /api/invitation-admin/guests/:id
GET/POST /api/invitation-admin/titles
GET /api/invitation-admin/settings
PUT /api/invitation-admin/settings/message-template
```

Data tamu memakai tabel `invitation_*` dan tidak mengubah `guestbook_entries`. Smoke test
produksi harus memakai database staging yang diberi penanda jelas. Jangan menambahkan tamu uji
atau RSVP uji ke database produksi.

### Backup

Database memakai WAL. Menyalin berkas `.sqlite` saat layanan hidup **bukan** backup yang sah.
Gunakan salinan konsisten:

```bash
sqlite3 /data/rsvp.sqlite "VACUUM INTO '/backup/rsvp-$(date +%F-%H%M).sqlite'"
sqlite3 /backup/rsvp-<stempel>.sqlite "PRAGMA integrity_check; SELECT COUNT(*) FROM guestbook_entries;"
```

Simpan backup di luar direktori publik dan di luar direktori rilis. Salinan yang tinggal di
VPS yang sama tidak melindungi dari hilangnya VPS itu sendiri.

## Build

`npm run build` menghasilkan `dist/`. Satu integrasi lokal (`tools/prune-unused-assets.mjs`)
menghapus berkas gambar di `dist/_astro/` yang tidak dirujuk HTML, CSS, atau JS mana pun.
Astro meng-emit setiap gambar yang diimpor, termasuk berkas asli 4000 px yang tidak pernah
dilayani; pemangkasan ini membuang sekitar 12 MB per build. Hanya gambar raster yang
dipangkas, sehingga referensi yang gagal dikenali paling buruk hanya memboroskan byte.

## VPS dan rilis

Runbook lengkap ada di [`runbook.md`](runbook.md). Ringkasnya, rilis dibuat lokal dari
commit branch `refactor-aliva-andrika`, dist diunggah ke `/opt/apps/aliva/releases/<commit>`,
dan stack Compose bernama `aliva` dijalankan terpisah dari aplikasi photobooth yang sudah ada.
Caddy photobooth tetap menjadi proxy TLS tunggal.

Perintah operasional di VPS:

```bash
cd /opt/apps/aliva
docker compose --env-file release.env -p aliva \
  -f compose.yaml -f compose.production.yaml ps
docker compose --env-file release.env -p aliva \
  -f compose.yaml -f compose.production.yaml logs --tail=100 api web
systemctl status aliva-rsvp-backup.timer
```

Jangan menjalankan `docker compose down -v` pada project `photobooth`, jangan melakukan
`docker system prune`, dan jangan menghapus `/opt/apps/rsvp/data` saat rollback kode.
