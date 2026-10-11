---
paths:
    - 'resources/**/*.{tsx,ts,css}'
---

# Resources

## Baca docs/DESIGN.md sebelum mengubah UI

WAJIB baca docs/DESIGN.md sebelum edit komponen/ halaman frontend. Token warna hanya dari resources/css/app.css, tanpa hex/warna Tailwind langsung, tanpa uppercase, ikon hanya lucide-react, border selalu 1px, tanpa shadow di button/card, tanpa gradient dan backdrop-blur. Selalu cek resources/js/components/ui/ dulu sebelum bikin komponen baru, dan refer base style shadcn di sana.

## Modul admin (tabel server-side)

Contoh canonical: `resources/js/pages/customers/index.tsx` + `app/Http/Controllers/Admin/*`.
Modul baru (mis. Kelola Kategori) wajib adaptasi pola ini, bukan bikin pola sendiri.

### Komponen reusable (`resources/js/components/`, Bahasa Indonesia)

- `search-input.tsx` — field cari + tombol X pengosong.
- `summary-cards.tsx` — kartu ringkasan angka + ikon (`SummaryCardItem[]`).
- `sort-button.tsx` — header kolom sortable. Siklus: netral → asc → desc → netral
  (default `created_at` desc).
- `data-table-pagination.tsx` — info "Menampilkan X-Y dari Z", select baris-per-halaman
  (`side="top"`), tombol pertama/sebelumnya/berikutnya/terakhir.
- `editable-field.tsx` — baris hover-copy/edit, tukar label/input, tampilkan error.
  Ikon hanya terlihat saat hover/fokus/mode edit (state React, bukan CSS saja).
- `empty-state.tsx` — ikon + judul + deskripsi + slot aksi opsional.
- `user-avatar.tsx` — avatar inisial 2 huruf + helper `getInitials`.
- `customer-form-dialog.tsx` — pola dialog tambah RHF + `zodResolver`.
- Dialog: header/footer fixed (`shrink-0`), body scroll
  (`flex-1 min-h-0 overflow-y-auto`, scrollbar tipis agar terlihat masih bisa
  di-scroll). Body scroll beri `px-1` agar focus ring input tidak terpotong.
- `delete-confirm-dialog.tsx` — tombol Hapus (pojok kiri footer) + dialog konfirmasi.
  Logika hapus disuntik per modul lewat `onConfirm`.

### Backend per modul

- Otorisasi: middleware `can:access-admin` (gate di `AppServiceProvider`).
- Validasi query inline: `search`, `status`, `per_page` (5–100), `sort_by`, `sort_dir`.
- Eager-load relasi dengan kolom terbatas, `paginate()->withQueryString()`,
  echo `filters` + `summary` (agregat global bila perlu kartu).
- Tulis (store/update) pakai FormRequest + `$errorBag` unik per form + flash toast sukses.
- Hapus pakai soft delete (`SoftDeletes`): set nonaktif + `delete()`, tersembunyi dari
  daftar tapi tetap di database. Email milik akun nonaktif/terhapus boleh dipakai
  ulang saat tambah (dipulihkan + ditimpa).
- Normalisasi/aturan enum ikut `app/Concerns/*` bila dipakai lebih dari satu request.

### Frontend per modul

- `router.get(..., { preserveState: true, replace: true, only: [...] })`,
  skeleton + bar loading saat `loading`, debounce search 500ms.
- Pesan/error Bahasa Indonesia. Lihat DESIGN.md untuk token dan larangan.
