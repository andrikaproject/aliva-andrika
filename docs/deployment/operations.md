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

`TRUSTED_PROXY_HOPS` harus cocok dengan rantai proxy sebenarnya. Terlalu besar membuat batas
kirim dapat dilewati dengan header palsu; terlalu kecil membuat semua tamu berbagi satu jatah.
Nilai 0 mengabaikan header sepenuhnya dan hanya benar bila API dijangkau langsung.

`/healthz` menjalankan satu query ke SQLite, sehingga status 200 berarti database benar-benar
menjawab, bukan sekadar proses hidup.

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
