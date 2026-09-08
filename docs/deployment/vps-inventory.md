# Inventaris VPS — andrika-aliva.my.id

Status: **lengkap untuk rilis 8 September 2026.** Fakta host dicatat melalui SSH read-only
sebelum perubahan. Rahasia, password, dan private key tidak dicatat di repositori.

## Yang sudah terverifikasi (HTTP dan host, 8 September 2026)

| Item | Nilai | Bukti |
| --- | --- | --- |
| Domain | `andrika-aliva.my.id` | HTTP 200 |
| Protokol | HTTP/2, `alt-svc: h3=":443"` | header respons |
| Proxy | `server: Caddy` | header respons |
| TLS | aktif pada 443 | permintaan `https://` berhasil |
| Kompresi | **tidak aktif** | `content-encoding` absen meski `Accept-Encoding` dikirim |
| Cache | **tidak diatur** | `Cache-Control` absen; hanya `ETag` + `Last-Modified` |
| Rilis terlayani sebelum cutover | HTML `last-modified` 25 Agu 2026 13:40 GMT | header respons baseline |
| Versi aset sebelum cutover | query string manual (`?v=20260825-css-min`), bukan hash isi | HTML baseline |
| Rilis terlayani setelah cutover | header `X-Release: 744906ed0a0e08bbd73d605c56ac20a12cdc1424` | smoke test publik |
| Versi aset setelah cutover | nama file Astro berhash isi, cache immutable | header respons |
| Host | Ubuntu 24.04.4 LTS, Docker Engine 29.1.3, Compose 2.40.3 | SSH read-only |
| Source lama | `/var/www/aliva-andrika`, branch `deploy/vps-live-20260823`, commit `3215a01` | Git read-only |
| Source checkout setelah deploy | `/var/www/aliva-andrika`, branch `refactor-aliva-andrika`, commit `744906ed0a0e08bbd73d605c56ac20a12cdc1424` | Git read-only |
| Proxy | `photobooth-caddy-1`, Caddy 2.11.4, port host 80/443 | Docker inspect |
| API lama | `photobooth-rsvp-api-1`, internal port 4000, restart `unless-stopped` | Docker inspect |
| Database RSVP | `/opt/apps/rsvp/data/rsvp.sqlite`, bind ke `/data`, SQLite WAL | Docker inspect |
| Database sebelum cutover | 0 record; backup konsisten diuji dengan integrity check | backup + query |
| Kapasitas | filesystem 48 GB, terpakai 28 GB, tersedia 21 GB; RAM tersedia sekitar 1,9 GiB; swap 0 | `df`/`free` |
| Port API publik | tidak dipublish oleh container lama; hanya Caddy yang memegang 80/443 | Docker inspect |

Header `server: Caddy` adalah petunjuk proxy yang terlihat publik. Header ini **tidak**
membuktikan letak Caddy (host atau container), jumlah upstream, atau topologi jaringan VPS.

## Keputusan deployment yang diterapkan

- Static frontend dan API baru berada di stack Compose `aliva`, dengan network private
  `aliva_private` dan koneksi terbatas ke network Caddy `photobooth_default`.
- Caddy utama tetap menjadi satu-satunya pemilik TLS dan port 80/443. Domain diarahkan ke
  alias `aliva-web:8080` dan `aliva-api:4000`.
- Artefak frontend berada di `/opt/apps/aliva/releases/<commit>/public`; API dibangun dari
  folder `api` pada commit yang sama. Database tetap memakai `/opt/apps/rsvp/data`.
- Rilis lama disimpan di `/opt/apps/aliva/legacy/3215a01` dan image API diberi tag
  `aliva-rsvp:legacy-3215a01`.
- Backup konsisten berada di `/opt/apps/rsvp/backups` dan satu salinan privat berada di
  komputer operator. Backup rutin memakai systemd timer harian pukul 03:15 WIB.

Konfigurasi aktif sudah divalidasi setelah reload Caddy. Container photobooth, Postgres, dan
bot lain tetap berjalan; route domain wedding kini menuju alias `aliva-web` dan `aliva-api`.

## Topologi yang diterapkan

```text
Browser tamu
  https://andrika-aliva.my.id
           |
    Caddy/proxy yang aktif
           |
           +-- / dan aset ----------> aliva-web:8080, hasil build Astro (dist/)
           |
           +-- /api/guestbook ------> Node API:4000 (internal saja)
                                         |
                                         /data/rsvp.sqlite pada bind persisten
                                         |
                                     backup konsisten di luar web root dan rilis
```

Letak Caddy dan bentuk static server diputuskan dari inventaris di atas, bukan diasumsikan.
Volume database tetap terpisah dari artefak rilis agar pergantian frontend tidak menyentuh data RSVP.
