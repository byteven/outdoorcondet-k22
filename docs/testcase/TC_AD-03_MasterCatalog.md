# Test Case — AD-03: Master Catalog (Admin)

> **Modul:** AD-03 Master Catalog (Katalog Barang / Kategori)  
> **Referensi PRD:** Section 5.1 (AD-03)  
> **Versi PRD:** 3.2 FINAL  
> **Penyusun:** Vio Salman  
> **Tanggal:** 2026-10-18  

---

Pengujian modul Master Catalog menggunakan metode Equivalence Partitioning untuk memvalidasi input data kategori katalog pada skenario valid dan tidak valid, serta pengujian integritas relasi referensial saat penghapusan kategori katalog. Pengujian mencakup verifikasi tampilan daftar katalog, pencarian realtime berdasarkan nama, penambahan kategori baru, validasi keunikan nama/slug, pembaruan data kategori, dan penghapusan kategori kosong. Seluruh test case telah diotomasi via Playwright E2E dan menunjukkan hasil Pass.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- Halaman `/admin/categories` hanya dapat diakses oleh admin terotentikasi (`access-admin`).
- Tabel menampilkan kolom: Nama Kategori, Slug URL, Jumlah Produk, Status, dan Aksi.
- **Search realtime**: Debounce pencarian berdasarkan nama dan slug kategori.
- **Tambah Kategori** via `CategoryFormDialog` (field wajib: Nama Kategori; field opsional: Slug URL, Deskripsi, Status Aktif).
- **Edit Kategori** via dialog edit (pembaruan nama, slug, deskripsi, dan toggle status aktif/nonaktif).
- **Hapus Kategori**: Kategori hanya dapat dihapus jika tidak memiliki produk yang terikat di dalamnya.

---

## List & Search Katalog

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.005.001 | Vio | Halaman daftar kategori tampil | Positive | Admin membuka halaman katalog | Admin sudah login | 1 | Buka halaman `/admin/categories` | Halaman katalog terbuka; tabel kategori tampil dengan kolom Nama, Slug, Status, dan Aksi | Pass |
| TC.ADM.005.002 | Vio | Search kategori berdasarkan nama | Positive | Mencari kategori dengan kata kunci nama | Admin berada di halaman katalog, ada data kategori | 1 | Ketik nama kategori pada kolom pencarian (mis. "Tenda") | Tabel menampilkan hanya data kategori yang namanya cocok dengan kata kunci | Pass |

---

## Tambah Kategori Katalog

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.006.001 | Vio | Tambah kategori berhasil (EP Valid) | Positive | Admin menambah kategori baru dengan data valid | Nama kategori belum pernah digunakan | 1 | Klik tombol "Tambah kategori" | | Pass |
| | | | | | | 2 | Isi Nama: "Tenda & Shelter" | | |
| | | | | | | 3 | Klik "Simpan" | Muncul toast notifikasi sukses; kategori baru muncul pada tabel kategori | Pass |
| TC.ADM.006.002 | Vio | Validasi field wajib tambah kategori (EP Invalid) | Negative | Submit form tambah kategori tanpa mengisi nama | Admin membuka dialog tambah kategori | 1 | Kosongkan field Nama Kategori | | Pass |
| | | | | | | 2 | Klik "Simpan" | Muncul pesan error validasi "Nama kategori wajib diisi." | Pass |
| TC.ADM.006.003 | Vio | Tambah kategori nama duplikat (EP Invalid) | Negative | Input nama kategori yang sudah terdaftar di sistem | Kategori dengan nama yang sama sudah ada | 1 | Isi Nama dengan nama kategori yang sudah ada | | Pass |
| | | | | | | 2 | Klik "Simpan" | Form ditolak; muncul pesan error "Nama kategori sudah terdaftar." | Pass |

---

## Edit Kategori Katalog

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.007.001 | Vio | Edit data kategori berhasil | Positive | Admin memperbarui data kategori | Ada kategori yang sudah terdaftar | 1 | Klik tombol "Edit" atau baris kategori pada tabel | | Pass |
| | | | | | | 2 | Ubah Nama atau Deskripsi kategori | | |
| | | | | | | 3 | Klik "Simpan perubahan" | Notifikasi sukses tampil; nama atau deskripsi kategori di tabel terupdate | Pass |

---

## Hapus Kategori Katalog

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.008.001 | Vio | Hapus kategori kosong berhasil | Positive | Admin menghapus kategori yang tidak memiliki produk | Kategori tidak terikat pada produk apapun | 1 | Klik tombol "Hapus" pada kategori target | | Pass |
| | | | | | | 2 | Klik konfirmasi "Hapus" pada dialog konfirmasi | Kategori berhasil dihapus dari sistem; baris kategori hilang dari tabel | Pass |

