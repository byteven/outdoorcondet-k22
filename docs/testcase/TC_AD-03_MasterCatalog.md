# Test Case — AD-03: Master Catalog (Admin)

> **Modul:** AD-03 Master Catalog (Katalog Barang / Kategori)  
> **Referensi PRD:** Section 5.1 (AD-03)  
> **Versi PRD:** 3.2 FINAL  
> **Penyusun:** Alvin  
> **Tanggal:** 2026-10-21  

---

Pengujian modul Master Catalog menggunakan metode Equivalence Partitioning (EP), Boundary Value Analysis (BVA), Decision Table (DT), dan Use Case Testing untuk memvalidasi input data kategori katalog pada skenario valid dan tidak valid, perilaku pencarian/sortir/pagination, serta penghapusan kategori. Pengujian mencakup verifikasi tampilan daftar katalog, pencarian realtime berdasarkan nama/slug/deskripsi, penambahan kategori baru, validasi keunikan slug, pembaruan data kategori, dan penghapusan kategori. Seluruh test case disiapkan untuk otomasi UI dengan **Selenium WebDriver** (WebDriverWait + Page Object Model); kolom *Actual Result* diisi saat eksekusi.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- Halaman `/admin/categories` hanya dapat diakses oleh admin terotentikasi (`access-admin`).
- Tabel menampilkan kolom: Kategori, Slug, Deskripsi, Dibuat Pada, dan Aksi (Detail).
- **Summary card**: "Total kategori".
- **Search realtime**: debounce 500ms berdasarkan nama, slug, dan deskripsi kategori (aria-label "Cari kategori").
- **Sort**: kolom Kategori, Slug, dan Dibuat Pada (SortButton, siklus asc → desc → default).
- **Tambah Kategori** via `CategoryFormDialog` (form id `create-category-form`; field wajib: Nama Kategori; opsional: Slug URL, Deskripsi). Slug otomatis dari nama bila kosong.
- **Edit Kategori** via dialog detail (form id `update-category-form`; field `edit-category-name`, `edit-category-slug`, `edit-category-description`; tombol "Simpan Perubahan").
- **Hapus Kategori** via `DeleteConfirmDialog` (tombol "Hapus", konfirmasi "Hapus"); bersifat soft delete. Catatan: foreign key `products.category_id` menggunakan `cascadeOnDelete` sehingga kategori yang memiliki produk akan menghapus produk terkait, bukan ditolak.
- Kategori tidak memiliki status aktif/nonaktif (field ini tidak ada pada model Category).

**Catatan otomasi Selenium:** gunakan locator prioritas `id` (`#category-name`, `#category-slug`, `#category-description`, `#edit-category-name`, dll.) dan tombol by role/nama ("Tambah kategori", "Simpan kategori", "Simpan Perubahan", "Hapus", "Batal"); gunakan `WebDriverWait` untuk toast dan debounce pencarian (tunggu 700ms); gunakan data uji unik dengan timestamp.

---

## Metode Teknik yang Digunakan

| Teknik | Penerapan pada Modul AD-03 |
|---|---|
| Equivalence Partitioning (EP) | Kelas valid/invalid input nama, slug, deskripsi, dan kata kunci pencarian. |
| Boundary Value Analysis (BVA) | Batas panjang nama (100), slug (120), dan deskripsi (1000) karakter. |
| Decision Table (DT) | Kombinasi kata kunci pencarian (ada/tidak ada hasil) × empty state. |
| Use Case Testing | Alur end-to-end tambah → edit → hapus kategori. |

---

## List & Search Katalog

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.005.001 | Alvin | Halaman daftar kategori tampil | Use Case | Positive | Admin membuka halaman katalog | Admin sudah login | 1 | Buka halaman `/admin/categories` | Halaman katalog terbuka; tabel kategori tampil dengan kolom Kategori, Slug, Deskripsi, Dibuat Pada, Aksi; summary card "Total kategori" termuat | |
| TC.ADM.005.002 | Alvin | Search kategori berdasarkan nama (ada hasil) | EP (Valid Class) | Positive | Mencari kategori dengan kata kunci yang cocok | Admin berada di halaman katalog, ada data kategori | 1 | Ketik kata kunci pada input pencarian (aria-label "Cari kategori"), mis. "Tenda"; tunggu 700ms | Tabel menampilkan hanya data kategori yang namanya/slug/deskripsinya cocok | |
| TC.ADM.005.003 | Alvin | Search kategori tidak ada hasil | EP (Invalid Class) | Negative | Mencari kategori dengan kata kunci yang tidak ada | Admin berada di halaman katalog, ada data kategori | 1 | Ketik kata kunci acak, mis. "ZZZZZZ"; tunggu 700ms | Empty state "Kategori tidak ditemukan" dan tombol "Reset pencarian" tampil | |
| TC.ADM.005.004 | Alvin | Reset pencarian | DT | Positive | Mengembalikan daftar setelah pencarian kosong | Empty state pencarian tampil | 1 | Klik tombol "Reset pencarian" | Tabel menampilkan seluruh kategori; summary card kembali ke total awal | |
| TC.ADM.005.005 | Alvin | Sort kategori berdasarkan nama | DT | Positive | Mengubah urutan daftar kategori | Data kategori ≥ 2 | 1 | Klik header "Kategori" lalu klik lagi | Urutan berganti ascending → descending | |

---

## Tambah Kategori Katalog

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.006.001 | Alvin | Tambah kategori berhasil (semua field) | EP (Valid Class) | Positive | Admin menambah kategori baru dengan data valid | Nama kategori belum pernah digunakan | 1 | Klik tombol "Tambah kategori" | Dialog "Tambah kategori baru" terbuka | |
| | | | | | | | 2 | Isi Nama: "Tenda & Shelter", Slug: "tenda-shelter", Deskripsi: "Kategori tenda" | | |
| | | | | | | | 3 | Klik "Simpan kategori" | Toast "Kategori Tenda & Shelter berhasil ditambahkan."; kategori baru muncul pada tabel | |
| TC.ADM.006.002 | Alvin | Validasi field wajib nama (EP Invalid) | EP (Invalid Class) | Negative | Submit form tambah kategori tanpa mengisi nama | Dialog tambah kategori terbuka | 1 | Kosongkan field Nama Kategori | | |
| | | | | | | | 2 | Klik "Simpan kategori" | Muncul pesan error "Nama kategori wajib diisi." | |
| TC.ADM.006.003 | Alvin | Nama kategori 101 karakter (BVA Above Max) | BVA | Negative | Input nama melebihi batas maksimal 100 karakter | Dialog tambah kategori terbuka | 1 | Isi Nama dengan 101 karakter | | |
| | | | | | | | 2 | Klik "Simpan kategori" | Muncul pesan error "Nama kategori maksimal 100 karakter." | |
| TC.ADM.006.004 | Alvin | Nama kategori 100 karakter (BVA At Max) | BVA | Positive | Input nama tepat pada batas maksimal 100 karakter | Dialog tambah kategori terbuka | 1 | Isi Nama dengan 100 karakter | | |
| | | | | | | | 2 | Klik "Simpan kategori" | Kategori berhasil disimpan (boundary valid) | |
| TC.ADM.006.005 | Alvin | Tambah kategori slug duplikat (EP Invalid) | EP (Invalid Class) | Negative | Input nama yang menghasilkan slug yang sudah terdaftar | Kategori dengan slug yang sama sudah ada | 1 | Isi Nama dengan nama yang slug-nya sudah ada | | |
| | | | | | | | 2 | Klik "Simpan kategori" | Form ditolak; muncul pesan error "Slug sudah digunakan oleh kategori lain." | |
| TC.ADM.006.006 | Alvin | Deskripsi 1001 karakter (BVA Above Max) | BVA | Negative | Input deskripsi melebihi batas maksimal 1000 karakter | Dialog tambah kategori terbuka | 1 | Isi Deskripsi dengan 1001 karakter | | |
| | | | | | | | 2 | Klik "Simpan kategori" | Muncul pesan error "Deskripsi maksimal 1000 karakter." | |

---

## Edit Kategori Katalog

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.007.001 | Alvin | Edit data kategori berhasil | EP (Valid Class) | Positive | Admin memperbarui data kategori | Ada kategori yang sudah terdaftar | 1 | Klik tombol "Detail" pada baris kategori | Dialog "Detail & Edit Kategori" terbuka | |
| | | | | | | | 2 | Ubah field `#edit-category-name` dan `#edit-category-description` | | |
| | | | | | | | 3 | Klik "Simpan Perubahan" | Toast "Perubahan kategori ... berhasil disimpan."; data terupdate di tabel | |
| TC.ADM.007.002 | Alvin | Edit nama kategori kosong (EP Invalid) | EP (Invalid Class) | Negative | Submit form edit tanpa nama | Dialog detail kategori terbuka | 1 | Kosongkan field `#edit-category-name` | | |
| | | | | | | | 2 | Klik "Simpan Perubahan" | Muncul pesan error "Nama kategori wajib diisi." | |

---

## Hapus Kategori Katalog

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.008.001 | Alvin | Hapus kategori kosong berhasil | Use Case | Positive | Admin menghapus kategori yang tidak memiliki produk | Kategori tidak terikat pada produk apapun | 1 | Klik tombol "Detail" pada kategori target | Dialog detail terbuka | |
| | | | | | | | 2 | Klik tombol "Hapus" | `DeleteConfirmDialog` terbuka (judul "Hapus kategori ...?") | |
| | | | | | | | 3 | Klik konfirmasi "Hapus" | Kategori berhasil dihapus (soft delete); baris kategori hilang dari tabel; toast sukses | |
| TC.ADM.008.002 | Alvin | Hapus kategori yang memiliki produk (cascade) | EP (Integration) | Positive | Verifikasi perilaku penghapusan kategori berisi produk | Kategori memiliki ≥ 1 produk | 1 | Ulangi langkah hapus pada kategori berisi produk | Kategori dan produk terkait terhapus (cascade) sesuai perilaku basis data; catatan: jika aturan bisnis berubah menjadi penolakan, harap perbarui expected result | |
