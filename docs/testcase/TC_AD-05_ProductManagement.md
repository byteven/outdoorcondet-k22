# Test Case — AD-05: Product Management (Admin)

> **Modul:** AD-05 Product Management (Manajemen Data Barang)  
> **Referensi PRD:** Section 5.1 (AD-05) & 5.1.1  
> **Versi PRD:** 3.2 FINAL  
> **Penyusun:** Vio Salman  
> **Tanggal:** 2026-10-18  

---

Pengujian modul Product Management (manajemen data barang dan alat sewa) menerapkan metode Equivalence Partitioning (EP) dan Boundary Value Analysis (BVA) untuk memvalidasi batasan nilai numerik pada stok fisik dan tarif sewa, aturan unggah berkas foto katalog, penetapan tarif sewa multi-durasi (harian dan berdurasi tertentu), serta uang jaminan (deposit). Selain itu, pengujian memvalidasi keunikan slug produk dari sisi server dan dialog stepper formulir produk (Info Dasar, Varian & Stok, Gambar & Publikasi). Seluruh test case telah diuji otomatis via Playwright E2E dan menunjukkan hasil Pass.

---

## Catatan Implementasi

Berdasarkan kode yang ada:

- Halaman `/admin/products` dapat diakses oleh admin (`access-admin`).
- **Summary Cards**: Total Produk, Produk Aktif, dan Total Stok Varian fisik.
- Tabel menampilkan kolom: Rincian Varian, Produk (Nama & Slug), Kategori, Varian/Stok, Harga Mulai, Status, dan Tombol Detail.
- Pencarian (*search*) berdasarkan nama, slug, atau deskripsi produk dengan debounce.
- Filter berdasarkan kategori barang dan status produk (Semua / Aktif / Nonaktif).
- **Formulir 3-Step Stepper** (`ProductFormDialog`):
  - **Step 0 (Info Produk)**: Kategori (wajib), Nama produk (wajib), Slug URL (opsional), Deskripsi, Status aktif.
  - **Step 1 (Varian & Stok)**: SKU (wajib & unik), Stok fisik (min. 0), Harga sewa per hari (min. Rp0), Uang jaminan / deposit per unit, Berat (gram), Atribut nilai varian, Tarif sewa multi-durasi (mis. 3 hari = Rp50.000).
  - **Step 2 (Gambar & Publikasi)**: Unggah file gambar (maksimal 5 file, maks 2 MB per file, format JPG/PNG/WebP, penentuan foto utama).
- **Detail & Edit Produk** (`ProductDetailDialog`): Menampilkan rincian varian, tarif multi-durasi, jaminan, dan memungkinkan perubahan deskripsi, stok, atau penghapusan produk.

---

## List & Search Data Barang

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.009.001 | Vio | Halaman daftar data barang tampil | Positive | Admin membuka halaman katalog produk | Admin sudah login | 1 | Buka halaman `/admin/products` | Halaman daftar produk tampil; tabel produk dan summary cards tampil dengan data yang valid | Pass |
| TC.ADM.009.002 | Vio | Search data barang berdasarkan nama | Positive | Mencari produk berdasarkan nama | Admin berada di halaman produk | 1 | Ketik nama produk pada input search (mis. "Consina") | Tabel hanya memunculkan produk yang memuat kata kunci pencarian | Pass |
| TC.ADM.009.003 | Vio | Filter data barang berdasarkan status | Positive | Memfilter produk aktif dan semua status | Admin berada di halaman produk | 1 | Klik tombol filter status "Aktif" | Tabel memfilter hanya produk berstatus Aktif | Pass |
| | | | | | | 2 | Klik tombol filter status "Semua" | Tabel menampilkan seluruh produk | Pass |

---

## Tambah Data Barang (EP & BVA)

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.010.001 | Vio | Tambah data barang baru beserta tarif multi-durasi dan deposit berhasil (EP Valid) | Positive | Menambahkan produk lengkap dengan varian, stok, tarif harian, durasi paket, dan jaminan | Kategori sudah tersedia | 1 | Klik "Tambah produk" | | Pass |
| | | | | | | 2 | Pilih kategori, isi nama produk, klik "Lanjut" | Masuk ke Step 1 (Varian & stok) | |
| | | | | | | 3 | Isi SKU, Stok: 10, Tarif: 25000, klik "Lanjut" | Masuk ke Step 2 (Gambar & Publikasi) | |
| | | | | | | 4 | Klik "Simpan produk" | Produk berhasil disimpan; toast sukses muncul; produk tampil di tabel | Pass |
| TC.ADM.010.002 | Vio | Validasi field wajib tambah barang (EP Invalid) | Negative | Menekan tombol Lanjut tanpa memilih kategori | Dialog tambah produk terbuka di Step 0 | 1 | Biarkan kategori kosong | | Pass |
| | | | | | | 2 | Klik tombol "Lanjut" | Navigasi tertahan di Step 0; pesan "Kategori wajib dipilih." tampil | Pass |
| TC.ADM.010.003 | Vio | Tambah barang nama duplikat (EP Invalid) | Negative | Input nama barang yang menghasilkan slug yang sudah terdaftar | Sudah ada produk dengan nama yang sama | 1 | Isi Nama dan Varian sama dengan produk yang sudah ada | | Pass |
| | | | | | | 2 | Selesaikan hingga Step 2 dan klik "Simpan produk" | Backend menolak pendaftaran; sistem otomatis mengarahkan ke Step 0 dan menampilkan pesan "Slug sudah digunakan oleh produk lain." | Pass |
| TC.ADM.010.004 | Vio | Uji nilai batas stok barang = 0 (BVA Minimum Valid) | Positive | Input stok fisik bernilai batas minimum valid (0) | Berada di Step 1 form produk | 1 | Isi field Stok fisik dengan angka 0 | | Pass |
| | | | | | | 2 | Lanjutkan dan simpan produk | Produk tersimpan dengan sukses dan stok 0 tercatat | Pass |
| TC.ADM.010.005 | Vio | Uji nilai batas stok barang = -1 (BVA Below Minimum / Invalid) | Negative | Input stok fisik di bawah batas minimum (-1) | Berada di Step 1 form produk | 1 | Isi field Stok fisik dengan nilai -1 | | Pass |
| | | | | | | 2 | Klik tombol "Lanjut" | Sistem menolak; muncul pesan error validasi "Stok minimal 0." | Pass |
| TC.ADM.010.006 | Vio | Uji nilai batas tarif sewa < 0 (BVA Invalid) | Negative | Input harga sewa harian negatif (-500) | Berada di Step 1 form produk | 1 | Isi field Harga per hari dengan nilai -500 | | Pass |
| | | | | | | 2 | Klik tombol "Lanjut" | Sistem menolak; muncul pesan error validasi "Harga minimal 0." | Pass |
| TC.ADM.010.007 | Vio | Validasi format file foto alat (.pdf ditolak) | Negative | Mengunggah file non-gambar (format PDF) pada foto produk | Berada di Step 2 form produk | 1 | Pilih berkas berkekstensi `.pdf` pada dropzone gambar | | Pass |
| | | | | | | 2 | Periksa pesan error yang muncul | Sistem menolak berkas; muncul pesan error "Format katalog.pdf harus JPG, PNG, atau WebP." | Pass |

---

## Edit Data Barang

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.011.001 | Vio | Edit data barang berhasil | Positive | Mengubah deskripsi atau detail barang pada katalog | Produk target sudah tersedia di tabel | 1 | Klik baris produk target di tabel | Dialog detail produk terbuka | Pass |
| | | | | | | 2 | Klik tombol "Ubah" | Form masuk ke mode pengeditan | |
| | | | | | | 3 | Ubah isi deskripsi produk | | |
| | | | | | | 4 | Klik "Simpan perubahan" | Notifikasi toast "Perubahan produk ... berhasil disimpan." muncul; deskripsi terupdate pada dialog | Pass |

---

## Hapus Data Barang

| Test Case ID | Tester | Nama Test Case | Tipe | Deskripsi | Precondition | Step# | Langkah Uji | Expected Result | Actual Result |
|---|---|---|---|---|---|---|---|---|---|
| TC.ADM.012.001 | Vio | Hapus data barang yang tidak terikat paket/transaksi aktif | Positive | Menghapus barang dari katalog melalui dialog detail | Produk tidak terikat transaksi sewa aktif | 1 | Klik baris produk target untuk membuka dialog detail | | Pass |
| | | | | | | 2 | Klik tombol "Hapus" pada dialog detail | Modal konfirmasi penghapusan terbuka | |
| | | | | | | 3 | Klik konfirmasi "Hapus" | Produk beserta varian dihapus dari sistem; baris produk hilang dari tabel | Pass |

