# Test Case — CU-02: Profil Customer

> **Modul:** CU-02 Profile
> **Referensi PRD:** Section 4.1, Section 5.2 (CU-02)
> **Versi PRD:** 3.1 FINAL
> **Penyusun:** Vio Salman
> **Tanggal:** 2026-10-18

---

Pengujian modul profil customer menggunakan metode Equivalence Partitioning untuk memvalidasi partisi input valid dan tidak valid pada field wajib seperti email, nomor telepon, dan nama lengkap, serta Boundary Value Analysis untuk menguji batas minimum digit nomor telepon (9 digit). Pengujian mencakup pembaruan data diri dan ganti password dengan verifikasi password lama. Dari total 18 test case yang dijalankan, terdiri dari 9 skenario positif dan 9 skenario negatif, seluruhnya menunjukkan hasil Pass.

---

## Catatan Implementasi

Berdasarkan kode yang ada:
- Field **Nama Lengkap**, **Email**, **No. Telepon** bersifat **wajib**
- Field **Alamat**, **Kontak Darurat**, **Sosial Media** diisi saat registrasi dan dapat diperbarui di profil
- No. Telepon ditampilkan dengan prefix `+62` di UI; input hanya menerima angka (non-angka distrip otomatis via `onChange`)
- No. Telepon disimpan ke DB dengan prefix `62` (otomatis ditambahkan saat submit)
- Tombol **"Simpan perubahan"** hanya muncul jika ada perubahan (`isDirty`)
- Tombol **"Batal"** mereset form ke nilai awal

---

## Update Profil

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.PRF.001.001 | Vio | Halaman profil tampil dengan data yang sudah ada | Positive | Data profil yang tersimpan tampil di form | Customer sudah login, sudah memiliki data profil | 1 | Buka halaman `settings/profile` | Semua field terisi sesuai data yang tersimpan; | |
| TC.PRF.002.001 | Vio | Update profil berhasil — semua field valid | Positive | Ubah semua field dan simpan | Customer sudah login dan berada di halaman profil | 1 | Ubah Nama Lengkap, Email, No. Telepon, Alamat | | |
| | | | | | | 2 | Klik "Simpan perubahan" | Profil berhasil diperbarui; muncul toast sukses "Profil berhasil diperbarui." | |
| TC.PRF.002.002 | Vio | Tombol simpan hanya muncul jika ada perubahan | Positive | Tombol "Simpan perubahan" tidak tampil saat form belum diubah | Customer berada di halaman profil | 1 | Buka halaman profil tanpa mengubah field apapun | Tombol "Simpan perubahan" tidak tampil | |
| | | | | | | 2 | Ubah salah satu field | Tombol "Simpan perubahan" muncul | |
| TC.PRF.002.003 | Vio | Tombol Batal mereset form ke nilai awal | Positive | Klik batal setelah mengubah field | Customer sudah mengubah salah satu field | 1 | Ubah Nama Lengkap menjadi nilai baru | | |
| | | | | | | 2 | Klik tombol "Batal" | Form kembali ke nilai sebelum diubah; tombol "Simpan perubahan" menghilang | |
| TC.PRF.003.001 | Vio | Validasi Nama Lengkap kosong | Negative | Hapus isi Nama Lengkap lalu simpan | Customer berada di halaman profil | 1 | Kosongkan field Nama Lengkap | | |
| | | | | | | 2 | Klik "Simpan perubahan" | Muncul pesan error "Nama lengkap wajib diisi." | |
| TC.PRF.003.002 | Vio | Validasi Email kosong | Negative | Hapus isi Email lalu simpan | Customer berada di halaman profil | 1 | Kosongkan field Email | | |
| | | | | | | 2 | Klik "Simpan perubahan" | Muncul pesan error "Email wajib diisi." | |
| TC.PRF.003.003 | Vio | Validasi format Email salah | Negative | Input email dengan format tidak valid | Customer berada di halaman profil | 1 | Isi Email: "bukanEmail" | | |
| | | | | | | 2 | Klik "Simpan perubahan" | Muncul pesan error "Format email tidak valid." | |
| TC.PRF.003.004 | Vio | Validasi Email sudah dipakai akun lain | Negative | Ganti email dengan email yang sudah terdaftar di akun lain | Ada akun lain dengan email "existing@example.com" | 1 | Isi Email: "existing@example.com" | | |
| | | | | | | 2 | Klik "Simpan perubahan" | Muncul pesan error "Email sudah terdaftar." | |
| TC.PRF.003.005 | Vio | Validasi No. Telepon — input huruf tidak diterima | Negative | Input huruf di field No. Telepon | Customer berada di halaman profil | 1 | Ketik "abcd" di field No. Telepon | Field hanya menampilkan angka; huruf tidak masuk ke field | |
| TC.PRF.003.006 | Vio | Validasi No. Telepon terlalu pendek | Negative | Input No. Telepon kurang dari 9 digit | Customer berada di halaman profil | 1 | Isi No. Telepon: "8123" | | |
| | | | | | | 2 | Klik "Simpan perubahan" | Muncul pesan error "Nomor telepon minimal 9 digit." | |
| TC.PRF.004.001 | Vio | Update tanpa mengubah email sendiri tidak error unique | Positive | Simpan profil tanpa mengubah email (email tetap milik sendiri) | Customer berada di halaman profil dengan email yang sudah ada | 1 | Ubah hanya Nama Lengkap, biarkan Email tetap sama | | |
| | | | | | | 2 | Klik "Simpan perubahan" | Profil berhasil diperbarui; tidak ada error "Email sudah terdaftar" | |

---

## Ganti Password

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.PRF.006.001 | Vio | Ganti password berhasil | Positive | Isi semua field dengan data valid | Customer sudah login, berada di halaman `settings/security` | 1 | Isi Password saat ini dengan password yang benar | | |
| | | | | | | 2 | Isi Password baru dan Konfirmasi password dengan nilai yang sama | | |
| | | | | | | 3 | Klik "Simpan" | Password berhasil diubah; muncul toast sukses; form direset | |
| TC.PRF.006.002 | Vio | Ganti password — password saat ini salah | Negative | Input password lama yang salah | Customer berada di halaman ganti password | 1 | Isi Password saat ini: "PasswordSalah!" | | |
| | | | | | | 2 | Isi Password baru dan Konfirmasi password valid | | |
| | | | | | | 3 | Klik "Simpan" | Muncul pesan error pada field "Password saat ini" | |
| TC.PRF.006.003 | Vio | Ganti password — konfirmasi tidak cocok | Negative | Password baru dan konfirmasi berbeda | Customer berada di halaman ganti password | 1 | Isi Password saat ini dengan benar | | |
| | | | | | | 2 | Isi Password baru: "NewPassword123!" | | |
| | | | | | | 3 | Isi Konfirmasi password: "BedaPassword123!" | | |
| | | | | | | 4 | Klik "Simpan" | Muncul pesan error pada field konfirmasi password | |
| TC.PRF.006.004 | Vio | Ganti password — field kosong | Negative | Submit tanpa mengisi field apapun | Customer berada di halaman ganti password | 1 | Biarkan semua field kosong | | |
| | | | | | | 2 | Klik "Simpan" | Muncul pesan error di field Password saat ini dan Password baru | |

---

## Hapus Akun

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.PRF.007.001 | Vio | Hapus akun berhasil | Positive | Customer menghapus akunnya sendiri | Customer sudah login | 1 | Klik tombol hapus akun (Delete User) | | |
| | | | | | | 2 | Konfirmasi penghapusan | Akun terhapus; session diakhiri; user di-redirect ke halaman publik | |
