# Runbook VPS undangan Andrika–Aliva

Runbook ini berlaku untuk host `178.83.121.82` dan domain `andrika-aliva.my.id`.
Konfigurasi deploy di `deploy/` adalah sumber yang dikomit. File `release.env` di VPS
berisi path rilis dan database, bukan rahasia aplikasi.

## Struktur layanan

- Caddy `photobooth-caddy-1` tetap memiliki port 80/443, sertifikat, dan redirect HTTPS.
- Stack `aliva` memiliki `web` untuk file statis Astro dan `api` untuk Node + SQLite.
- `web` dan `api` hanya terhubung ke network privat stack dan alias internal Caddy.
- Database produksi berada di `/opt/apps/rsvp/data/rsvp.sqlite`. Jangan menaruhnya di web root.

## Rilis kandidat

Pada komputer pengembang, dari repository wedding:

```bash
npm ci
npm run check
npm test
npm run build
git rev-parse HEAD
```

Kirim `dist/` dan konfigurasi commit yang sama ke:
`/opt/apps/aliva/releases/<full-commit>/public` dan folder release tersebut. API image
dibangun sekali pada VPS staging, lalu image dengan tag commit yang sama dipromosikan ke
stack produksi. Jangan build ulang dengan source berbeda setelah staging lulus.

## Staging

Staging memakai project `aliva-staging`, port loopback `127.0.0.1:18080`, network sendiri,
dan database restore di `/opt/apps/aliva-staging/data`. Akses dari komputer operator melalui
SSH tunnel. Kiriman RSVP staging harus diberi nama yang jelas sebagai data uji dan tidak boleh
masuk ke database produksi.

```bash
ssh -N -L 18080:127.0.0.1:18080 root@178.83.121.82
curl http://127.0.0.1:18080/
curl http://127.0.0.1:18080/api/guestbook
```

Uji minimal: HTML 200, asset berhash, `/api/guestbook` JSON, route API tidak menjadi HTML
fallback, status 413 untuk body besar, POST staging 201, GET memuat entry, recreate container
mempertahankan entry, dan backup/restore menghasilkan integrity `ok`.

## Cutover produksi

1. Buat backup konsisten dan catat id rilis lama serta baru.
2. Pastikan `docker compose ... ps` menunjukkan `web` dan `api` healthy.
3. Validasi Caddyfile dengan `docker exec photobooth-caddy-1 caddy validate`.
4. Simpan Caddyfile lama di backup. Pasang `deploy/Caddyfile.edge` sebagai konfigurasi Caddy
   host, lalu reload Caddy tanpa mengganti volume data/config Caddy.
5. Periksa `https://andrika-aliva.my.id/`, redirect HTTP, asset, font, audio, `?to=`, bahasa,
   Maps, gift copy, RSVP read, dan log. Jangan membuat POST produksi sintetis.
6. Pastikan container aplikasi photobooth, database Postgres, dan bot lain tetap berjalan.

## Rollback kode

Rollback hanya mengganti static release dan image API ke rilis lama:

```bash
cd /opt/apps/aliva
docker compose --env-file release.env -p aliva \
  -f compose.yaml -f compose.production.yaml -f compose.legacy-rollback.yaml \
  up -d --no-build --wait --wait-timeout 45
```

Database tidak dikembalikan ke snapshot lama saat rollback kode. Setelah perbaikan, kembalikan
`release.env` ke kandidat dan recreate stack. Restore database hanya untuk insiden kehilangan
data yang disetujui secara terpisah, dengan menghitung selisih record terlebih dahulu.

## Backup dan restore

Backup harian dijalankan oleh `aliva-rsvp-backup.timer` dan backup sebelum rilis dapat dijalankan:

```bash
systemctl start aliva-rsvp-backup.service
systemctl status aliva-rsvp-backup.timer
ls -l /opt/apps/rsvp/backups
```

Script memakai `VACUUM INTO`, melakukan `PRAGMA integrity_check`, menyetel mode file privat,
dan melaporkan hanya jumlah/id record serta hash isi, bukan nama atau pesan tamu. File backup
berada di luar web root. Simpan minimal tujuh backup harian dan dua rilis aplikasi; periksa
kapasitas sebelum menerapkan retensi. Salinan pada VPS yang sama bukan perlindungan dari
kehilangan VPS, sehingga salinan luar host perlu dikelola operator secara privat.

## Perubahan konten dan log

Konten undangan diubah di `src/data/wedding.ts`, `src/data/gallery.ts`, dan kamus `src/i18n/`.
Setelah perubahan, ulangi check/test/build dan lakukan staging. Log yang relevan:

```bash
docker compose --env-file /opt/apps/aliva/release.env -p aliva \
  -f /opt/apps/aliva/compose.yaml -f /opt/apps/aliva/compose.production.yaml logs --tail=100 api web
docker logs --tail=100 photobooth-caddy-1
```

Log aplikasi tidak boleh memuat isi pesan RSVP. Jika ada kebutuhan alert keluar, tujuan dan
otorisasinya harus ditentukan terlebih dahulu, bukan ditambahkan otomatis oleh runbook ini.
