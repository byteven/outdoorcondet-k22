# Test Case — CU-03: Rental Range (Pencarian Tanggal & Katalog)

> **Modul:** CU-03 Rental Range  
> **Referensi PRD:** Section 2 (Aturan Bisnis Inti), Section 6.1 (CU-03)  
> **Versi PRD:** 3.1 FINAL  
> **Penyusun:** Vio Salman  
> **Tanggal:** 2026-11-07  

---

Pengujian modul Rental Range menggunakan metode Equivalence Partitioning (EP) untuk memvalidasi partisi tanggal yang valid/tidak valid, Boundary Value Analysis (BVA) untuk batas durasi minimum satu hari, serta Use Case Testing untuk alur pencarian katalog end-to-end. Total 11 test case mencakup validasi date picker, rentang tanggal, dan persistensi data antar halaman.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- Halaman landing (`/`, route `home`) memuat hero, komponen `RentalRange`, dan section **"Katalog Peralatan"** (deferred prop `catalog`).
- Komponen `RentalRange` memiliki dua field: **"Tanggal Ambil"** dan **"Tanggal Kembali"**, dengan tombol **"Cek"**. Field kembali berstatus disabled sampai tanggal ambil dipilih.
- Tanggal ambil memakai kalender `mode="single"`; tanggal kembali memakai `mode="range"`. Tanggal sebelum hari ini (`startOfToday()`) disabled.
- Pengambilan selalu pukul **18:00–23:59**; mulai hitung = **tanggal ambil + 1**; durasi = `end_date − (start_date + 1) + 1` (inklusif).
- Setelah rentang lengkap dipilih, pencarian otomatis berjalan **500 ms** kemudian (`AUTO_SEARCH_DELAY`). Tombol **"Cek"** memicu pencarian langsung; jika tanggal belum lengkap, field tanggal ditandai error dan tidak ada request.
- Ringkasan durasi tampil sebagai badge **"{n} Hari"** dan teks **"Kembali maks. {tanggal} 23:59"**.
- Tanggal aktif disimpan di `localStorage` (`useActiveRental`) agar tetap terbawa antar halaman dan saat reload.
- Filter katalog dikirim sebagai query string: `tab`, `search`, `category`, `page`, `per_page`, `pickup_date`, `return_date`.
- Tab **"Alat"** (default) dan **"Paket"**. Mengganti tab mereset `search`, `category`, dan `page` ke 1.
- Pencarian memakai debounce **500 ms**; input memiliki aria-label **"Cari alat"** / **"Cari Paket"** dan placeholder **"Cari alat..."** / **"Cari Paket..."**.
- Filter kategori hanya tampil pada tab Alat dan hanya jika ada kategori berisi produk aktif bervarian aktif. Pill kategori aktif menampilkan ikon `X`; klik ulang menghapus filter.
- Tombol **"Lihat semua"** membuka dialog **"Pilih kategori"**.
- Pagination server-side: default **24** item/halaman, opsi **24** dan **48**, nilai `per_page` di-clamp ke rentang 24–48. Label: **"Menampilkan {from}-{to} dari {total} {itemLabel}"** dan **"Halaman {current} dari {last}"**.
- Ketersediaan hanya dihitung bila `pickup_date` dan `return_date` sama-sama ada. Kartu dengan stok 0 diberi label **"Tidak Tersedia"**, grayscale, dan tidak dapat diklik.
- Paket memakai ketersediaan minimum dari komponennya (`availablePackageStock`).

---

## Metode Teknik yang Digunakan

| Teknik | Penerapan pada Modul CU-03 |
|---|---|
| Equivalence Partitioning (EP) | Kelas tanggal valid/tidak valid (tanggal lampau, durasi tidak valid). |
| Boundary Value Analysis (BVA) | Durasi minimum 1 hari, tanggal ambil sama dengan tanggal kembali. |
| Use Case Testing | Alur memilih rentang tanggal lengkap dan persistensi antar halaman. |

---

## Rental Range (Date Picker)

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.RNG.001 | TC.RNG.001.001 | Vio | Halaman landing tampil lengkap | Positive | Customer membuka halaman utama | Tidak perlu login | 1. | Buka `/` | Hero, komponen Rental Range ("Tanggal Ambil", "Tanggal Kembali", tombol "Cek"), dan section "Katalog Peralatan" tampil; tab "Alat" aktif |  |  |
| TC.RNG.001 | TC.RNG.001.002 | Vio | Memilih tanggal ambil mengaktifkan tanggal kembali | Positive | Customer memilih tanggal ambil lebih dulu | Berada di halaman landing | 1. | Klik field "Tanggal Ambil" | Kalender popover terbuka; tanggal sebelum hari ini disabled |  |  |
|  |  |  |  |  |  |  | 2. | Pilih tanggal D (hari ini atau setelahnya) | Field menampilkan tanggal D; field "Tanggal Kembali" menjadi aktif; helper menampilkan "Mulai dihitung {D+1}" |  |  |
| TC.RNG.001 | TC.RNG.001.003 | Vio | Rentang lengkap memicu pencarian otomatis | Positive | Customer memilih tanggal kembali | Tanggal ambil sudah dipilih | 1. | Klik field "Tanggal Kembali" | Kalender rentang terbuka |  |  |
|  |  |  |  |  |  |  | 2. | Pilih tanggal kembali yang valid | Setelah ±500 ms katalog dimuat ulang dengan query `pickup_date` dan `return_date`; badge "{n} Hari" dan teks "Kembali maks. {tanggal} 23:59" tampil |  |  |
| TC.RNG.001 | TC.RNG.001.004 | Vio | Tombol "Cek" dengan rentang lengkap | Positive | Customer memakai pencarian manual | Tanggal ambil dan kembali sudah dipilih | 1. | Klik tombol "Cek" | Katalog dimuat ulang memakai rentang terpilih; halaman scroll ke section katalog; tidak muncul error tanggal |  |  |
| TC.RNG.001 | TC.RNG.001.005 | Vio | Tombol "Cek" tanpa tanggal | Negative | Customer menekan Cek tanpa memilih tanggal | Field tanggal masih kosong | 1. | Klik tombol "Cek" | Tidak ada request katalog; teks "Pilih tanggal" pada kedua field berubah menjadi warna error; katalog tidak berubah |  |  |
| TC.RNG.001 | TC.RNG.001.006 | Vio | Tanggal kembali sebelum mulai hitung ditolak | Negative | Customer memilih tanggal kembali yang terlalu awal | Tanggal ambil D sudah dipilih | 1. | Klik "Tanggal Kembali" lalu pilih tanggal D (tanggal yang sama) | Segmen tanggal kembali tidak terbentuk (tetap kosong); auto-search tidak berjalan; durasi tidak dihitung |  |  |
| TC.RNG.001 | TC.RNG.001.007 | Vio | Durasi minimum satu hari | Positive | Customer menyewa tepat satu hari | Tanggal ambil D dipilih | 1. | Pilih tanggal kembali D+1 | Badge menampilkan "1 Hari"; mulai hitung D+1; batas kembali 23:59 pada D+1 |  |  |
| TC.RNG.001 | TC.RNG.001.008 | Vio | Tanggal lampau tidak dapat dipilih | Negative | Customer mencoba memilih tanggal kemarin | Berada di halaman landing | 1. | Buka kalender "Tanggal Ambil" | Tanggal sebelum hari ini tampil disabled dan tidak dapat diklik; tanggal hari ini dapat dipilih |  |  |
| TC.RNG.001 | TC.RNG.001.009 | Vio | Hapus tanggal ambil mereset seluruh rentang | Positive | Customer membatalkan pilihan tanggal | Rentang tanggal sudah terisi | 1. | Klik ikon `X` dengan aria-label "Hapus tanggal ambil" | Kedua field kembali "Pilih tanggal"; katalog dimuat ulang tanpa parameter tanggal; badge durasi hilang |  |  |
| TC.RNG.001 | TC.RNG.001.010 | Vio | Hapus tanggal kembali mempertahankan tanggal ambil | Positive | Customer hanya membatalkan tanggal kembali | Rentang tanggal sudah terisi | 1. | Klik ikon `X` dengan aria-label "Hapus tanggal kembali" | Tanggal ambil tetap; field kembali kosong; katalog dimuat ulang tanpa rentang lengkap; badge durasi hilang |  |  |
| TC.RNG.001 | TC.RNG.001.011 | Vio | Rentang tanggal bertahan antar halaman | Positive | Customer berpindah halaman lalu kembali | Rentang tanggal sudah dipilih | 1. | Buka detail produk lalu kembali ke landing (atau reload landing) | Tanggal ambil/kembali terisi kembali dari `localStorage`; ketersediaan katalog dihitung memakai rentang tersebut |  |  |
---

## Ringkasan Eksekusi

| Kategori | Jumlah |
|---|---|
| Total test case | 11 |
| Positive | 8 |
| Negative | 3 |
| Belum dieksekusi | 11 |
| Pass | 0 |
| Fail | 0 |

> **Catatan otomasi (Pest Browser + Playwright):** gunakan `visit('/')`, `->assertSee('Katalog Peralatan')`, `->click('Tanggal Ambil')`, lalu pilih tanggal melalui `data-day` pada kalender. Untuk debounce, gunakan `waitForTimeout(700)` atau `assertSee` dengan retry. Locator yang stabil: aria-label `Hapus tanggal ambil`, `Hapus tanggal kembali`.
