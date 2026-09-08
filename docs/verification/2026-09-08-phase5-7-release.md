# Verifikasi Fase 5–7

Tanggal pemeriksaan: 8 September 2026, Asia/Jakarta.

## Fase 5, packaging dan staging

- Branch: `refactor-aliva-andrika`.
- Kandidat: dicatat oleh full commit pada release environment VPS.
- `npm ci`, `npm run check`, `npm test`, dan `npm run build` lulus; test suite berisi 19 test.
- Staging memakai project/network/database terpisah dan hanya loopback.
- Uji browser pada mobile 390×844, tablet 768×1024, desktop 1440×900, reduced motion, dan
  no-JavaScript: HTML/aset berhasil, tidak ada error console, gambar rusak, atau overflow.
- Mobile/tablet tidak meminta bundle GSAP. Desktop meminta tiga resource GSAP.
- Musik memiliki durasi terukur sekitar 84,17 detik dan dapat dimulai dari interaksi buka.
- Uji RSVP staging menghasilkan 201, read-back berhasil, status `not_attending` dan guests 2
  tersimpan, serta percobaan kedua dibatasi 429. Record ini hanya berada di staging.
- Body terlalu besar menghasilkan 413 JSON; route API tidak berubah menjadi HTML fallback 200.
- Semua 118 file output bisa diambil; asset berhash memiliki cache immutable, HTML no-cache,
  dan endpoint guestbook no-store.
- Backup/restore SQLite staging lulus integrity check. Recreate container mempertahankan entry.
- Kandidat sebelumnya diuji dengan rollback stack lama dan data staging tetap dapat dibaca.

## Fase 6, produksi

Artefak lama disalin ke `/opt/apps/aliva/legacy/3215a01`, image API lama ditandai untuk rollback,
dan Caddyfile lama disimpan di backup sebelum cutover. Database produksi di-backup secara
konsisten sebelum route diganti. Smoke test publik hanya membaca data, tanpa POST sintetis.

## Fase 7, observasi dan serah terima

- Backup harian systemd timer dipasang pukul 03:15 WIB, dengan `Persistent=true`.
- Backup sebelum rilis tersimpan privat di VPS dan satu salinan privat di komputer operator.
- Runbook deploy, rollback, backup/restore, log, perubahan konten, dan batasan operasi ada di
  [`runbook.md`](../deployment/runbook.md).
- Pemeriksaan hari berikutnya tetap menjadi checklist operasional: HTTP/API, restart container,
  disk, volume, dan hasil backup. Retensi tujuh backup harian membutuhkan observasi lanjutan
  setelah timer berjalan selama tujuh hari; tidak dipalsukan dengan menyalin timestamp.
- Tidak ada alert eksternal dipasang karena tujuan dan otorisasi penerima belum ditentukan.
