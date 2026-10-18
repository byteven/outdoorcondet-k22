# Test Case — AD-02: Customer Management (Admin)

> **Modul:** AD-02 Customer Management
> **Referensi PRD:** Section 5.1 (AD-02)
> **Versi PRD:** 3.1 FINAL
> **Penyusun:** Vio Salman
> **Tanggal:** 2026-10-18

---

Pengujian modul manajemen pelanggan menggunakan metode Equivalence Partitioning untuk memvalidasi input data pelanggan pada skenario valid dan tidak valid, serta State Transition untuk memverifikasi perpindahan status pelanggan antar kondisi aktif, nonaktif, dihapus, dan dipulihkan. Pengujian mencakup pencarian dan pemfilteran daftar, tambah, edit, toggle status, dan penghapusan pelanggan. Dari total 14 test case yang dijalankan, terdiri dari 11 skenario positif dan 3 skenario negatif, seluruhnya menunjukkan hasil Pass.

---

## Catatan Implementasi

Berdasarkan kode yang ada:
- Halaman `/customers` hanya bisa diakses admin (`access-admin`)
- Tabel menampilkan kolom: Pelanggan, Email, Telepon, Status, Terdaftar
- **Summary cards**: Total, Aktif, Nonaktif
- Search realtime (debounce 500ms) by nama, email, telepon
- Filter status: Semua / Aktif / Nonaktif
- Sort by: Nama, Email, Terdaftar
- Klik baris → buka **CustomerProfileDialog** (detail + edit)
- **Tambah customer** via `CustomerFormDialog` (wajib: Nama, Email, Password, Telepon; opsional: Kontak Darurat, Sosial Media, Alamat)
- **Edit customer** via dialog (sama seperti tambah, tanpa password; ada field `is_active`)
- **Hapus** = soft delete + `is_active=false`
- Email akun nonaktif/soft-deleted yang lama **bisa didaur ulang** (dipulihkan) saat tambah customer baru

---

## List & Search Pelanggan

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.001.001 | Vio | Halaman daftar pelanggan tampil | Positive | Admin membuka halaman pelanggan | Admin sudah login | 1 | Buka halaman `/customers` | Tabel pelanggan tampil; summary cards Total, Aktif, Nonaktif tampil dengan angka yang benar | |
| TC.ADM.001.002 | Vio | Search pelanggan berdasarkan nama | Positive | Cari customer by nama | Admin berada di halaman pelanggan, ada data customer | 1 | Ketik nama customer di field pencarian | Tabel menampilkan hanya customer yang namanya sesuai kata kunci | |
| TC.ADM.001.003 | Vio | Filter status Aktif | Positive | Filter tabel hanya tampilkan customer aktif | Admin berada di halaman pelanggan | 1 | Pilih filter "Aktif" pada dropdown status | Tabel hanya menampilkan customer dengan status Aktif | |
| TC.ADM.001.004 | Vio | Filter status Nonaktif | Positive | Filter tabel hanya tampilkan customer nonaktif | Admin berada di halaman pelanggan | 1 | Pilih filter "Nonaktif" pada dropdown status | Tabel hanya menampilkan customer dengan status Nonaktif | |
| TC.ADM.001.005 | Vio | Klik baris membuka dialog detail customer | Positive | Klik salah satu baris di tabel | Admin berada di halaman pelanggan, ada data customer | 1 | Klik salah satu baris customer di tabel | Dialog detail/edit customer terbuka menampilkan data customer yang diklik | |

---

## Tambah Customer

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.002.001 | Vio | Tambah customer berhasil | Positive | Admin menambah customer baru dengan data valid | Email belum terdaftar di sistem | 1 | Klik tombol tambah customer | | |
| | | | | | | 2 | Isi Nama, Email, Password, Telepon dengan data valid | | |
| | | | | | | 3 | Klik "Simpan" | Muncul toast "Pelanggan [nama] berhasil ditambahkan."; customer muncul di tabel | |
| TC.ADM.002.002 | Vio | Validasi field wajib tambah customer | Negative | Submit form tambah tanpa mengisi field wajib | Admin membuka dialog tambah customer | 1 | Kosongkan Nama, Email, Password, Telepon | | |
| | | | | | | 2 | Klik "Simpan" | Muncul pesan error di semua field wajib | |
| TC.ADM.002.003 | Vio | Tambah customer — email sudah aktif terdaftar | Negative | Input email yang sudah dipakai akun aktif lain | Ada customer aktif dengan email "aktif@example.com" | 1 | Isi Email: "aktif@example.com", field lain valid | | |
| | | | | | | 2 | Klik "Simpan" | Muncul pesan error "Email sudah terdaftar." | |
| TC.ADM.002.004 | Vio | Tambah customer — email dari akun nonaktif dipulihkan | Positive | Email akun yang sudah dinonaktifkan bisa dipakai ulang | Ada customer nonaktif dengan email "lama@example.com" | 1 | Isi Email: "lama@example.com", field lain valid | | |
| | | | | | | 2 | Klik "Simpan" | Muncul toast "Pelanggan [nama] berhasil dipulihkan dan diaktifkan kembali." | |

---

## Edit Customer

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.003.001 | Vio | Edit data customer berhasil | Positive | Admin mengubah data customer | Admin membuka dialog detail customer | 1 | Ubah Nama Lengkap atau field lain | | |
| | | | | | | 2 | Klik "Simpan" | Muncul toast "Perubahan pelanggan [nama] berhasil disimpan."; data di tabel terupdate | |
| TC.ADM.003.002 | Vio | Nonaktifkan customer via toggle is_active | Positive | Admin mengubah status customer menjadi nonaktif | Admin membuka dialog detail customer aktif | 1 | Ubah status menjadi "Nonaktif" | | |
| | | | | | | 2 | Klik "Simpan" | Customer berhasil dinonaktifkan; status di tabel berubah menjadi Nonaktif | |
| TC.ADM.003.003 | Vio | Aktifkan kembali customer nonaktif | Positive | Admin mengubah status customer nonaktif menjadi aktif | Admin membuka dialog detail customer nonaktif | 1 | Ubah status menjadi "Aktif" | | |
| | | | | | | 2 | Klik "Simpan" | Customer berhasil diaktifkan; status di tabel berubah menjadi Aktif | |
| TC.ADM.003.004 | Vio | Edit email customer — unik per customer | Negative | Ganti email dengan email yang sudah dipakai customer lain | Ada customer lain dengan email "lain@example.com" | 1 | Isi Email: "lain@example.com" | | |
| | | | | | | 2 | Klik "Simpan" | Muncul pesan error "Email sudah terdaftar." | |

---

## Hapus Customer

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.004.001 | Vio | Hapus customer berhasil | Positive | Admin menghapus customer dari sistem | Admin membuka dialog detail customer | 1 | Klik tombol hapus customer | | |
| | | | | | | 2 | Konfirmasi penghapusan | Muncul toast "Pelanggan [nama] dinonaktifkan dan dihapus."; customer hilang dari tabel aktif | |
