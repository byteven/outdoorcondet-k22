# Test Case — CU-05: Cart (Keranjang Sewa)

> **Modul:** CU-05 Cart  
> **Referensi PRD:** Section 6.1 (CU-05)  
> **Versi PRD:** 3.1 FINAL  
> **Penyusun:** Vio Salman  
> **Tanggal:** 2026-11-07  

---

Pengujian modul keranjang sewa menggunakan metode Equivalence Partitioning untuk memvalidasi input quantity dan item keranjang, Boundary Value Analysis untuk batas stok, serta Use Case Testing untuk alur tambah, edit, dan hapus item keranjang. Total 10 test case mencakup tambah item ke keranjang, edit quantity, hapus item, validasi ketersediaan stok, dan sinkronisasi dengan rental range.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- **Keranjang** dapat diakses melalui icon cart di navbar (badge menampilkan jumlah item).
- **Halaman keranjang** (`/cart`) menampilkan daftar item sewa dengan informasi: nama produk, varian, quantity, harga satuan, subtotal, dan deposit.
- **Rental range aktif** ditampilkan di atas daftar item; jika rental range berubah, ketersediaan stok divalidasi ulang.
- **Edit quantity** langsung dari halaman keranjang; quantity tidak boleh melebihi stok tersedia pada rental range aktif.
- **Hapus item** via tombol hapus pada setiap item; konfirmasi tidak diperlukan (hapus langsung).
- **Total** dihitung dari: rental amount (subtotal semua item) + deposit amount (total deposit).
- Tombol **"Lanjut ke Checkout"** hanya aktif jika ada item di keranjang, rental range lengkap, dan semua item available.
- Keranjang disimpan per user (database) dan sinkron antar device.

---

## Metode Teknik yang Digunakan

| Teknik | Penerapan pada Modul CU-05 |
|---|---|
| Equivalence Partitioning (EP) | Item available/unavailable, quantity valid/invalid. |
| Boundary Value Analysis (BVA) | Quantity min 1, max stok tersedia. |
| Use Case Testing | Alur tambah item → edit quantity → hapus item → checkout. |

---

## Tambah Item ke Keranjang

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.CRT.001 | TC.CRT.001.001 | Vio | Tambah item ke keranjang berhasil | Positive | Menambahkan produk ke keranjang | Login sebagai vio@gmail.com | 1. | Buka halaman landing `/` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih rental range 15-17 Januari 2027 |  |  |
|  |  |  |  |  |  |  | 3. | Klik kartu produk "Tenda Dome" |  |  |
|  |  |  |  |  |  |  | 4. | Pilih varian "2 Orang" dan set quantity 2 |  |  |
|  |  |  |  |  |  |  | 5. | Klik tombol "Tambah ke Keranjang" | Toast "Produk berhasil ditambahkan ke keranjang" muncul; badge cart di navbar bertambah; redirect ke halaman `/cart` |  |  |
| TC.CRT.001 | TC.CRT.001.002 | Vio | Tambah item tanpa rental range | Negative | Menambahkan produk tanpa memilih tanggal | Login sebagai vio@gmail.com | 1. | Buka halaman landing `/` tanpa memilih rental range |  |  |
|  |  |  |  |  |  |  | 2. | Klik kartu produk "Tenda Dome" |  |  |
|  |  |  |  |  |  |  | 3. | Pilih varian "2 Orang" dan set quantity 2 |  |  |
|  |  |  |  |  |  |  | 4. | Klik tombol "Tambah ke Keranjang" | Toast error "Pilih rentang tanggal sewa terlebih dahulu" muncul; item tidak ditambahkan; customer tetap di halaman detail |  |  |
| TC.CRT.001 | TC.CRT.001.003 | Vio | Tambah item dengan quantity melebihi stok | Negative | Input quantity melebihi stok tersedia | Login sebagai vio@gmail.com | 1. | Buka halaman landing `/` |  |  |
|  |  |  |  |  |  |  | 2. | Pilih rental range 15-17 Januari 2027 |  |  |
|  |  |  |  |  |  |  | 3. | Klik kartu produk "Carrier" |  |  |
|  |  |  |  |  |  |  | 4. | Pilih varian "40 Liter" (stok 4) |  |  |
|  |  |  |  |  |  |  | 5. | Ubah quantity menjadi 5 | Error "Quantity melebihi stok tersedia (4 unit)" tampil di bawah input; tombol "Tambah ke Keranjang" disabled |  |  |

---

## Lihat dan Kelola Keranjang

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.CRT.002 | TC.CRT.002.001 | Vio | Halaman keranjang tampil dengan item | Positive | Melihat daftar item di keranjang | Login sebagai vio@gmail.com; sudah tambah 2 item ke keranjang | 1. | Klik icon cart di navbar atau akses `/cart` | Halaman keranjang tampil; rental range "15 Jan 2027 - 17 Jan 2027 (2 Hari)" ditampilkan; daftar item tampil dengan nama, varian, quantity, harga satuan, subtotal, deposit; total rental amount dan deposit amount dihitung |  |  |
| TC.CRT.002 | TC.CRT.002.002 | Vio | Edit quantity item di keranjang | Positive | Mengubah quantity item di keranjang | Login sebagai vio@gmail.com; ada item "Tenda Dome 2P" quantity 2 di keranjang | 1. | Buka halaman `/cart` |  |  |
|  |  |  |  |  |  |  | 2. | Ubah quantity item "Tenda Dome 2P" menjadi 3 |  |  |
|  |  |  |  |  |  |  | 3. | Amati perubahan total | Quantity berubah menjadi 3; subtotal dan total rental amount terupdate otomatis; deposit subtotal juga terupdate |  |  |
| TC.CRT.002 | TC.CRT.002.003 | Vio | Edit quantity melebihi stok di keranjang | Negative | Mengubah quantity melebihi stok | Login sebagai vio@gmail.com; ada item "Carrier 40L" quantity 2 di keranjang | 1. | Buka halaman `/cart` |  |  |
|  |  |  |  |  |  |  | 2. | Ubah quantity item "Carrier 40L" menjadi 6 | Error "Quantity melebihi stok tersedia (4 unit)" muncul; quantity dikembalikan ke nilai sebelumnya; tombol "Lanjut ke Checkout" disabled |  |  |
| TC.CRT.002 | TC.CRT.002.004 | Vio | Hapus item dari keranjang | Positive | Menghapus item dari keranjang | Login sebagai vio@gmail.com; ada 2 item di keranjang | 1. | Buka halaman `/cart` |  |  |
|  |  |  |  |  |  |  | 2. | Klik tombol hapus (icon trash) pada item pertama |  |  |
|  |  |  |  |  |  |  | 3. | Amati perubahan | Item langsung terhapus dari daftar (tanpa konfirmasi); badge cart di navbar berkurang; total rental amount dan deposit terupdate |  |  |
| TC.CRT.002 | TC.CRT.002.005 | Vio | Keranjang kosong menampilkan empty state | Positive | Melihat keranjang kosong | Login sebagai vio@gmail.com; keranjang tidak berisi item | 1. | Buka halaman `/cart` | Empty state "Keranjang Anda masih kosong" tampil dengan tombol "Mulai Sewa Sekarang" yang mengarah ke landing page |  |  |

---

## Validasi Ketersediaan Stok

| Scenario ID | Case ID | Issue & Author | Test Scenario | Type | Test Case | Pre Condition | No. | Steps Description | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC.CRT.003 | TC.CRT.003.001 | Vio | Item unavailable saat rental range berubah | Negative | Mengubah rental range yang membuat item tidak tersedia | Login sebagai vio@gmail.com; ada item "Tenda Tunnel" di keranjang dengan rental range 15-17 Januari 2027 | 1. | Buka halaman landing `/` |  |  |
|  |  |  |  |  |  |  | 2. | Ubah rental range menjadi 20-23 Januari 2027 |  |  |
|  |  |  |  |  |  |  | 3. | Buka halaman `/cart` | Item "Tenda Tunnel" ditandai "Tidak Tersedia" dengan badge merah; tombol "Lanjut ke Checkout" disabled; muncul notifikasi "Beberapa item tidak tersedia pada rentang tanggal baru" |  |  |
| TC.CRT.003 | TC.CRT.003.002 | Vio | Lanjut ke checkout dengan keranjang valid | Positive | Melanjutkan ke halaman checkout | Login sebagai vio@gmail.com; keranjang berisi item available; rental range lengkap | 1. | Buka halaman `/cart` |  |  |
|  |  |  |  |  |  |  | 2. | Klik tombol "Lanjut ke Checkout" | Redirect ke halaman checkout `/checkout`; data keranjang dibawa ke halaman checkout |  |  |

---

## Ringkasan Eksekusi

| Kategori | Jumlah |
|---|---|
| Total test case | 10 |
| Positive | 6 |
| Negative | 4 |
| Belum dieksekusi | 10 |
| Pass | 0 |
| Fail | 0 |
