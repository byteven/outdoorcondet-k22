# Test Case — CU-06: Checkout (Pembuatan Pesanan)

> **Modul:** CU-06 Checkout  
> **Referensi PRD:** Section 6.1 (CU-06)  
> **Versi PRD:** 3.1 FINAL  
> **Penyusun:** Vio Salman  
> **Tanggal:** 2026-11-07  

---

Pengujian modul checkout menggunakan metode Equivalence Partitioning untuk memvalidasi pilihan tipe pembayaran, Boundary Value Analysis untuk batas waktu pembayaran dan ukuran file bukti, serta Use Case Testing untuk alur create order dengan QRIS dan upload bukti pembayaran. Total 8 test case mencakup pemilihan tipe pembayaran (Bayar Penuh/DP 50%), pembuatan pesanan dengan QRIS, upload bukti pembayaran, validasi file, dan timeout pembayaran.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- **Alur checkout**: Dari halaman `/cart` → pilih tipe pembayaran → klik "Checkout Sekarang" → konfirmasi dialog → **langsung redirect ke `/checkout/{rental_code}`** (tidak ada halaman `/checkout` saja).
- **Tipe pembayaran** memiliki 2 opsi di halaman cart: **"Bayar Penuh"** (full payment) dan **"DP 50%"** (down payment).
- **Metode pembayaran**: Hanya **QRIS**. Customer scan QR code yang ditampilkan di halaman `/checkout/{rental_code}`, lalu upload bukti pembayaran.
- **QRIS QR Code**: Ditampilkan langsung di halaman payment dengan tombol "Simpan Gambar" untuk download.
- **Countdown 30 menit**: Dimulai sejak halaman `/checkout/{rental_code}` pertama kali dibuka. Jika waktu habis, pesanan otomatis cancelled.
- **Upload bukti**: Via tombol "Unggah Bukti" yang membuka dialog upload. Format JPG/PNG/PDF, max 2 MB.
- Setelah upload bukti berhasil, status rental berubah menjadi **"waiting_confirmation"** dan menunggu admin approve.
- Setelah admin approve: status **"fully_paid"** (bayar penuh) atau **"dp_paid"** (bayar DP).

---

## Metode Teknik yang Digunakan

| Teknik | Penerapan pada Modul CU-06 |
|---|---|
| Equivalence Partitioning (EP) | Tipe pembayaran (full/DP), format file bukti valid/invalid. |
| Boundary Value Analysis (BVA) | Batas waktu 30 menit, ukuran file max 2 MB. |
| Use Case Testing | Alur cart → pilih tipe → checkout → upload bukti → konfirmasi. |

---

## Pemilihan Tipe Pembayaran di Cart

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.CHK.001 | TC.CHK.001.001 | Vio | Pilih tipe pembayaran Bayar Penuh | Positive | Memilih bayar penuh di cart | Login sebagai vio@gmail.com; ada item di keranjang; rental range 15-17 Januari 2027 dipilih | 1. | Buka halaman `/cart` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih radio button "Bayar Penuh" |  |  |
|  |  |  |  |  |  |  | 3. | Amati ringkasan harga | Radio button "Bayar Penuh" terpilih; grand total ditampilkan (rental amount + deposit) tanpa pembagian DP |  |  |
| TC.CHK.001 | TC.CHK.001.002 | Vio | Pilih tipe pembayaran DP 50% | Positive | Memilih bayar DP di cart | Login sebagai vio@gmail.com; ada item di keranjang; rental range 15-17 Januari 2027 dipilih; grand total Rp200.000 | 1. | Buka halaman `/cart` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih radio button "DP 50%" |  |  |
|  |  |  |  |  |  |  | 3. | Amati ringkasan harga | Radio button "DP 50%" terpilih; tampil info "DP 50%: Rp100.000" dan "Total Deposit: Rp..." |  |  |

---

## Pembuatan Pesanan dan Halaman Payment

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.CHK.002 | TC.CHK.002.001 | Vio | Checkout dengan Bayar Penuh | Positive | Membuat pesanan dengan bayar penuh | Login sebagai vio@gmail.com; ada item di keranjang; pilih "Bayar Penuh" | 1. | Buka halaman `/cart` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih "Bayar Penuh" |  |  |
|  |  |  |  |  |  |  | 3. | Klik tombol "Checkout Sekarang" |  |  |
|  |  |  |  |  |  |  | 4. | Konfirmasi di dialog yang muncul |  |  |
|  |  |  |  |  |  |  | 5. | Amati halaman yang terbuka | Redirect ke `/checkout/{rental_code}`; status "pending_payment"; QR code QRIS tampil; countdown 30 menit dimulai; amount yang perlu dibayar = grand total (rental + deposit); tombol "Unggah Bukti" tersedia; tombol "Simpan Gambar" untuk download QR |  |  |
| TC.CHK.002 | TC.CHK.002.002 | Vio | Checkout dengan DP 50% | Positive | Membuat pesanan dengan DP 50% | Login sebagai vio@gmail.com; ada item di keranjang; pilih "DP 50%"; grand total Rp200.000 | 1. | Buka halaman `/cart` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih "DP 50%" |  |  |
|  |  |  |  |  |  |  | 3. | Klik tombol "Checkout Sekarang" dan konfirmasi |  |  |
|  |  |  |  |  |  |  | 4. | Amati halaman payment | Redirect ke `/checkout/{rental_code}`; QR code QRIS tampil; countdown 30 menit dimulai; amount tampil Rp100.000 (DP 50%); info "Perlu dibayar (DP 50%)"; tombol "Unggah Bukti" tersedia |  |  |

---

## Upload Bukti Pembayaran

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.CHK.003 | TC.CHK.003.001 | Vio | Upload bukti pembayaran berhasil | Positive | Upload file bukti valid | Login sebagai vio@gmail.com; pesanan dengan status "pending_payment" di `/checkout/{rental_code}` | 1. | Buka halaman `/checkout/{rental_code}` |  |  |
|  |  |  |  |  |  |  | 2. | Klik tombol "Unggah Bukti" |  |  |
|  |  |  |  |  |  |  | 3. | Pilih file JPG ukuran 1 MB di dialog yang muncul |  |  |
|  |  |  |  |  |  |  | 4. | Klik upload/submit |  |  |
|  |  |  |  |  |  |  | 5. | Cek status pesanan | File berhasil diupload; status rental berubah menjadi "waiting_confirmation"; halaman payment menampilkan bukti yang diupload; pesan "Menunggu Konfirmasi Admin" tampil; info "Pembayaran terkirim, mohon tunggu konfirmasi admin." ditampilkan |  |  |
| TC.CHK.003 | TC.CHK.003.002 | Vio | Upload file melebihi 2 MB | Negative | Upload file terlalu besar | Login sebagai vio@gmail.com; pesanan dengan status "pending_payment" | 1. | Buka halaman `/checkout/{rental_code}` |  |  |
|  |  |  |  |  |  |  | 2. | Klik tombol "Unggah Bukti" |  |  |
|  |  |  |  |  |  |  | 3. | Pilih file ukuran 3 MB di dialog |  |  |
|  |  |  |  |  |  |  | 4. | Coba upload | Error "Ukuran file maksimal 2 MB" muncul; file tidak diupload; status rental tetap "pending_payment" |  |  |
| TC.CHK.003 | TC.CHK.003.003 | Vio | Upload file format tidak valid | Negative | Upload file bukan JPG/PNG/PDF | Login sebagai vio@gmail.com; pesanan dengan status "pending_payment" | 1. | Buka halaman `/checkout/{rental_code}` |  |  |
|  |  |  |  |  |  |  | 2. | Klik tombol "Unggah Bukti" |  |  |
|  |  |  |  |  |  |  | 3. | Pilih file .txt di dialog |  |  |
|  |  |  |  |  |  |  | 4. | Coba upload | Error "Format file harus JPG, PNG, atau PDF" muncul; file tidak diupload; status tetap "pending_payment" |  |  |

---

## Timeout Pembayaran

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.CHK.004 | TC.CHK.004.001 | Vio | Pesanan dibatalkan setelah timeout 30 menit | Negative | Tidak upload bukti dalam batas waktu | Login sebagai vio@gmail.com; pesanan dengan status "pending_payment" dibuat | 1. | Buka halaman `/checkout/{rental_code}` |  |  |
|  |  |  |  |  |  |  | 2. | Amati countdown timer (30 menit) |  |  |
|  |  |  |  |  |  |  | 3. | Tunggu hingga countdown habis (atau simulasi dengan mengubah waktu server) |  |  |
|  |  |  |  |  |  |  | 4. | Amati halaman dan cek status di order history | Countdown mencapai 00:00; halaman payment menampilkan pesan "Waktu pembayaran habis! Pesanan ini telah kedaluwarsa."; status rental berubah menjadi "cancelled"; cancel reason: "Batas waktu pembayaran 30 menit terlewat"; stok telah dikembalikan |  |  |

---

## Ringkasan Eksekusi

| Kategori | Jumlah |
|---|---|
| Total test case | 8 |
| Positive | 5 |
| Negative | 3 |
| Belum dieksekusi | 8 |
| Pass | 0 |
| Fail | 0 |
