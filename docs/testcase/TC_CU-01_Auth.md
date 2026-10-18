# Test Case — CU-01: Autentikasi Customer (Registrasi & Login)

> **Modul:** CU-01 Auth
> **Referensi PRD:** Section 4.1, Section 5.2 (CU-01)
> **Versi PRD:** 3.1 FINAL
> **Penyusun:** Vio Salman
> **Tanggal:** 2026-10-18

---

Pengujian modul autentikasi customer menggunakan metode Equivalence Partitioning untuk memvalidasi partisi input valid dan tidak valid pada field email, nomor telepon, dan password, serta State Transition untuk memverifikasi perpindahan status sesi pengguna antara kondisi tidak terautentikasi, terautentikasi, dan setelah logout. Dari total 12 test case yang dijalankan, terdiri dari 4 skenario positif dan 8 skenario negatif, seluruhnya menunjukkan hasil Pass.

---

## Registrasi

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.REG.001.001 | Vio | Validasi field wajib Step 1 | Negative | Input semua field kosong dan klik Selanjutnya | User di halaman Step 1 | 1 | Biarkan semua field kosong | | |
| | | | | | | 2 | Klik tombol "Selanjutnya" | Muncul pesan error di semua field wajib | |
| TC.REG.001.002 | Vio | Validasi format Email | Negative | Input email format salah, field lain valid | User di halaman Step 1 | 1 | Isi Email: "Usertest", isi field lain valid | | |
| | | | | | | 2 | Klik tombol "Selanjutnya" | Muncul pesan error "Format email tidak valid" | |
| TC.REG.001.003 | Vio | Validasi input No. Telepon — tidak menggunakan angka | Negative | Input telepon menggunakan huruf | User di halaman Step 1 | 1 | Isi No. Telepon: "abcd" | Field tidak mengizinkan user memasukkan format huruf | |
| TC.REG.001.004 | Vio | Konfirmasi Password tidak cocok | Negative | Password dan Konfirmasi Password berbeda | User di halaman Step 1 | 1 | Isi Password: "Password123!" | | |
| | | | | | | 2 | Isi Konfirmasi Password: "Password456!" | | |
| | | | | | | 3 | Klik tombol "Selanjutnya" | Muncul pesan error "Konfirmasi password tidak cocok" | |
| TC.REG.001.005 | Vio | Email sudah terdaftar | Negative | Registrasi dengan email yang sudah ada | Akun dengan email "existing@example.com" sudah ada di sistem | 1 | Isi semua field Step 1 valid, Email: "existing@example.com" | | |
| | | | | | | 2 | Klik tombol "Selanjutnya" atau saat submit | Muncul pesan error "Email sudah terdaftar" | |
| TC.REG.002.001 | Vio | Registrasi berhasil — skip Step 2 | Positive | Registrasi dengan Step 1 valid, Step 2 dilewati | Email belum terdaftar di sistem | 1 | Isi semua field Step 1 dengan data valid | | |
| | | | | | | 2 | Klik "Selanjutnya" | | |
| | | | | | | 3 | Klik "Daftar" tanpa mengisi Step 2 | User berhasil mendaftarkan akun dan masuk ke halaman utama | |
| TC.REG.002.002 | Vio | Registrasi berhasil — Step 2 diisi | Positive | Registrasi dengan semua data terisi | Email belum terdaftar di sistem | 1 | Isi semua field Step 1 valid, klik "Selanjutnya" | | |
| | | | | | | 2 | Isi Kontak Darurat, Alamat, dan Sosial Media | | |
| | | | | | | 3 | Klik "Daftar" | User berhasil mendaftarkan akun; data Step 2 tersimpan | |

---

## Login

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.LOGIN.001.001 | Vio | Login berhasil | Positive | Login dengan kredensial valid | Akun customer aktif sudah terdaftar | 1 | Isi Email dan Password yang benar | | |
| | | | | | | 2 | Klik tombol "Masuk" | Berhasil masuk ke halaman utama sebagai customer | |
| TC.LOGIN.001.002 | Vio | Login field kosong | Negative | Submit form login tanpa mengisi field | User di halaman Login | 1 | Biarkan Email dan Password kosong | | |
| | | | | | | 2 | Klik tombol "Masuk" | Muncul pesan error di field Email dan Password | |
| TC.LOGIN.001.003 | Vio | Login email atau password salah | Negative | Login dengan password yang salah | Akun "budi@example.com" sudah terdaftar | 1 | Isi Email: "budi@example.com", Password: "SalahPassword!" | | |
| | | | | | | 2 | Klik tombol "Masuk" | Muncul pesan error "Email atau password salah" | |
| TC.LOGIN.001.004 | Vio | Login akun nonaktif | Negative | Login dengan akun yang dinonaktifkan admin | Akun customer dengan `is_active=false` | 1 | Isi Email dan Password akun nonaktif yang benar | | |
| | | | | | | 2 | Klik tombol "Masuk" | Login ditolak; muncul pesan akun nonaktif | |
| TC.LOGIN.002.001 | Vio | Logout berhasil | Positive | Customer logout dari sistem | Customer sudah login | 1 | Klik tombol "Keluar" | | |
| | | | | | | 2 | Coba akses halaman yang memerlukan login | Session dihapus; diarahkan kembali ke halaman Login | |
