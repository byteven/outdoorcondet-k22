# Test Case — CU-07: Order History (Riwayat Pesanan)

> **Modul:** CU-07 Order History  
> **Referensi PRD:** Section 6.1 (CU-07)  
> **Versi PRD:** 3.1 FINAL  
> **Penyusun:** Vio Salman  
> **Tanggal:** 2026-11-07  

---

Pengujian modul riwayat pesanan menggunakan metode Equivalence Partitioning untuk memvalidasi filter status pesanan, Decision Table untuk kombinasi filter dan sorting, serta Use Case Testing untuk alur melihat detail pesanan berdasarkan status. Total 15 test case mencakup akses riwayat pesanan, filtering berdasarkan status, sorting, pagination, dan detail pesanan untuk setiap status rental (pending_payment, waiting_confirmation, dp_paid, fully_paid, returned, cancelled).

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- **Halaman order history** (`/orders`) menampilkan daftar pesanan customer yang login.
- **Filter status** tersedia: Semua, Menunggu Pembayaran, Menunggu Konfirmasi, DP Dibayar, Lunas, Selesai, Dibatalkan.
- **Sorting** berdasarkan: Tanggal Pesanan (terbaru/terlama), Total Bayar (tertinggi/terendah).
- **Pagination** server-side dengan default 10 pesanan per halaman.
- **Kartu pesanan** menampilkan: rental code, tanggal sewa, status badge, item list (nama + quantity), total bayar, dan tombol "Lihat Detail".
- **Detail pesanan** menampilkan: rental code, status, rental range, daftar item lengkap, payment info (tipe, metode, amount, bukti jika ada), timeline status, tombol aksi sesuai status.
- **Seeder RentalTestSeeder** menyediakan 6 rental untuk user `vio@gmail.com` dengan berbagai status untuk testing:
  - OC-TEST-JAN2027-001: pending_payment (4 unit Tenda Tunnel, total Rp488.000)
  - OC-TEST-JAN2027-002: waiting_confirmation (1 unit Tenda Tunnel, DP Rp25.000)
  - OC-TEST-JAN2027-003: dp_paid (1 unit Tenda Tunnel, DP Rp31.000)
  - OC-TEST-JAN2027-004: fully_paid (1 unit Tenda Tunnel, total Rp110.000)
  - OC-TEST-JAN2027-005: returned (1 unit Tenda Tunnel, selesai)
  - OC-TEST-JAN2027-006: cancelled (timeout pembayaran)

---

## Metode Teknik yang Digunakan

| Teknik | Penerapan pada Modul CU-07 |
|---|---|
| Equivalence Partitioning (EP) | Filter status valid (6 status rental), kelas pesanan berdasarkan status. |
| Decision Table (DT) | Kombinasi filter status × sorting × pagination. |
| Use Case Testing | Alur akses riwayat → filter status → lihat detail → aksi sesuai status. |

---

## Akses dan Tampilan Riwayat Pesanan

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.ORD.001 | TC.ORD.001.001 | Vio | Halaman order history tampil dengan semua pesanan | Positive | Membuka riwayat pesanan | Login sebagai vio@gmail.com (memiliki 6 rental test dari RentalTestSeeder) | 1. | Buka halaman `/orders` | Halaman riwayat pesanan terbuka; filter "Semua" aktif; 6 rental test tampil dalam daftar dengan rental code, status badge warna berbeda, tanggal sewa, dan total bayar |  |  |
| TC.ORD.001 | TC.ORD.001.002 | Vio | Filter Menunggu Pembayaran | Positive | Memfilter pesanan pending payment | Login sebagai vio@gmail.com; berada di halaman order history | 1. | Klik filter "Menunggu Pembayaran" |  |  |
|  |  |  |  |  |  |  | 2. | Amati daftar pesanan | Hanya pesanan dengan status "pending_payment" yang tampil; rental code OC-TEST-JAN2027-001 (total Rp488.000) muncul; badge status merah/orange "Menunggu Pembayaran" tampil |  |  |
| TC.ORD.001 | TC.ORD.001.003 | Vio | Filter Menunggu Konfirmasi | Positive | Memfilter pesanan waiting confirmation | Login sebagai vio@gmail.com; berada di halaman order history | 1. | Klik filter "Menunggu Konfirmasi" |  |  |
|  |  |  |  |  |  |  | 2. | Amati daftar pesanan | Hanya pesanan dengan status "waiting_confirmation" yang tampil; rental code OC-TEST-JAN2027-002 muncul; badge status kuning "Menunggu Konfirmasi" tampil |  |  |
| TC.ORD.001 | TC.ORD.001.004 | Vio | Filter DP Dibayar | Positive | Memfilter pesanan DP paid | Login sebagai vio@gmail.com; berada di halaman order history | 1. | Klik filter "DP Dibayar" |  |  |
|  |  |  |  |  |  |  | 2. | Amati daftar pesanan | Hanya pesanan dengan status "dp_paid" yang tampil; rental code OC-TEST-JAN2027-003 muncul; badge status biru "DP Dibayar" tampil; info sisa bayar ditampilkan |  |  |
| TC.ORD.001 | TC.ORD.001.005 | Vio | Filter Lunas | Positive | Memfilter pesanan fully paid | Login sebagai vio@gmail.com; berada di halaman order history | 1. | Klik filter "Lunas" |  |  |
|  |  |  |  |  |  |  | 2. | Amati daftar pesanan | Hanya pesanan dengan status "fully_paid" yang tampil; rental code OC-TEST-JAN2027-004 muncul; badge status hijau "Lunas" tampil |  |  |
| TC.ORD.001 | TC.ORD.001.006 | Vio | Filter Selesai | Positive | Memfilter pesanan returned | Login sebagai vio@gmail.com; berada di halaman order history | 1. | Klik filter "Selesai" |  |  |
|  |  |  |  |  |  |  | 2. | Amati daftar pesanan | Hanya pesanan dengan status "returned" yang tampil; rental code OC-TEST-JAN2027-005 muncul; badge status abu "Selesai" tampil; tanggal pengembalian ditampilkan |  |  |
| TC.ORD.001 | TC.ORD.001.007 | Vio | Filter Dibatalkan | Positive | Memfilter pesanan cancelled | Login sebagai vio@gmail.com; berada di halaman order history | 1. | Klik filter "Dibatalkan" |  |  |
|  |  |  |  |  |  |  | 2. | Amati daftar pesanan | Hanya pesanan dengan status "cancelled" yang tampil; rental code OC-TEST-JAN2027-006 muncul; badge status merah "Dibatalkan" tampil; cancel reason "Batas waktu pembayaran 30 menit terlewat" ditampilkan |  |  |

---

## Detail Pesanan Berdasarkan Status

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.ORD.002 | TC.ORD.002.001 | Vio | Detail pesanan pending_payment | Positive | Melihat detail pesanan menunggu pembayaran | Login sebagai vio@gmail.com | 1. | Buka halaman `/orders` |  |  |
|  |  |  |  |  |  |  | 2. | Klik filter "Menunggu Pembayaran" |  |  |
|  |  |  |  |  |  |  | 3. | Klik "Lihat Detail" pada pesanan OC-TEST-JAN2027-001 |  |  |
|  |  |  |  |  |  |  | 4. | Amati detail pesanan | Halaman detail terbuka; rental code, status "Menunggu Pembayaran", rental range 20-23 Januari 2027, item list (4 unit Tenda Tunnel), grand total Rp488.000 tampil; countdown payment deadline tampil; tombol "Bayar Sekarang" atau "Batalkan Pesanan" tersedia |  |  |
| TC.ORD.002 | TC.ORD.002.002 | Vio | Detail pesanan waiting_confirmation | Positive | Melihat detail pesanan menunggu konfirmasi admin | Login sebagai vio@gmail.com | 1. | Buka halaman `/orders` |  |  |
|  |  |  |  |  |  |  | 2. | Klik filter "Menunggu Konfirmasi" |  |  |
|  |  |  |  |  |  |  | 3. | Klik "Lihat Detail" pada pesanan OC-TEST-JAN2027-002 |  |  |
|  |  |  |  |  |  |  | 4. | Amati detail pesanan | Detail pesanan tampil; status "Menunggu Konfirmasi"; payment info: tipe "DP 50%", amount Rp25.000, bukti pembayaran (link/preview "dummy-proof.jpg") tampil; info "Menunggu admin mengkonfirmasi pembayaran Anda" tampil |  |  |
| TC.ORD.002 | TC.ORD.002.003 | Vio | Detail pesanan dp_paid | Positive | Melihat detail pesanan DP sudah dibayar | Login sebagai vio@gmail.com | 1. | Buka halaman `/orders` |  |  |
|  |  |  |  |  |  |  | 2. | Klik filter "DP Dibayar" |  |  |
|  |  |  |  |  |  |  | 3. | Klik "Lihat Detail" pada pesanan OC-TEST-JAN2027-003 |  |  |
|  |  |  |  |  |  |  | 4. | Amati detail pesanan | Detail pesanan tampil; status "DP Dibayar"; payment info: DP Rp31.000 (approved), sisa Rp31.000; info "Siap diambil pada 25 Januari 2027" tampil; instruksi "Bayar sisa saat pengambilan" tampil |  |  |
| TC.ORD.002 | TC.ORD.002.004 | Vio | Detail pesanan fully_paid | Positive | Melihat detail pesanan lunas | Login sebagai vio@gmail.com | 1. | Buka halaman `/orders` |  |  |
|  |  |  |  |  |  |  | 2. | Klik filter "Lunas" |  |  |
|  |  |  |  |  |  |  | 3. | Klik "Lihat Detail" pada pesanan OC-TEST-JAN2027-004 |  |  |
|  |  |  |  |  |  |  | 4. | Amati detail pesanan | Detail pesanan tampil; status "Lunas"; payment info: full payment Rp110.000 (approved); info "Siap diambil pada 10 Januari 2027" tampil; tidak ada sisa pembayaran |  |  |
| TC.ORD.002 | TC.ORD.002.005 | Vio | Detail pesanan returned | Positive | Melihat detail pesanan selesai | Login sebagai vio@gmail.com | 1. | Buka halaman `/orders` |  |  |
|  |  |  |  |  |  |  | 2. | Klik filter "Selesai" |  |  |
|  |  |  |  |  |  |  | 3. | Klik "Lihat Detail" pada pesanan OC-TEST-JAN2027-005 |  |  |
|  |  |  |  |  |  |  | 4. | Amati detail pesanan | Detail pesanan tampil; status "Selesai"; rental range 5-7 Januari 2027; tanggal pengembalian "7 Jan 2027, 22:00"; return condition "good" (baik); info late days: 0, late fee: Rp0; deposit dikembalikan |  |  |
| TC.ORD.002 | TC.ORD.002.006 | Vio | Detail pesanan cancelled | Positive | Melihat detail pesanan dibatalkan | Login sebagai vio@gmail.com | 1. | Buka halaman `/orders` |  |  |
|  |  |  |  |  |  |  | 2. | Klik filter "Dibatalkan" |  |  |
|  |  |  |  |  |  |  | 3. | Klik "Lihat Detail" pada pesanan OC-TEST-JAN2027-006 |  |  |
|  |  |  |  |  |  |  | 4. | Amati detail pesanan | Detail pesanan tampil; status "Dibatalkan"; cancel reason: "Batas waktu pembayaran 30 menit terlewat"; tidak ada opsi aksi; info "Stok telah dikembalikan" tampil |  |  |

---

## Sorting dan Pagination

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.ORD.003 | TC.ORD.003.001 | Vio | Sorting pesanan berdasarkan tanggal terbaru | Positive | Mengurutkan pesanan terbaru | Login sebagai vio@gmail.com; berada di halaman order history dengan filter "Semua" | 1. | Pilih sorting "Tanggal Pesanan (Terbaru)" |  |  |
|  |  |  |  |  |  |  | 2. | Amati urutan pesanan | Pesanan diurutkan dari yang paling baru dibuat; rental code terbaru muncul di atas |  |  |
| TC.ORD.003 | TC.ORD.003.002 | Vio | Pagination riwayat pesanan | Positive | Navigasi halaman jika pesanan > 10 | Login dengan akun yang memiliki > 10 pesanan | 1. | Buka halaman `/orders` |  |  |
|  |  |  |  |  |  |  | 2. | Klik tombol "Halaman Berikutnya" |  |  |
|  |  |  |  |  |  |  | 3. | Amati halaman | Halaman 2 tampil dengan 10 pesanan berikutnya; label "Halaman 2 dari {last}" tampil |  |  |

---

## Ringkasan Eksekusi

| Kategori | Jumlah |
|---|---|
| Total test case | 15 |
| Positive | 15 |
| Negative | 0 |
| Belum dieksekusi | 15 |
| Pass | 0 |
| Fail | 0 |
