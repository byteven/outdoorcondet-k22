# Product Requirement Document (PRD)

## OutdoorCondet - Camping & Outdoor Equipment Rental Platform

---

## 1. Overview & Objectives

OutdoorCondet adalah platform rental alat camping dan outdoor berbasis web dengan dua aktor: **Admin** dan **Customer (Pelanggan)**.

- **Tujuan Utama:** Memudahkan pencarian & pemesanan sewa berbasis tanggal (date-range availability), pencatatan transaksi manual/otomatis, serta kontrol stok fisik termasuk alur pemeliharaan barang (maintenance buffer).
- **Referensi Acuan:**
    - _SewaScale_: Manajemen listing, marketplace-style date range search, ringkasan jadwal/pesanan.
    - _Foresta Adventure_: Katalog produk camping, alur sewa harian yang ringkas, durasi sewa fleksibel.

---

## 2. Tech Stack & Architecture (As-Is Repo)

- **Primary Language:** Indonesian (Bahasa Indonesia) — All UI text, PRD updates, and instructions must use Indonesian. Exceptions for standard tech terms (e.g., "Sign in", "Log in", "Privacy", "Checkout").
- **Backend Framework:** Laravel 11/12 (PHP)
- **Frontend / UI:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI (`components.json`)
- **Database:** MySQL / PostgreSQL
- **Pattern:** REST API / Inertia.js (sesuai setup aplikasi)

---

## 3. Normalized Database Schema (English Convention)

### 3.1. Users & Profiles

- **`users`**
    - `id` (PK, BigInt)
    - `name` (String)
    - `email` (String, Unique)
    - `password` (String)
    - `role` (Enum: `admin`, `customer`)
    - `timestamps`

- **`customers`**
    - `id` (PK, BigInt)
    - `user_id` (FK -> `users.id`, Unique)
    - `identity_number` (String/NIK, Nullable — diisi saat verifikasi/sewa pertama)
    - `identity_card_path` (String/Foto KTP, Nullable)
    - `phone_number` (String)
    - `address` (Text, Nullable)
    - `is_verified` (Boolean, Default: `false`)
    - `is_active` (Boolean, Default: `true`)
    - `timestamps`

### 3.2. Categories, Products & Dynamic Variants

- **`categories`**
    - `id` (PK, BigInt)
    - `name` (String)
    - `slug` (String, Unique)
    - `timestamps`

- **`products`**
    - `id` (PK, BigInt)
    - `category_id` (FK -> `categories.id`)
    - `name` (String)
    - `slug` (String, Unique)
    - `description` (Text, Nullable)
    - `is_active` (Boolean, Default: `true`)
    - `timestamps`

- **`product_images`**
    - `id` (PK, BigInt)
    - `product_id` (FK -> `products.id`, Cascade)
    - `image_path` (String)
    - `is_primary` (Boolean, Default: `false`)
    - `timestamps`

- **`attributes`** _(Master jenis opsi: Warna, Ukuran, Kapasitas, dll.)_
    - `id` (PK, BigInt)
    - `name` (String) _(Contoh: "Color", "Size")_
    - `timestamps`

- **`product_variants`** _(Kombinasi fisik stok per varian unik)_
    - `id` (PK, BigInt)
    - `product_id` (FK -> `products.id`, Cascade)
    - `sku` (String, Unique)
    - `stock` (Integer) _(Total unit fisik dimiliki)_
    - `rental_price_per_day` (Decimal: 12,2)
    - `weight_grams` (Integer, Default: 0)
    - `is_active` (Boolean, Default: `true`)
    - `timestamps`

- **`product_variant_values`** _(Nilai spesifik per varian)_
    - `id` (PK, BigInt)
    - `product_variant_id` (FK -> `product_variants.id`, Cascade)
    - `attribute_id` (FK -> `attributes.id`)
    - `value` (String) _(Contoh: "Merah", "4 Orang", "XL")_
    - `timestamps`

### 3.3. Packages (Bundling)

- **`packages`**
    - `id` (PK, BigInt)
    - `name` (String)
    - `slug` (String, Unique)
    - `description` (Text, Nullable)
    - `daily_price` (Decimal: 12,2)
    - `image_path` (String, Nullable)
    - `is_active` (Boolean, Default: `true`)
    - `timestamps`

- **`package_items`** _(Referensi langsung ke stok varian)_
    - `id` (PK, BigInt)
    - `package_id` (FK -> `packages.id`, Cascade)
    - `product_variant_id` (FK -> `product_variants.id`)
    - `quantity` (Integer)
    - `timestamps`

### 3.4. Rentals & Maintenance Buffering

- **`rentals`** (Tabel Transaksi Utama)
    - `id` (PK, BigInt)
    - `rental_code` (String, Unique) — misal: `OC-202610-001`
    - `customer_id` (FK -> `customers.id`)
    - `start_date` (Date)
    - `end_date` (Date)
    - `total_days` (Integer)
    - `total_amount` (Decimal: 12,2)
    - `down_payment_amount` (Decimal: 12,2, Default: 0)
    - `remaining_balance` (Decimal: 12,2, Default: 0)
    - `payment_type` (Enum: `full`, `down_payment`)
    - `status` (Enum: `pending_payment`, `waiting_confirmation`, `dp_paid`, `fully_paid`, `picked_up`, `returned`, `completed`, `cancelled`)
    - `payment_proof_path` (String, Nullable)
    - `is_self_order` (Boolean, Default: `false`) — Order manual oleh admin
    - `notes` (Text, Nullable)
    - `timestamps`

- **`rental_items`** (Detail Barang yang Disewa)
    - `id` (PK, BigInt)
    - `rental_id` (FK -> `rentals.id`, Cascade)
    - `rentable_type` (String) — Polymorphic: `App\Models\ProductVariant` atau `App\Models\Package`
    - `rentable_id` (BigInt) — ID dari `product_variants` atau `packages`
    - `quantity` (Integer)
    - `price_per_day` (Decimal: 12,2)
    - `subtotal` (Decimal: 12,2)
    - `return_condition` (Enum: `good`, `damaged`, `lost`, Nullable) — Diisi saat pengembalian
    - `needs_maintenance` (Boolean, Default: `false`) — Flag buffering pembersihan/servis
    - `timestamps`

- **`variant_maintenances`** (Isolasi Stok Maintenance)
    - `id` (PK, BigInt)
    - `product_variant_id` (FK -> `product_variants.id`)
    - `rental_item_id` (FK -> `rental_items.id`, Nullable)
    - `quantity` (Integer)
    - `reason` (Enum: `cleaning`, `repair`, `inspection`)
    - `status` (Enum: `in_maintenance`, `ready`)
    - `notes` (Text, Nullable)
    - `completed_at` (Timestamp, Nullable)
    - `timestamps`

---

## 4. Business Flows & Logistics

### 4.1. Verification / KTP Strategy

- **Registrasi Awal:** Cukup `name`, `email`, `password`, `phone_number`. Minimalkan drop-off calon pelanggan.
- **First Checkout:** Wajib unggah KTP (`identity_number` & `identity_card_path`) sebelum submit order pertama. Admin verifikasi manual sebelum menyetujui jadwal sewa.
- **Admin Manual Create:** Admin boleh melampirkan foto KTP (`identity_card`, JPG/PNG/WebP maksimal 2 MB, opsional) saat membuat pelanggan manual dari panel admin.

### 4.2. Availability & Real-Time Stock Calculation

Untuk rentang tanggal $[T_{start}, T_{end}]$:
$$\text{Available Stock} = \text{Total Stock} - (\text{Rented in Date Range} + \text{In Maintenance})$$

- Paket (`packages`) memeriksa stok minimum dari seluruh `package_items` di dalamnya.

### 4.3. Return & Maintenance Buffer Flow

1. **Jatuh Tempo / Pengembalian:** Customer kembalikan alat ke outlet.
2. **Pemeriksaan Admin:**
    - Kondisi bersih & siap sewa -> Status rental `completed`, stok langsung kembali ke pool ketersediaan.
    - Kondisi kotor/perlu dicek (tenda basah, alat kotor, pasak bengkok) -> Centang `needs_maintenance`.
3. **Buffering:** Unit otomatis masuk ke `variant_maintenances` dengan status `in_maintenance`. Stok tidak dihitung tersedia pada kalender/pencarian tanggal berikutnya.
4. **Restorasi:** Setelah dicuci/diperbaiki, admin klik "Tandai Siap" -> status maintenance `ready`, stok kembali ke pool publik.

### 4.4. Payment Confirmation Flow

1. **Pelanggan checkout:** Pilih `down_payment` (50%) atau `full` (100%).
2. **Upload Bukti:** Status `waiting_confirmation`.
3. **Admin Review:**
    - Bukti valid -> Status berubah ke `dp_paid` atau `fully_paid`.
    - Bukti salah -> Reject dengan catatan, status kembali ke `pending_payment`.
4. **Ambil Barang:** Jika status `dp_paid`, admin catat pelunasan sisa di tempat, status jadi `fully_paid` + `picked_up`.

---

## 5. Functional Requirements Matrix

### 5.1. Admin Features

| ID    | Modul                  | Fitur                        | Detail Teknis                                                               |
| ----- | ---------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| AD-01 | Auth                   | Login / Logout               | Laravel Sanctum / Session guard                                             |
| AD-02 | Customer Management    | CRUD & Toggle Status         | List, search, activate/deactivate customer                                  |
| AD-03 | Master Catalog         | CRUD Category                | Slug generator, nested hierarchy (opsional)                                 |
| AD-04 | Master Attributes      | Dynamic Attribute Management | Kelola opsi: Warna, Ukuran, Kapasitas                                       |
| AD-05 | Product Management     | CRUD Product + Variants      | Form multi-step, upload multi-gambar, mapping varian & stok fisik           |
| AD-06 | Package Bundles        | CRUD Packages                | Linking komposisi `package_items` ke `product_variants`                     |
| AD-07 | Transaction Monitoring | Manage Rentals               | Filter status, preview bukti transfer, konfirmasi manual, pelunasan sisa    |
| AD-08 | Return & Maintenance   | Return Inspector             | Checklist alat kembali, assign ke maintenance queue per item                |
| AD-09 | Rental Calendar        | Visual Scheduler             | View bulanan/mingguan, tandai booking via blok tanggal & kapasitas unit     |
| AD-10 | Self Order (POS)       | Admin Manual Order           | Input order walk-in/offline langsung dari panel admin                       |
| AD-11 | Dashboard Metrics      | Analytics                    | Transaksi hari ini, per-status, barang paling sering disewa, grafik revenue |

### 5.2. Customer Features

| ID    | Modul              | Fitur                    | Detail Teknis                                                               |
| ----- | ------------------ | ------------------------ | --------------------------------------------------------------------------- |
| CU-01 | Auth               | Registrasi & Login       | Input data standar (tanpa wajib KTP diawal)                                 |
| CU-02 | Profile & KYC      | Edit Profil & Unggah KTP | Update no WA, upload foto KTP untuk verifikasi sewa                         |
| CU-03 | Search & Discovery | Hero Date Picker Search  | Date range picker (Start Date - End Date), keyword, filter kategori         |
| CU-04 | Catalog & Detail   | Filter & Varian Selector | Grid produk, gallery gambar, dynamic price per duration, availability check |
| CU-05 | Cart               | Multi-Item Cart          | Hitung estimasi harga sewa berbasis durasi hari otomatis                    |
| CU-06 | Checkout           | DP / Full Payment        | Pilih jenis pembayaran (50% / 100%), info rekening transfer, unggah struk   |
| CU-07 | Order History      | Tracking Status          | Histori sewa, status verifikasi admin, sisa tagihan saat ambil barang       |
