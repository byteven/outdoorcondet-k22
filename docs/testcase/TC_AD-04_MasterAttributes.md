# Test Case — AD-04: Master Attributes (Admin)

> **Modul:** AD-04 Master Attributes (Manajemen Atribut Varian)  
> **Referensi PRD:** Section 5.1 (AD-04)  
> **Versi PRD:** 3.2 FINAL  
> **Penyusun:** Alvin  
> **Tanggal:** 2026-10-21  

---

Pengujian modul Master Attributes (Atribut Varian Dinamis: Warna, Ukuran, Kapasitas) menggunakan metode Equivalence Partitioning (EP), Boundary Value Analysis (BVA), Decision Table (DT), dan Use Case Testing untuk memvalidasi input data atribut produk pada skenario valid dan tidak valid, mekanisme pencegahan duplikasi nama atribut, pembaruan data atribut, serta penghapusan atribut. Pengujian mencakup verifikasi tampilan daftar atribut beserta kartu ringkasan (summary cards), pencarian realtime berdasarkan nama atau deskripsi, penambahan atribut baru, penyuntingan atribut, dan penghapusan atribut melalui dialog konfirmasi. Seluruh test case disiapkan untuk otomasi UI dengan **Selenium WebDriver** (WebDriverWait + Page Object Model); kolom *Actual Result* diisi saat eksekusi.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- Halaman `/admin/attributes` hanya dapat diakses oleh admin terotentikasi (`access-admin`).
- **Summary card**: "Total atribut" (jumlah jenis atribut terdaftar).
- Tabel daftar atribut menampilkan kolom: Atribut (Nama & Icon), Deskripsi, Dibuat Pada, dan Tombol Detail.
- **Search Realtime**: debounce berdasarkan nama atau deskripsi atribut (aria-label "Cari atribut"; placeholder "Cari nama atau deskripsi atribut...").
- **Pengurutan tabel (sortable)**: berdasarkan Nama Atribut dan Tanggal Pembuatan (`created_at`) (SortButton).
- **Tambah Atribut** (`AttributeFormDialog`, form id `create-attribute-form`):
  - Nama atribut (wajib, maksimal 50 karakter, unik).
  - Deskripsi (opsional, maksimal 500 karakter).
- **Detail & Edit Atribut** (`AttributeDetailDialog`, form id `update-attribute-form`; field `edit-attribute-name`, `edit-attribute-description`):
  - Mengubah nama atribut dan deskripsi.
  - Memvalidasi keunikan nama atribut pada saat pembaruan data.
  - Penghapusan atribut didukung `DeleteConfirmDialog` (judul "Hapus atribut ...?", tombol konfirmasi "Hapus").
- Catatan: foreign key `product_variant_values.attribute_id` menggunakan `cascadeOnDelete` sehingga penghapusan atribut akan menghapus nilai atribut pada varian produk terkait, bukan ditolak.

**Catatan otomasi Selenium:** gunakan locator prioritas `id` (`#attribute-name`, `#attribute-description`, `#edit-attribute-name`, `#edit-attribute-description`); tombol by role/nama ("Tambah atribut", "Simpan atribut", "Simpan Perubahan", "Hapus", "Batal"); gunakan `WebDriverWait` untuk toast dan debounce; gunakan data uji unik dengan timestamp.

---

## Metode Teknik yang Digunakan

| Teknik | Penerapan pada Modul AD-04 |
|---|---|
| Equivalence Partitioning (EP) | Kelas valid/invalid input nama dan deskripsi atribut, serta kata kunci pencarian. |
| Boundary Value Analysis (BVA) | Batas panjang nama (50) dan deskripsi (500) karakter. |
| Decision Table (DT) | Kombinasi kata kunci pencarian (ada/tidak ada hasil) × empty state; sort asc/desc. |
| Use Case Testing | Alur end-to-end tambah → edit → hapus atribut. |

---

## List & Search Atribut

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.016.001 | Alvin | Halaman daftar atribut tampil | Use Case | Positive | Admin membuka halaman manajemen atribut | Admin sudah login | 1 | Akses rute `/admin/attributes` | Halaman atribut tampil; tabel dan summary card "Total atribut" termuat dengan benar | |
| TC.ADM.016.002 | Alvin | Search atribut berdasarkan nama (ada hasil) | EP (Valid Class) | Positive | Mencari atribut dengan kata kunci nama | Admin berada di halaman atribut, ada data | 1 | Ketik nama atribut di kolom pencarian (aria-label "Cari atribut"), mis. "Warna"; tunggu 700ms | Tabel menampilkan hanya atribut yang sesuai dengan kata kunci pencarian | |
| TC.ADM.016.003 | Alvin | Search atribut berdasarkan deskripsi (ada hasil) | EP (Valid Class) | Positive | Mencari atribut dengan kata kunci deskripsi | Admin berada di halaman atribut, ada data | 1 | Ketik kata kunci yang ada di deskripsi atribut; tunggu 700ms | Tabel menampilkan atribut yang deskripsinya cocok | |
| TC.ADM.016.004 | Alvin | Search atribut tidak ada hasil | EP (Invalid Class) | Negative | Mencari atribut dengan kata kunci yang tidak ada | Admin berada di halaman atribut, ada data | 1 | Ketik kata kunci acak, mis. "ZZZZZZ"; tunggu 700ms | Empty state "Atribut tidak ditemukan" dan tombol "Reset pencarian" tampil | |
| TC.ADM.016.005 | Alvin | Sort atribut berdasarkan nama | DT | Positive | Mengubah urutan daftar atribut | Data atribut ≥ 2 | 1 | Klik header "Atribut" lalu klik lagi | Urutan berganti ascending → descending | |

---

## Tambah Atribut

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.017.001 | Alvin | Tambah atribut baru berhasil (EP Valid) | EP (Valid Class) | Positive | Menambahkan jenis atribut baru dengan data valid | Nama atribut belum terdaftar | 1 | Klik tombol "Tambah atribut" | Dialog "Tambah atribut baru" terbuka | |
| | | | | | | | 2 | Isi Nama: "Material Frame", Deskripsi: "Bahan rangka tenda (Aluminium/Fiber)" | | |
| | | | | | | | 3 | Klik tombol "Simpan atribut" | Toast "Atribut Material Frame berhasil ditambahkan."; atribut baru tampil di tabel | |
| TC.ADM.017.002 | Alvin | Validasi field wajib nama atribut (EP Invalid) | EP (Invalid Class) | Negative | Submit form tambah atribut tanpa mengisi nama | Dialog tambah atribut terbuka | 1 | Biarkan field Nama Atribut kosong | | |
| | | | | | | | 2 | Klik tombol "Simpan atribut" | Form menolak submit; muncul pesan error "Nama atribut wajib diisi." | |
| TC.ADM.017.003 | Alvin | Nama atribut 51 karakter (BVA Above Max) | BVA | Negative | Input nama melebihi batas maksimal 50 karakter | Dialog tambah atribut terbuka | 1 | Isi Nama dengan 51 karakter | | |
| | | | | | | | 2 | Klik tombol "Simpan atribut" | Muncul pesan error "Nama atribut maksimal 50 karakter." | |
| TC.ADM.017.004 | Alvin | Nama atribut 50 karakter (BVA At Max) | BVA | Positive | Input nama tepat pada batas maksimal 50 karakter | Dialog tambah atribut terbuka | 1 | Isi Nama dengan 50 karakter | | |
| | | | | | | | 2 | Klik tombol "Simpan atribut" | Atribut berhasil disimpan (boundary valid) | |
| TC.ADM.017.005 | Alvin | Tambah atribut nama duplikat (EP Invalid) | EP (Invalid Class) | Negative | Input nama atribut yang sudah ada di sistem | Atribut dengan nama target sudah ada | 1 | Isi Nama dengan nama atribut yang sudah terdaftar | | |
| | | | | | | | 2 | Klik tombol "Simpan atribut" | Sistem menolak; muncul pesan error "Nama atribut sudah terdaftar." | |
| TC.ADM.017.006 | Alvin | Deskripsi 501 karakter (BVA Above Max) | BVA | Negative | Input deskripsi melebihi batas maksimal 500 karakter | Dialog tambah atribut terbuka | 1 | Isi Deskripsi dengan 501 karakter | | |
| | | | | | | | 2 | Klik tombol "Simpan atribut" | Muncul pesan error "Deskripsi maksimal 500 karakter." | |

---

## Edit Atribut

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.018.001 | Alvin | Edit data atribut berhasil | EP (Valid Class) | Positive | Mengubah deskripsi atribut melalui dialog detail | Terdapat atribut terdaftar di tabel | 1 | Klik baris atribut target pada tabel | Dialog "Detail & Edit Atribut" terbuka | |
| | | | | | | | 2 | Ubah field `#edit-attribute-description` | | |
| | | | | | | | 3 | Klik tombol "Simpan Perubahan" | Toast "Perubahan atribut ... berhasil disimpan."; deskripsi atribut terupdate di dialog dan tabel | |
| TC.ADM.018.002 | Alvin | Edit nama atribut kosong (EP Invalid) | EP (Invalid Class) | Negative | Submit form edit tanpa nama | Dialog detail atribut terbuka | 1 | Kosongkan field `#edit-attribute-name` | | |
| | | | | | | | 2 | Klik tombol "Simpan Perubahan" | Muncul pesan error "Nama atribut wajib diisi." | |
| TC.ADM.018.003 | Alvin | Edit nama atribut duplikat (EP Invalid) | EP (Invalid Class) | Negative | Mengubah nama atribut menjadi nama yang sudah terdaftar | Terdapat ≥ 2 atribut terdaftar | 1 | Ubah `#edit-attribute-name` menjadi nama atribut lain yang sudah ada | | |
| | | | | | | | 2 | Klik tombol "Simpan Perubahan" | Muncul pesan error "Nama atribut sudah terdaftar." | |

---

## Hapus Atribut

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.019.001 | Alvin | Hapus atribut dengan konfirmasi | Use Case | Positive | Menghapus atribut melalui tombol hapus pada dialog detail | Terdapat atribut target di tabel | 1 | Klik baris atribut target untuk membuka dialog detail | Dialog "Detail & Edit Atribut" terbuka | |
| | | | | | | | 2 | Klik tombol "Hapus" pada dialog | `DeleteConfirmDialog` terbuka (judul "Hapus atribut ...?") | |
| | | | | | | | 3 | Klik tombol konfirmasi "Hapus" | Toast "Atribut ... berhasil dihapus."; atribut terhapus (soft delete) dan hilang dari tabel | |
| TC.ADM.019.002 | Alvin | Hapus atribut yang dipakai varian (cascade) | EP (Integration) | Positive | Verifikasi perilaku penghapusan atribut yang terpakai pada varian produk | Atribut terpakai pada ≥ 1 varian produk | 1 | Ulangi langkah hapus pada atribut terpakai | Atribut dan nilai atribut pada varian terkait terhapus (cascade); catatan: jika aturan bisnis berubah menjadi penolakan, perbarui expected result | |
