# Test Case — CU-04: Catalog & Detail

> **Modul:** CU-04 Catalog & Detail  
> **Referensi PRD:** Section 6.1 (CU-04)  
> **Versi PRD:** 3.1 FINAL  
> **Penyusun:** Vio Salman  
> **Tanggal:** 2026-11-07  

---

Pengujian modul katalog dan detail produk menggunakan metode Equivalence Partitioning untuk memvalidasi filter kategori dan ketersediaan stok, serta Use Case Testing untuk alur browsing katalog dan membuka detail produk. Total 10 test case mencakup browsing katalog di landing page (chip kategori, chip bundle/alat), melihat detail produk dengan varian, ketersediaan stok, serta integrasi dengan rental range.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- **Halaman Landing** (`/`) menampilkan hero, komponen Rental Range, dan section katalog dengan tab **"Alat"** dan **"Paket"**.
- **Chip kategori** tampil horizontal di atas katalog (hanya pada tab Alat); kategori hanya tampil jika berisi produk aktif bervarian aktif. Klik chip mengaktifkan filter kategori.
- **Chip Alat/Paket** adalah tab switching; tab "Alat" default aktif saat pertama kali membuka landing.
- **Kartu produk** menampilkan gambar, nama, harga mulai dari, dan ketersediaan (jika rental range dipilih).
- **Ketersediaan** dihitung bila `pickup_date` dan `return_date` ada; kartu dengan stok 0 diberi label **"Tidak Tersedia"**, grayscale, dan tidak dapat diklik.
- **Detail produk** (`/products/{slug}`) menampilkan galeri gambar, deskripsi lengkap, pilihan varian (attribute selector), tarif sewa per hari, tarif paket durasi, deposit per unit, stok ketersediaan, dan input quantity.
- Tombol **"Tambah ke Keranjang"** aktif jika varian dipilih, quantity ≥ 1, dan stok tersedia pada rental range.
- Customer tidak perlu login untuk browsing katalog dan membuka detail produk.

---

## Metode Teknik yang Digunakan

| Teknik | Penerapan pada Modul CU-04 |
|---|---|
| Equivalence Partitioning (EP) | Filter kategori valid, ketersediaan stok (available/unavailable), pilihan varian. |
| Use Case Testing | Alur browsing katalog (chip kategori, chip alat/paket) → buka detail → pilih varian → lihat tarif dan stok. |

---

## Browsing Katalog di Landing Page

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.CAT.001 | TC.CAT.001.001 | Vio | Katalog tampil di landing page dengan chip kategori | Positive | Melihat katalog dan chip kategori di halaman utama | Login sebagai vio@gmail.com | 1. | Buka halaman `/` | Section "Katalog Peralatan" tampil; tab "Alat" aktif; chip kategori horizontal tampil di atas katalog; kartu produk ditampilkan dalam grid |  |  |
| TC.CAT.001 | TC.CAT.001.002 | Vio | Klik chip kategori memfilter katalog | Positive | Memfilter produk berdasarkan kategori | Login sebagai vio@gmail.com; berada di landing page | 1. | Klik chip kategori "Tenda & Shelter" | Chip menjadi aktif (highlighted, dengan ikon X); katalog hanya menampilkan produk kategori tersebut |  |  |
| TC.CAT.001 | TC.CAT.001.003 | Vio | Switching tab Alat dan Paket | Positive | Beralih antar tab Alat dan Paket | Login sebagai vio@gmail.com; berada di landing page | 1. | Klik tab "Paket" | Tab "Paket" aktif; katalog menampilkan daftar paket; chip kategori hilang |  |  |
| TC.CAT.001 | TC.CAT.001.004 | Vio | Kartu produk unavailable dengan rental range | Negative | Melihat produk unavailable saat rental range dipilih | Login sebagai vio@gmail.com | 1. | Buka halaman `/` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih rental range 20-23 Januari 2027 di komponen Rental Range |  |  |
|  |  |  |  |  |  |  | 3. | Scroll ke section katalog dan amati kartu "Tenda Tunnel" | Kartu "Tenda Tunnel" diberi label "Tidak Tersedia", gambar grayscale, dan tidak dapat diklik; produk lain dengan stok tersedia tampil normal |  |  |
| TC.CAT.001 | TC.CAT.001.005 | Vio | Kartu produk available tanpa rental range | Positive | Melihat produk tanpa memilih rental range | Login sebagai vio@gmail.com | 1. | Buka halaman `/` tanpa memilih rental range |  |  |
|  |  |  |  |  |  |  | 2. | Amati kartu produk di katalog | Semua kartu produk aktif tampil normal tanpa label "Tidak Tersedia"; tidak ada perhitungan ketersediaan |  |  |

---

## Detail Produk

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.DTL.001 | TC.DTL.001.001 | Vio | Membuka detail produk dari katalog | Positive | Membuka halaman detail produk | Login sebagai vio@gmail.com | 1. | Buka halaman landing `/` |  |  |
|  |  |  |  |  |  |  | 2. | Klik kartu produk "Tenda Dome" di katalog | Halaman `/products/tenda-dome` terbuka; galeri gambar, nama produk, kategori, deskripsi lengkap tampil |  |  |
| TC.DTL.001 | TC.DTL.001.002 | Vio | Produk multi-varian menampilkan selector atribut | Positive | Melihat selector varian pada produk multi-varian | Login sebagai vio@gmail.com | 1. | Buka halaman landing `/` |  |  |
|  |  |  |  |  |  |  | 2. | Klik kartu produk "Tenda Dome" |  |  |
|  |  |  |  |  |  |  | 3. | Amati bagian pilihan varian | Selector atribut "Kapasitas" tampil dengan opsi "2 Orang" (SKU: OC-TND-2P) dan "4 Orang" (SKU: OC-TND-4P); belum ada varian terpilih secara default |  |  |
| TC.DTL.001 | TC.DTL.001.003 | Vio | Memilih varian menampilkan detail tarif dan deposit | Positive | Melihat detail tarif setelah memilih varian | Login sebagai vio@gmail.com | 1. | Buka halaman landing `/` |  |  |
|  |  |  |  |  |  |  | 2. | Klik kartu produk "Tenda Dome" |  |  |
|  |  |  |  |  |  |  | 3. | Pilih varian "2 Orang" pada selector |  |  |
|  |  |  |  |  |  |  | 4. | Amati detail yang ditampilkan | Tarif sewa per hari (Rp18.000), tarif paket durasi (3 hari: Rp45.000, 7 hari: Rp90.000), deposit per unit (Rp40.000), berat (2400g), dan stok tersedia tampil |  |  |
| TC.DTL.001 | TC.DTL.001.004 | Vio | Ketersediaan stok dihitung dengan rental range aktif | Positive | Melihat ketersediaan stok dengan rental range aktif | Login sebagai vio@gmail.com | 1. | Buka halaman landing `/` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih rental range 15-17 Januari 2027 |  |  |
|  |  |  |  |  |  |  | 3. | Klik kartu produk "Tenda Dome" |  |  |
|  |  |  |  |  |  |  | 4. | Pilih varian "2 Orang" |  |  |
|  |  |  |  |  |  |  | 5. | Amati stok yang ditampilkan | Stok tersedia dihitung berdasarkan rental range aktif; tampil "Tersedia: 8 unit" (sesuai stok fisik karena tidak ada rental aktif pada periode tersebut) |  |  |
| TC.DTL.001 | TC.DTL.001.005 | Vio | Stok unavailable pada rental range tertentu | Negative | Melihat produk unavailable dengan rental range tertentu | Login sebagai vio@gmail.com | 1. | Buka halaman landing `/` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih rental range 20-23 Januari 2027 |  |  |
|  |  |  |  |  |  |  | 3. | Klik kartu produk "Tenda Tunnel" (jika tidak grayscale) atau akses langsung `/products/tenda-tunnel` |  |  |
|  |  |  |  |  |  |  | 4. | Amati stok dan tombol | Stok tampil "0 unit tersedia"; tombol "Tambah ke Keranjang" disabled; muncul pesan "Stok tidak tersedia untuk rentang tanggal ini" |  |  |

---

## Ringkasan Eksekusi

| Kategori | Jumlah |
|---|---|
| Total test case | 10 |
| Positive | 8 |
| Negative | 2 |
| Belum dieksekusi | 10 |
| Pass | 0 |
| Fail | 0 |
