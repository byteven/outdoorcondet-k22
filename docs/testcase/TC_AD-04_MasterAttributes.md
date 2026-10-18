# Test Case — AD-04: Master Attributes (Admin)

> **Modul:** AD-04 Master Attributes (Manajemen Atribut Varian)  
> **Referensi PRD:** Section 5.1 (AD-04)  
> **Versi PRD:** 3.2 FINAL  
> **Penyusun:** Vio Salman  
> **Tanggal:** 2026-10-18  

---

Pengujian modul Master Attributes (Atribut Varian Dinamis: Warna, Ukuran, Kapasitas) menggunakan metode Equivalence Partitioning untuk memvalidasi input data atribut produk pada skenario valid dan tidak valid, serta memvalidasi mekanisme pencegahan duplikasi nama atribut dan pembaruan data atribut. Pengujian mencakup verifikasi tampilan daftar atribut beserta kartu ringkasan (summary cards), pencarian realtime berdasarkan nama atau deskripsi, penambahan atribut baru, penyuntingan atribut, dan penghapusan atribut melalui dialog konfirmasi. Seluruh test case telah diuji otomatis via Playwright E2E dan menunjukkan hasil Pass.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- Halaman `/admin/attributes` hanya dapat diakses oleh admin terotentikasi (`access-admin`).
- Terdapat pada menu navigasi sidebar admin di bawah grup "Kelola Data" $\to$ "Atribut".
- **Summary Cards**: Menampilkan total jumlah jenis atribut yang terdaftar.
- Tabel daftar atribut menampilkan kolom: Atribut (Nama & Icon), Deskripsi, Dibuat Pada, dan Tombol Detail.
- **Search Realtime**: Debounce pencarian berdasarkan nama atau deskripsi atribut.
- Pengurutan tabel (*sortable*): Berdasarkan Nama Atribut dan Tanggal Pembuatan (`created_at`).
- **Tambah Atribut** (`AttributeFormDialog`):
  - Nama atribut (wajib, maksimal 50 karakter, unik).
  - Deskripsi (opsional, maksimal 500 karakter).
- **Detail & Edit Atribut** (`AttributeDetailDialog`):
  - Mengubah nama atribut dan deskripsi.
  - Memvalidasi keunikan nama atribut pada saat pembaruan data.
  - Penghapusan atribut didukung dialog konfirmasi modal (`DeleteConfirmDialog`).

---

## List & Search Atribut

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.016.001 | Vio | Halaman daftar atribut tampil | Positive | Admin membuka halaman manajemen atribut | Admin sudah login | 1 | Akses rute `/admin/attributes` | Halaman atribut tampil; tabel dan summary cards total atribut termuat dengan benar | Pass |
| TC.ADM.016.002 | Vio | Search atribut berdasarkan nama | Positive | Mencari atribut dengan kata kunci nama | Admin berada di halaman atribut | 1 | Ketik nama atribut di kolom pencarian (mis. "Warna") | Tabel menampilkan hanya atribut yang sesuai dengan kata kunci pencarian | Pass |

---

## Tambah Atribut (EP Valid & Invalid)

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.017.001 | Vio | Tambah atribut baru berhasil (EP Valid) | Positive | Menambahkan jenis atribut baru dengan data valid | Nama atribut belum terdaftar | 1 | Klik tombol "Tambah atribut" | Dialog tambah atribut terbuka | Pass |
| | | | | | | 2 | Isi Nama: "Material Frame", Deskripsi: "Bahan rangka tenda (Aluminium/Fiber)" | | |
| | | | | | | 3 | Klik tombol "Simpan atribut" | Notifikasi toast sukses muncul; atribut baru tampil di tabel daftar atribut | Pass |
| TC.ADM.017.002 | Vio | Validasi field wajib nama atribut (EP Invalid) | Negative | Submit form tambah atribut tanpa mengisi nama | Dialog tambah atribut terbuka | 1 | Biarkan field Nama Atribut kosong | | Pass |
| | | | | | | 2 | Klik tombol "Simpan atribut" | Form menolak submit; muncul pesan error "Nama atribut wajib diisi." | Pass |
| TC.ADM.017.003 | Vio | Tambah atribut nama duplikat (EP Invalid) | Negative | Input nama atribut yang sudah ada di sistem | Atribut dengan nama target sudah ada | 1 | Isi Nama dengan nama atribut yang sudah terdaftar | | Pass |
| | | | | | | 2 | Klik tombol "Simpan atribut" | Sistem menolak; muncul pesan error validasi "Nama atribut sudah terdaftar." | Pass |

---

## Edit Atribut

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.018.001 | Vio | Edit data atribut berhasil | Positive | Mengubah deskripsi atribut melalui dialog detail | Terdapat atribut terdaftar di tabel | 1 | Klik baris atribut target pada tabel | Dialog Detail & Edit Atribut terbuka | Pass |
| | | | | | | 2 | Ubah field Deskripsi atribut | | |
| | | | | | | 3 | Klik tombol "Simpan perubahan" | Notifikasi toast sukses muncul; deskripsi atribut terupdate di dialog dan tabel | Pass |

---

## Hapus Atribut

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.019.001 | Vio | Hapus atribut dengan konfirmasi | Positive | Menghapus atribut melalui tombol hapus pada dialog detail | Terdapat atribut target di tabel | 1 | Klik baris atribut target untuk membuka dialog detail | Dialog Detail & Edit Atribut terbuka | Pass |
| | | | | | | 2 | Klik tombol "Hapus" pada dialog | Modal konfirmasi penghapusan terbuka | |
| | | | | | | 3 | Klik tombol konfirmasi "Hapus" | Notifikasi toast sukses muncul; atribut terhapus dan hilang dari tabel | Pass |

