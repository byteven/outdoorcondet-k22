# Test Case — AD-05: Product Management (Admin)

> **Modul:** AD-05 Product Management (Manajemen Data Barang)  
> **Referensi PRD:** Section 5.1 (AD-05) & 5.1.1  
> **Versi PRD:** 3.2 FINAL  
> **Penyusun:** Alvin  
> **Tanggal:** 2026-10-21  

---

Pengujian modul Product Management (manajemen data barang dan alat sewa) menerapkan metode Equivalence Partitioning (EP), Boundary Value Analysis (BVA), Decision Table (DT), State Transition (ST), dan Use Case Testing untuk memvalidasi batasan nilai numerik pada stok fisik dan tarif sewa, aturan unggah berkas foto katalog, penetapan tarif sewa multi-durasi (harian dan berdurasi tertentu), serta uang jaminan (deposit). Selain itu, pengujian memvalidasi keunikan slug produk dan SKU varian dari sisi server, dialog stepper formulir produk (Info Dasar, Varian & Stok, Gambar & Publikasi), serta perubahan status aktif/nonaktif produk. Seluruh test case disiapkan untuk otomasi UI dengan **Selenium WebDriver** (WebDriverWait + Page Object Model); kolom *Actual Result* diisi saat eksekusi.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- Halaman `/admin/products` dapat diakses oleh admin (`access-admin`).
- **Summary cards**: Total Produk, Produk Aktif, Total Stok Varian (total, active, inactive, total_stock).
- Tabel menampilkan kolom: Produk (Nama & Slug), Kategori, Varian/Stok, Harga Mulai, Status, dan Tombol Detail.
- **Pencarian** (debounce) berdasarkan nama, slug, atau deskripsi produk (aria-label "Cari produk"; placeholder "Cari nama, slug, atau deskripsi produk...").
- **Filter** berdasarkan kategori barang (select "Semua kategori") dan status produk (Semua / Aktif / Nonaktif).
- **Formulir 3-Step Stepper** (`ProductFormDialog`, form id `create-product-form`):
  - **Step 0 (Info Produk)**: Kategori (wajib, `#product-category`), Nama produk (wajib, `#product-name`, max 100), Slug URL (opsional, `#product-slug`, max 120), Deskripsi (opsional, `#product-description`, max 1000), Status aktif (switch).
  - **Step 1 (Varian & Stok)**: SKU (wajib & unik, `#variant-sku-{i}`, max 50), Stok fisik (min. 0, max 10000, `#variant-stock-{i}`), Harga sewa per hari (min. Rp0, max 100.000.000, `#variant-price-{i}`), Uang jaminan / deposit per unit (`#variant-deposit-{i}`, min 0, max 100.000.000), Berat (gram, `#variant-weight-{i}`, min 0, max 1.000.000), Atribut nilai varian (max 10 per varian), Tarif sewa multi-durasi (Durasi hari: min 2, max 365; Harga: min 0, max 100.000.000; max 20 opsi durasi).
  - **Step 2 (Gambar & Publikasi)**: Unggah file gambar (`#product-images`, maksimal 5 file, maks 2 MB per file, format JPG/PNG/WebP, penentuan foto utama).
- **Detail & Edit Produk** (`ProductDetailDialog`, form id `update-product-form`): menampilkan rincian varian, tarif multi-durasi, jaminan; memungkinkan perubahan deskripsi, stok, status aktif, atau penghapusan produk. Tombol "Ubah" masuk mode edit, "Simpan perubahan" menyimpan, "Tutup" menutup.
- **Status aktif** produk dapat diubah melalui switch "Tampilkan di katalog" pada mode edit (ActiveSwitch).
- **Penghapusan produk** via `DeleteConfirmDialog` (judul "Hapus produk ...?", tombol konfirmasi "Hapus"); bersifat soft delete dan menghapus gambar dari storage.

**Catatan otomasi Selenium:** gunakan locator prioritas `id` (`#product-category`, `#product-name`, `#product-slug`, `#product-description`, `#variant-sku-0`, `#variant-stock-0`, `#variant-price-0`, `#variant-deposit-0`, `#variant-weight-0`, `#product-images`); tombol by role/nama ("Tambah produk", "Lanjut", "Simpan produk", "Ubah", "Simpan perubahan", "Hapus", "Tutup", "Batal"); gunakan `WebDriverWait` untuk toast dan transisi step; gunakan data uji unik dengan timestamp; unggah file gambar dari path absolut fixture.

---

## Metode Teknik yang Digunakan

| Teknik | Penerapan pada Modul AD-05 |
|---|---|
| Equivalence Partitioning (EP) | Kelas valid/invalid input kategori, nama, slug, SKU, file gambar, dan kombinasi filter. |
| Boundary Value Analysis (BVA) | Batas nilai stok (0/10000), harga (0/100.000.000), durasi hari (2/365), jumlah gambar (5), ukuran gambar (2 MB), panjang nama (100) dan slug (120). |
| Decision Table (DT) | Kombinasi filter status (Semua/Aktif/Nonaktif) × kategori × kata kunci pencarian; sort asc/desc. |
| State Transition (ST) | Perubahan status produk Aktif ↔ Nonaktif melalui switch "Tampilkan di katalog". |
| Use Case Testing | Alur end-to-end tambah (3 step) → edit → hapus produk. |

---

## List & Search Data Barang

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.009.001 | Alvin | Halaman daftar data barang tampil | Use Case | Positive | Admin membuka halaman katalog produk | Admin sudah login | 1 | Buka halaman `/admin/products` | Halaman daftar produk tampil; tabel produk dan summary cards (Total Produk, Produk Aktif, Total Stok Varian) tampil dengan data yang valid | |
| TC.ADM.009.002 | Alvin | Search data barang berdasarkan nama | EP (Valid Class) | Positive | Mencari produk berdasarkan nama | Admin berada di halaman produk, ada data | 1 | Ketik nama produk pada input search (aria-label "Cari produk"), mis. "Tenda"; tunggu 700ms | Tabel hanya memunculkan produk yang memuat kata kunci pencarian | |
| TC.ADM.009.003 | Alvin | Search data barang tidak ada hasil | EP (Invalid Class) | Negative | Mencari produk dengan kata kunci yang tidak ada | Admin berada di halaman produk, ada data | 1 | Ketik kata kunci acak, mis. "ZZZZZZ"; tunggu 700ms | Empty state "Produk tidak ditemukan" dan tombol "Reset filter" tampil | |
| TC.ADM.009.004 | Alvin | Filter data barang berdasarkan status | DT | Positive | Memfilter produk aktif dan semua status | Admin berada di halaman produk | 1 | Pilih filter status "Aktif" | Tabel memfilter hanya produk berstatus Aktif | |
| | | | | | | | 2 | Pilih filter status "Semua" | Tabel menampilkan seluruh produk | |
| TC.ADM.009.005 | Alvin | Filter data barang berdasarkan kategori | DT | Positive | Memfilter produk berdasarkan kategori | Admin berada di halaman produk, ≥ 2 kategori | 1 | Pilih salah satu kategori pada filter kategori | Tabel hanya menampilkan produk pada kategori yang dipilih | |
| TC.ADM.009.006 | Alvin | Kombinasi search + filter status + kategori | DT | Positive | Verifikasi interseksi filter | Admin berada di halaman produk, ada data | 1 | Isi search "Tenda", pilih status "Aktif", pilih kategori target | Tabel menampilkan hanya produk yang memenuhi ketiga kriteria | |
| TC.ADM.009.007 | Alvin | Sort data barang berdasarkan nama | DT | Positive | Mengubah urutan daftar produk | Data produk ≥ 2 | 1 | Klik header "Produk" lalu klik lagi | Urutan berganti ascending → descending | |

---

## Tambah Data Barang (EP & BVA)

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.010.001 | Alvin | Tambah data barang baru lengkap (EP Valid) | EP (Valid Class) | Positive | Menambahkan produk lengkap dengan varian, stok, tarif harian, durasi paket, deposit, dan gambar | Kategori sudah tersedia | 1 | Klik "Tambah produk" | Dialog "Tambah produk baru" terbuka di Step 0 | |
| | | | | | | | 2 | Pilih kategori, isi nama produk, klik "Lanjut" | Masuk ke Step 1 (Varian & stok) | |
| | | | | | | | 3 | Isi SKU, Stok: 10, Tarif: 25000, Deposit: 50000, tambah tarif durasi 3 hari = 120000, klik "Lanjut" | Masuk ke Step 2 (Gambar) | |
| | | | | | | | 4 | Pilih 1 file gambar JPG valid, klik "Simpan produk" | Produk berhasil disimpan; toast sukses; produk tampil di tabel | |
| TC.ADM.010.002 | Alvin | Validasi field wajib kategori (EP Invalid) | EP (Invalid Class) | Negative | Menekan tombol Lanjut tanpa memilih kategori | Dialog tambah produk terbuka di Step 0 | 1 | Biarkan kategori kosong | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Navigasi tertahan di Step 0; pesan "Kategori wajib dipilih." tampil | |
| TC.ADM.010.003 | Alvin | Validasi field wajib nama produk (EP Invalid) | EP (Invalid Class) | Negative | Menekan tombol Lanjut tanpa mengisi nama | Dialog tambah produk terbuka di Step 0 | 1 | Biarkan nama produk kosong | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Navigasi tertahan di Step 0; pesan "Nama produk wajib diisi." tampil | |
| TC.ADM.010.004 | Alvin | Nama produk 101 karakter (BVA Above Max) | BVA | Negative | Input nama melebihi batas maksimal 100 karakter | Dialog tambah produk terbuka di Step 0 | 1 | Isi Nama dengan 101 karakter | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Muncul pesan error "Nama produk maksimal 100 karakter." | |
| TC.ADM.010.005 | Alvin | Tambah barang nama/slug duplikat (EP Invalid) | EP (Invalid Class) | Negative | Input nama barang yang menghasilkan slug yang sudah terdaftar | Sudah ada produk dengan slug yang sama | 1 | Isi Nama dan Slug sama dengan produk yang sudah ada | | |
| | | | | | | | 2 | Selesaikan hingga Step 2 dan klik "Simpan produk" | Backend menolak pendaftaran; sistem otomatis mengarahkan ke Step 0 dan menampilkan pesan "Slug sudah digunakan oleh produk lain." | |
| TC.ADM.010.006 | Alvin | Tambah barang SKU duplikat (EP Invalid) | EP (Invalid Class) | Negative | Input SKU varian yang sudah terdaftar | Sudah ada varian dengan SKU yang sama | 1 | Isi SKU dengan SKU yang sudah ada, selesaikan hingga Step 2 | | |
| | | | | | | | 2 | Klik "Simpan produk" | Backend menolak; sistem mengarahkan ke Step 1 dan menampilkan pesan "SKU sudah digunakan oleh varian lain." | |
| TC.ADM.010.007 | Alvin | Uji nilai batas stok barang = 0 (BVA Minimum Valid) | BVA | Positive | Input stok fisik bernilai batas minimum valid (0) | Berada di Step 1 form produk | 1 | Isi field Stok fisik dengan angka 0 | | |
| | | | | | | | 2 | Lanjutkan dan simpan produk | Produk tersimpan dengan sukses dan stok 0 tercatat | |
| TC.ADM.010.008 | Alvin | Uji nilai batas stok barang = -1 (BVA Below Minimum / Invalid) | BVA | Negative | Input stok fisik di bawah batas minimum (-1) | Berada di Step 1 form produk | 1 | Isi field Stok fisik dengan nilai -1 | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Sistem menolak; muncul pesan error validasi "Stok minimal 0." | |
| TC.ADM.010.009 | Alvin | Uji nilai batas stok barang = 10000 (BVA Maximum Valid) | BVA | Positive | Input stok fisik tepat pada batas maksimal 10000 | Berada di Step 1 form produk | 1 | Isi field Stok fisik dengan angka 10000 | | |
| | | | | | | | 2 | Lanjutkan dan simpan produk | Produk tersimpan dengan sukses dan stok 10000 tercatat | |
| TC.ADM.010.010 | Alvin | Uji nilai batas stok barang = 10001 (BVA Above Maximum / Invalid) | BVA | Negative | Input stok fisik melebihi batas maksimal 10000 | Berada di Step 1 form produk | 1 | Isi field Stok fisik dengan nilai 10001 | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Sistem menolak; muncul pesan error validasi "Stok maksimal 10000." | |
| TC.ADM.010.011 | Alvin | Uji nilai batas tarif sewa < 0 (BVA Invalid) | BVA | Negative | Input harga sewa harian negatif (-500) | Berada di Step 1 form produk | 1 | Isi field Harga per hari dengan nilai -500 | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Sistem menolak; muncul pesan error validasi "Harga minimal 0." | |
| TC.ADM.010.012 | Alvin | Uji tarif sewa multi-durasi: durasi 1 hari (BVA Below Min) | BVA | Negative | Input durasi paket di bawah batas minimum 2 hari | Berada di Step 1 form produk dengan tarif durasi ditambahkan | 1 | Isi field Durasi (hari) dengan nilai 1 | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Sistem menolak; muncul pesan error "Durasi hari minimal 2 hari." | |
| TC.ADM.010.013 | Alvin | Uji tarif sewa multi-durasi: durasi 2 hari (BVA Minimum Valid) | BVA | Positive | Input durasi paket tepat pada batas minimum 2 hari | Berada di Step 1 form produk dengan tarif durasi ditambahkan | 1 | Isi field Durasi (hari) dengan nilai 2 dan Harga dengan 50000 | | |
| | | | | | | | 2 | Lanjutkan dan simpan produk | Produk tersimpan dengan tarif durasi 2 hari tercatat | |
| TC.ADM.010.014 | Alvin | Uji tarif sewa multi-durasi: durasi 365 hari (BVA Maximum Valid) | BVA | Positive | Input durasi paket tepat pada batas maksimal 365 hari | Berada di Step 1 form produk dengan tarif durasi ditambahkan | 1 | Isi field Durasi (hari) dengan nilai 365 | | |
| | | | | | | | 2 | Lanjutkan dan simpan produk | Produk tersimpan dengan tarif durasi 365 hari tercatat | |
| TC.ADM.010.015 | Alvin | Uji tarif sewa multi-durasi: durasi 366 hari (BVA Above Max) | BVA | Negative | Input durasi paket melebihi batas maksimal 365 hari | Berada di Step 1 form produk dengan tarif durasi ditambahkan | 1 | Isi field Durasi (hari) dengan nilai 366 | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Sistem menolak; muncul pesan error "Durasi hari maksimal 365 hari." | |
| TC.ADM.010.016 | Alvin | Uji nilai batas deposit negatif (BVA Invalid) | BVA | Negative | Input uang jaminan (deposit) negatif | Berada di Step 1 form produk | 1 | Isi field Deposit per unit dengan nilai -1000 | | |
| | | | | | | | 2 | Klik tombol "Lanjut" | Sistem menolak; muncul pesan error "Harga deposit minimal 0." | |
| TC.ADM.010.017 | Alvin | Validasi format file foto alat (.pdf ditolak) | EP (Invalid Class) | Negative | Mengunggah file non-gambar (format PDF) pada foto produk | Berada di Step 2 form produk | 1 | Pilih berkas berkekstensi `.pdf` pada input `#product-images` | | |
| | | | | | | | 2 | Periksa pesan error yang muncul | Sistem menolak berkas; muncul pesan error "Format ... harus JPG, PNG, atau WebP." | |
| TC.ADM.010.018 | Alvin | Validasi ukuran file foto > 2 MB (BVA Above Max) | BVA | Negative | Mengunggah gambar berukuran lebih dari 2 MB | Berada di Step 2 form produk | 1 | Pilih berkas gambar berukuran > 2 MB | | |
| | | | | | | | 2 | Periksa pesan error yang muncul | Sistem menolak berkas; muncul pesan error "Ukuran ... maksimal 2 MB." | |
| TC.ADM.010.019 | Alvin | Validasi jumlah file foto > 5 (BVA Above Max) | BVA | Negative | Mengunggah lebih dari 5 gambar produk | Berada di Step 2 form produk | 1 | Pilih 6 berkas gambar valid | | |
| | | | | | | | 2 | Periksa pesan error yang muncul | Sistem menolak; muncul pesan error "Maksimal 5 gambar per produk." | |

---

## Edit Data Barang

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.011.001 | Alvin | Edit data barang berhasil | EP (Valid Class) | Positive | Mengubah deskripsi produk pada katalog | Produk target sudah tersedia di tabel | 1 | Klik baris produk target di tabel | Dialog "Detail produk" terbuka | |
| | | | | | | | 2 | Klik tombol "Ubah" | Form masuk ke mode pengeditan ("Ubah produk") | |
| | | | | | | | 3 | Ubah isi `#edit-product-description` | | |
| | | | | | | | 4 | Klik "Simpan perubahan" | Toast "Perubahan produk ... berhasil disimpan." muncul; deskripsi terupdate pada dialog | |
| TC.ADM.011.002 | Alvin | Toggle status produk Aktif → Nonaktif (State Transition) | State Transition (ST) | Positive | Mengubah status tampil produk melalui switch | Produk berstatus Aktif tersedia | 1 | Buka detail produk → klik "Ubah" | Mode edit terbuka | |
| | | | | | | | 2 | Matikan switch "Tampilkan di katalog" → klik "Simpan perubahan" | Toast sukses; status produk berubah menjadi Nonaktif | |
| | | | | | | | 3 | Kembali ke daftar, pilih filter status "Aktif" | Produk yang baru dinonaktifkan tidak tampil pada filter Aktif | |
| TC.ADM.011.003 | Alvin | Toggle status produk Nonaktif → Aktif (State Transition) | State Transition (ST) | Positive | Mengembalikan status produk menjadi aktif | Produk berstatus Nonaktif tersedia | 1 | Buka detail produk → klik "Ubah" | Mode edit terbuka | |
| | | | | | | | 2 | Aktifkan switch "Tampilkan di katalog" → klik "Simpan perubahan" | Toast sukses; status produk berubah menjadi Aktif | |
| | | | | | | | 3 | Kembali ke daftar, pilih filter status "Aktif" | Produk yang baru diaktifkan tampil pada filter Aktif | |
| TC.ADM.011.004 | Alvin | Edit stok varian berhasil | EP (Valid Class) | Positive | Mengubah stok varian produk | Produk target sudah tersedia di tabel | 1 | Buka detail produk → klik "Ubah" | Mode edit terbuka | |
| | | | | | | | 2 | Ubah nilai stok pada `#variant-stock-0` | | |
| | | | | | | | 3 | Klik "Simpan perubahan" | Toast sukses; stok varian terupdate | |

---

## Hapus Data Barang

| Test Case ID | Tester | Nama Test Case | Teknik | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.012.001 | Alvin | Hapus data barang yang tidak terikat paket/transaksi aktif | Use Case | Positive | Menghapus barang dari katalog melalui dialog detail | Produk tidak terikat transaksi sewa aktif | 1 | Klik baris produk target untuk membuka dialog detail | Dialog "Detail produk" terbuka | |
| | | | | | | | 2 | Klik tombol "Hapus" pada dialog detail | `DeleteConfirmDialog` terbuka (judul "Hapus produk ...?") | |
| | | | | | | | 3 | Klik konfirmasi "Hapus" | Produk beserta varian dan gambarnya dihapus (soft delete); baris produk hilang dari tabel; toast sukses | |
