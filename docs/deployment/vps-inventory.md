# Inventaris VPS — andrika-aliva.my.id

Status: **belum lengkap.** Hanya berisi fakta yang dapat diamati dari luar melalui HTTP.
Akses SSH belum dilakukan pada sesi 8 September 2026 karena perintah `ssh vps` ditolak
pembatasan izin. Dokumen ini tidak boleh dipakai sebagai dasar perubahan produksi.

## Yang sudah terverifikasi (HTTP read-only, 8 September 2026)

| Item | Nilai | Bukti |
| --- | --- | --- |
| Domain | `andrika-aliva.my.id` | HTTP 200 |
| Protokol | HTTP/2, `alt-svc: h3=":443"` | header respons |
| Proxy | `server: Caddy` | header respons |
| TLS | aktif pada 443 | permintaan `https://` berhasil |
| Kompresi | **tidak aktif** | `content-encoding` absen meski `Accept-Encoding` dikirim |
| Cache | **tidak diatur** | `Cache-Control` absen; hanya `ETag` + `Last-Modified` |
| Rilis terlayani | HTML `last-modified` 25 Agu 2026 13:40 GMT | header respons |
| Versi aset | query string manual (`?v=20260825-css-min`), bukan hash isi | HTML produksi |

Header `server: Caddy` adalah petunjuk proxy yang terlihat publik. Header ini **tidak**
membuktikan letak Caddy (host atau container), jumlah upstream, atau topologi jaringan VPS.

## Yang masih kosong dan wajib diisi sebelum Fase 5

- [ ] OS dan versi (`/etc/os-release`); rencana mengasumsikan Ubuntu 24.04 tetapi belum diverifikasi.
- [ ] Versi Docker dan Compose; daftar container berjalan, image/tag, port publish, restart policy.
- [ ] Nama network dan volume yang benar-benar dipakai, termasuk mount database RSVP.
- [ ] Isi Caddyfile atau konfigurasi proxy yang aktif: document root statis, upstream `/api/*`, TLS.
- [ ] Apakah port API (4000) dapat dijangkau langsung dari internet.
- [ ] Kapasitas dan sisa disk; RAM dan swap (catatan sebelumnya: 2,9 GB tanpa swap).
- [ ] Lokasi source produksi yang menghasilkan `*.min.css` / `main.min.js` dan cara build-nya.
- [ ] Mekanisme rilis yang sekarang dipakai (upload manual, git pull, atau lainnya).
- [ ] Backup SQLite konsisten (`VACUUM INTO` atau online backup) + uji restore terisolasi,
      termasuk integrity check dan jumlah record. Database memakai WAL, sehingga menyalin
      file `.sqlite` saat layanan aktif bukan prosedur backup yang sah.
- [ ] Salinan artefak frontend dan konfigurasi rilis lama untuk rollback.

## Topologi target (belum diterapkan)

```text
Browser tamu
  https://andrika-aliva.my.id
           |
    Caddy/proxy yang aktif
           |
           +-- / dan aset ----------> static server: hasil build Astro (dist/)
           |
           +-- /api/guestbook ------> Node API:4000 (internal saja)
                                         |
                                     /data/rsvp.sqlite pada volume persisten
                                         |
                                     backup konsisten di luar web root
```

Letak Caddy dan bentuk static server diputuskan dari inventaris di atas, bukan diasumsikan.
Volume database tetap terpisah dari artefak rilis agar pergantian frontend tidak menyentuh data RSVP.
