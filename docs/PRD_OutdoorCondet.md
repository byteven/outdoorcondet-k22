# PRD — OutdoorCondet

Platform rental alat camping & outdoor. Dua aktor: **Admin** dan **Customer**.

> Dokumen ini menggambarkan sistem **as-is** (implementasi saat ini) sekaligus guide pengerjaan modul admin yang belum dibangun.

## 1. Tech Stack

- Laravel 13 + Inertia.js (monolit), React + TypeScript + Tailwind + Shadcn UI
- MySQL, timezone aplikasi & DB **UTC** (tampilan mengikuti timezone device/WIB)
- Route frontend via Wayfinder (`resources/js/routes/`)
- Scheduler: `rentals:cancel-expired-payments` tiap menit

## 2. Aturan Bisnis Inti

| Aturan | Nilai |
| ------ | ----- |
| Sewa | Pertanggal, bukan 24 jam |
| Pengambilan | Bebas dalam jendela **18:00–23:59** pada tanggal ambil (tanpa pilih jam) |
| Mulai hitung | `start_date + 1` (pengambilan selalu malam) |
| Batas kembali | 23:59 pada `end_date` |
| Durasi | `end_date − (start_date + 1) + 1` (inklusif) |
| Buffer stok | 1 hari penuh setelah tanggal kembali aktual; ready jam 00:00 setelahnya (`stock_release_at` = kembali aktual + 2 hari) |
| Deposit | Per unit (varian) / per paket, disetor **offline di outlet** — tidak dicatat di sistem |
| DP | 50% absolut dari biaya sewa (tanpa deposit, tanpa pembulatan), sisa dilunasi di outlet |
| Pembayaran online | **Selalu QRIS** |
| Batas bayar | **30 menit** sejak checkout; lewat → otomatis `cancelled` |
| Denda keterlambatan | Rp50.000/hari (snapshot per rental), dipotong dari deposit secara offline |
| Identitas | Tanpa KTP/NIK di sistem; KTP fisik diserahkan di outlet |

## 3. Harga (Pricing Engine)

Admin mengisi harga nominal per durasi: harga 1 hari + tier (mis. 3 hari Rp50.000, 7 hari Rp100.000). Harga per unit untuk durasi `n` = kombinasi termurah untuk customer:

- `exact(n)` = kombinasi termurah tier + harga 1 hari yang jumlahnya tepat `n` (tier boleh berulang)
- `rounded(n)` = tier terkecil yang durasinya > `n` (jika ada)
- `unit_price(n) = min(exact, rounded)`

Durasi lebih pendek tidak pernah lebih mahal dari durasi lebih panjang. Harga, deposit, dan denda di-snapshot saat order; perubahan master tidak mengubah transaksi berjalan.

## 4. Skema Database (ringkas)

- **users** (`role`: admin/customer) · **customers** (phone, alamat, kontak darurat, sosmed; 1-1 dengan user)
- **categories / products / product_images / attributes**
- **product_variants** (sku, stock, `rental_price_per_day`, `deposit_per_unit`) + **variant_duration_prices** (tier harga)
- **packages** + **package_duration_prices** + **package_items** (varian di-fix, qty) — stok paket dihitung real-time dari `min(available varian / qty)` semua item
- **cart_items** (user, rentable morph varian/paket, qty, pickup_date, return_date — satu rentang tanggal per keranjang)
- **rentals** — `rental_code` (`OC-YYYYMMDD-NNN`), `start_date`, `end_date`, `total_days`, `rental_amount`, `deposit_amount`, `grand_total`, `payment_type` (full/down_payment), `down_payment_amount`, `remaining_balance`, `late_fee_per_day/late_days/late_fee_amount`, `payment_deadline_at`, `cancel_reason`, `status`, `returned_at`, `stock_release_at`
- **rental_items** — morph varian/paket + snapshot `name`, `unit_price`, `price_breakdown`, `subtotal`, deposit
- **rental_payments** — satu baris per rental: `amount` (DP atau lunas), `proof_path` (storage privat), `status` (waiting/approved/rejected), `reviewed_at`
- **variant_maintenances** — qty, reason (cleaning/repair/inspection), status (in_maintenance/ready)

## 5. Status Rental & Transisi

```
pending_payment ──(upload bukti)──> waiting_confirmation
waiting_confirmation ──approve──> dp_paid | fully_paid
waiting_confirmation ──reject──> cancelled (dengan alasan)
pending_payment ──(lewat 30 menit)──> cancelled (otomatis)
dp_paid | fully_paid ──(konfirmasi pengembalian admin)──> returned
sebelum returned ──(batal admin/customer)──> cancelled
```

- Tidak ada status `picked_up`/`completed`: barang diambil bebas setelah pembayaran dikonfirmasi; siklus berakhir di `returned`.
- Stok diblokir oleh semua status kecuali `cancelled` dan `returned` yang sudah lewat `stock_release_at`.
- Riwayat pesanan customer: grup **aktif** di atas, label **"Riwayat"** (returned/cancelled) di bawah.

## 6. Functional Requirements

### 6.1. Customer (semua sudah implementasi)

| ID | Modul | Fitur | Detail |
| -- | ----- | ----- | ------ |
| CU-01 | Registrasi | Multi-step | Step 1 Akun (nama lengkap, email, telepon, password); Step 2 kontak darurat, alamat, sosmed (opsional; ikon TikTok/IG/FB). Tanpa KTP/NIK. Email unik; telepon format Indonesia (08xx/62xx). |
| CU-02 | Profile & Data | Edit profil | Update nama, no. WA, kontak darurat, alamat, sosmed; banner kuning awareness jika belum lengkap; layout memakai landing header sama dengan halaman publik. |
| CU-03 | Rental Range | Date picker search | Date-range picker (tanggal ambil–kembali); ringkasan mulai hitung & durasi; keyword; filter kategori. Tanpa pilihan jam ambil. |
| CU-04 | Catalog & Detail | Filter & varian | Grid produk, gallery, pilih varian, harga otomatis sesuai durasi, info deposit per unit, ketersediaan real-time (rentang + buffer). |
| CU-05 | Cart | Multi-item | Qty dibatasi stok; ringkasan subtotal sewa, total deposit, grand total; satu rentang tanggal per keranjang (localStorage); validasi ulang saat checkout. |
| CU-06 | Checkout | DP / lunas | Detail di 6.1.1. |
| CU-07 | Order History | Tracking status | Grup aktif di atas + "Riwayat" (returned/cancelled) di bawah; filter status; detail transaksi: hitung mundur 30 menit, upload bukti QRIS, alasan penolakan, sisa tagihan saat ambil barang. |

#### 6.1.1. Detail CU-06 — Checkout

1. Ringkasan: item, tanggal ambil (jendela 18:00–23:59), tanggal mulai hitung, batas kembali, durasi, rincian harga, deposit, grand total; pengingat deposit disetor saat ambil barang.
2. Pilih pembayaran atas biaya sewa saja: DP (50% absolut) atau Lunas. Tampil nominal bayar sekarang, sisa sewa, dan deposit yang dibayar di outlet (total disiapkan = sisa sewa + deposit).
3. Submit → rental `pending_payment` (deadline 30 menit, stok di-hold), keranjang kosong.
4. Halaman detail transaksi: QRIS + nominal + hitung mundur 30 menit.
5. Upload bukti (jpg/png/pdf maks 5 MB) → `waiting_confirmation`.
6. Reject → tampil alasan, status Dibatalkan, order ulang. Habis waktu → halaman reload otomatis, status Dibatalkan.

**Belum implementasi (backlog):** gate kelengkapan data (alamat/kontak darurat/sosmed wajib sebelum order); tombol batalkan pesanan oleh customer (hanya saat `pending_payment`/`waiting_confirmation`).

### 6.2. Admin (guide pengerjaan — belum dibangun)

Backend siap pakai: `RentalWorkflowService` (approve/reject bukti, konfirmasi pengembalian + denda otomatis), `AvailabilityService` (stok real-time). Sebagian CRUD master (products/categories/attributes) sudah ada.

| ID | Modul | Fitur | Detail |
| -- | ----- | ----- | ------ |
| AD-01 | Login | Login/logout admin | Session guard, rate limiting. |
| AD-02 | Customer Mgmt | CRUD & toggle | List, search (nama/email/telepon), activate/deactivate, klik baris edit profil; customer nonaktif tak bisa login/checkout. |
| AD-03 | Master Catalog | CRUD kategori | Slug otomatis; kategori berisi produk tidak dapat dihapus. |
| AD-04 | Master Attributes | CRUD atribut | Warna/Ukuran/Kapasitas; atribut yang dipakai varian tidak dapat dihapus. |
| AD-05 | Product Mgmt | CRUD produk+varian+harga | Form multi-step; detail di 6.2.1. |
| AD-06 | Package Bundles | CRUD paket | Komposisi varian fix, harga 1 hari + per durasi, deposit per paket; tampil ketersediaan (stok minimum). |
| AD-07 | Transaction Monitoring | Kelola rental | Detail di 6.2.2. |
| AD-08 | Return & Maintenance | Return Inspector | Detail di 6.2.3. |
| AD-09 | Rental Calendar | Visual scheduler | View bulanan/mingguan; blok booking, buffer (warna beda), maintenance, kapasitas per tanggal; klik blok buka detail. |
| AD-10 | Dashboard | Analytics | Transaksi hari ini, jumlah per status, antrean "Butuh Konfirmasi", barang terpopuler, grafik revenue. |

#### 6.2.1. Detail AD-05 — Product Management

- Step 1 Info Produk: nama, kategori, deskripsi, status aktif, gambar (multi-upload, 1 primary).
- Step 2 Varian & Stok: atribut + nilai → generate varian; per varian: `sku`, `stock`, `weight_grams`, status.
- Step 3 Harga & Deposit per varian: harga 1 hari (wajib > 0); tabel "Harga per Durasi" (+ tambah durasi bebas ≥ 2, harga nominal); deposit per unit; tombol "Salin ke semua varian"; pratinjau simulasi durasi & qty.
- Validasi: durasi unik per varian & bilangan bulat ≥ 2; harga > 0; deposit ≥ 0; stok ≥ 0; peringatan (bukan error) jika tier lebih mahal dari `durasi × harga 1 hari`.
- Produk/varian nonaktif tidak tampil di katalog; order lama tetap valid.

#### 6.2.2. Detail AD-07 — Transaction Monitoring

- Daftar rental: filter status, rentang tanggal, cari kode/nama; badge "Butuh Konfirmasi" untuk `waiting_confirmation`; badge "Terlambat" untuk yang lewat `end_date` tanpa konfirmasi kembali.
- Konfirmasi bukti: preview QRIS (zoom, storage privat), nominal vs seharusnya; **Approve** → `dp_paid`/`fully_paid`; **Reject** (alasan wajib) → `cancelled`.
- Konfirmasi pengembalian: set `returned_at`, `late_days` & `late_fee_amount` otomatis, `stock_release_at`.
- Pembatalan manual: kapan pun sebelum `returned`, wajib `cancel_reason`.

#### 6.2.3. Detail AD-08 — Return Inspector & Maintenance

- Checklist per `rental_items`: kondisi (good/damaged/lost), `needs_maintenance`, qty maintenance, alasan, catatan.
- Antrean `in_maintenance` + tombol "Tandai Siap" → stok kembali ke pool.
- Item lost: kurangi `stock` varian permanen (penyesuaian bercatatan).

## 7. Non-Functional

- Anti double-booking: cache lock `checkout:rental-availability` + transaksi DB saat checkout; pembatalan otomatis set-based dengan guard `WHERE status` atomik.
- Bukti bayar di disk privat, hanya diakses via route terproteksi pemilik order; upload jpg/png/pdf maks 5 MB.
- Mobile-first.
