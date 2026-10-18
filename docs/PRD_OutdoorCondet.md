# Product Requirement Document (PRD)

## OutdoorCondet - Camping & Outdoor Equipment Rental Platform

> **Versi:** 3.1 (FINAL — seluruh keputusan bisnis sudah ditetapkan, tanpa pertanyaan terbuka)
> **Narasumber / Stakeholder:** Faqih (owner @sewaalatoutdoorcondet)
> **Sumber requirement:** meeting narasumber 17 Oktober 2026, poster "Sistem Sewa" (Pricelist 2026), dan keputusan tim 18 Oktober 2026.
> **Penyusun:** Vio Salman

---

## 0. Ringkasan Perubahan dari Versi Sebelumnya

| # | Area | Perubahan |
| - | ---- | --------- |
| 1 | Data pribadi | Field customer: **nama lengkap, email, no. telepon, alamat, kontak darurat, sosial media**. **KTP dan NIK dihapus**. KTP fisik diserahkan di outlet (proses offline). |
| 2 | Harga | Admin mengisi harga manual per durasi bebas (1, 2, 3, 7, N hari). Harga nominal langsung, **bukan persentase**. Durasi tanpa tier dihitung dengan kombinasi termurah untuk customer. |
| 3 | Deposit | Deposit diatur admin **per quantity per produk/varian** (contoh Rp50.000/unit). |
| 4 | Sistem sewa pertanggal | Mengikuti poster: **bukan 24 jam**. Ambil jam 18:00 ke atas dihitung tanggal berikutnya; ambil 06:00-17:59 dihitung tanggal itu juga; kembali maksimal 00:00. |
| 5 | Buffer stok | Setelah tanggal kembali ada **1 hari jeda**. Kembali tgl 18 -> tgl 19 belum ready -> tgl 20 ready 00:00. |
| 6 | Pembayaran | DP default diizinkan, **50% dari biaya sewa + deposit**. |
| 7 | Transaction Monitoring | Dua konfirmasi admin: pesanan masuk dan barang dikembalikan; auto-konfirmasi 2 hari; denda keterlambatan **per hari, nominal konstan**. |
| 8 | Semua modul | Diperdetail dengan aturan, validasi, dan acceptance criteria. |

---

## 1. Overview & Objectives

OutdoorCondet adalah platform rental alat camping dan outdoor berbasis web dengan dua aktor: **Admin** dan **Customer (Pelanggan)**.

**Proses saat ini (As-Is):** negosiasi harga, pembayaran, pengecekan ketersediaan, dan pencatatan masih manual lewat WhatsApp dan Excel. Deposit dan KTP diserahkan fisik saat pengambilan.

**Tujuan (To-Be):** memindahkan pemesanan, penentuan harga, pembayaran, verifikasi, dan pengembalian ke website.

- **Tujuan Utama:**
    1. Pencarian & pemesanan sewa berbasis tanggal (date-range availability) dengan aturan sewa pertanggal.
    2. Harga transparan: harga per durasi dan deposit dihitung otomatis.
    3. Verifikasi pembayaran (DP/lunas) oleh admin di dalam sistem.
    4. Kontrol stok fisik, termasuk jeda 1 hari setelah pengembalian dan alur maintenance.
    5. Konfirmasi pengembalian dan denda keterlambatan otomatis.
- **Referensi Acuan:**
    - _SewaScale_: manajemen listing, marketplace-style date range search, ringkasan jadwal/pesanan.
    - _Foresta Adventure_: katalog produk camping, harga per durasi, deposit per quantity.

### 1.1. Glosarium

| Istilah | Arti |
| ------- | ---- |
| Tanggal ambil | Tanggal fisik customer mengambil barang di outlet. |
| Tanggal mulai hitung | Tanggal pertama yang dihitung sebagai hari sewa (lihat 4.3). Bisa sama dengan atau sehari setelah tanggal ambil. |
| Tanggal kembali | Tanggal terakhir barang boleh dikembalikan (batas 00:00 di akhir tanggal tsb). |
| Harga tier | Harga total per unit untuk durasi tertentu yang diisi manual admin (contoh: 3 hari = Rp50.000). |
| Deposit | Uang jaminan per unit; dikembalikan jika barang kembali baik dan tepat waktu. |
| DP | Down payment: 50% dari (biaya sewa + deposit). |
| Buffer pengembalian | Jeda 1 hari penuh setelah tanggal kembali sebelum stok ready lagi. |
| Maintenance | Isolasi unit kotor/rusak di luar buffer standar; berlaku sampai admin klik "Tandai Siap". |

---

## 2. Tech Stack & Architecture (As-Is Repo)

- **Primary Language:** Indonesian (Bahasa Indonesia) — semua UI text, update PRD, dan instruksi memakai bahasa Indonesia. Pengecualian istilah teknis standar (mis. "Sign in", "Log in", "Privacy", "Checkout").
- **Backend Framework:** Laravel 11/12 (PHP)
- **Frontend / UI:** React (Vite), TypeScript, Tailwind CSS, Shadcn UI (`components.json`)
- **Database:** MySQL / PostgreSQL
- **Pattern:** REST API / Inertia.js (sesuai setup aplikasi)
- **Scheduler:** Laravel Task Scheduling (cron, tiap 5 menit) untuk pembatalan otomatis, auto-konfirmasi pengembalian, dan pelepasan stok.
- **Timezone:** `Asia/Jakarta` (WIB). Semua aturan jam pada PRD ini mengacu WIB.

---

## 3. Normalized Database Schema (English Convention)

### 3.1. Users & Profiles

- **`users`**
    - `id` (PK, BigInt)
    - `name` (String) — nama lengkap
    - `email` (String, Unique)
    - `password` (String)
    - `role` (Enum: `admin`, `customer`)
    - `timestamps`

- **`customers`**
    - `id` (PK, BigInt)
    - `user_id` (FK -> `users.id`, Unique)
    - `phone_number` (String)
    - `address` (Text, Nullable)
    - `emergency_contact` (String, Nullable — nomor telepon dan relasi, e.g. 628822533 (Orang Tua))
    - `social_media` (JSON/Text, Nullable — platform & URL, e.g. `{"platform":"instagram","url":"..."}`)
    - `is_verified` (Boolean, Default: `false`)
    - `is_active` (Boolean, Default: `true`)
    - `timestamps`

> Tidak ada kolom `nik`, `ktp_path`, atau `selfie_path`. Jika migrasi lama memuatnya, kolom tersebut di-drop.

### 3.2. Categories, Products & Dynamic Variants

- **`categories`**: `id` (PK), `name`, `slug` (Unique), `timestamps`
- **`products`**: `id` (PK), `category_id` (FK), `name`, `slug` (Unique), `description` (Nullable), `is_active` (Default `true`), `timestamps`
- **`product_images`**: `id` (PK), `product_id` (FK, Cascade), `image_path`, `is_primary` (Default `false`), `timestamps`
- **`attributes`** _(Warna, Ukuran, Kapasitas, dll.)_: `id` (PK), `name`, `timestamps`

- **`product_variants`**
    - `id` (PK, BigInt)
    - `product_id` (FK -> `products.id`, Cascade)
    - `sku` (String, Unique)
    - `stock` (Integer) — total unit fisik dimiliki
    - `rental_price_per_day` (Decimal: 12,2) — harga untuk durasi 1 hari (wajib, > 0)
    - `deposit_per_unit` (Decimal: 12,2, Default: 0) — deposit per quantity
    - `weight_grams` (Integer, Default: 0)
    - `is_active` (Boolean, Default: `true`)
    - `timestamps`

- **`variant_duration_prices`** _(harga manual per durasi per varian)_
    - `id` (PK, BigInt)
    - `product_variant_id` (FK -> `product_variants.id`, Cascade)
    - `duration_days` (Integer, >= 2)
    - `price` (Decimal: 12,2) — **harga total per unit** untuk durasi tsb
    - `timestamps`
    - Unique: (`product_variant_id`, `duration_days`)

- **`product_variant_values`**: `id` (PK), `product_variant_id` (FK, Cascade), `attribute_id` (FK), `value`, `timestamps`

### 3.3. Packages (Bundling)

- **`packages`**: `id` (PK), `name`, `slug` (Unique), `description` (Nullable), `daily_price` (Decimal 12,2; harga 1 hari), `deposit_per_package` (Decimal 12,2, Default 0), `image_path` (Nullable), `is_active` (Default `true`), `timestamps`
- **`package_duration_prices`**: `id` (PK), `package_id` (FK, Cascade), `duration_days` (>= 2), `price` (Decimal 12,2), `timestamps`; Unique (`package_id`, `duration_days`)
- **`package_items`**: `id` (PK), `package_id` (FK, Cascade), `product_variant_id` (FK), `quantity`, `timestamps`

### 3.4. Rentals, Payments & Maintenance

- **`rentals`** (Transaksi Utama)
    - `id` (PK, BigInt)
    - `rental_code` (String, Unique) — misal `OC-202610-001`
    - `customer_id` (FK -> `customers.id`)
    - `pickup_at` (DateTime) — jadwal ambil yang dipilih customer (tanggal + jam)
    - `start_date` (Date) — tanggal ambil fisik (= tanggal dari `pickup_at`); dasar pemblokiran stok
    - `billing_start_date` (Date) — tanggal mulai hitung (lihat 4.3)
    - `end_date` (Date) — tanggal kembali
    - `return_due_at` (DateTime) — batas kembali: `end_date` 24:00 (= 00:00 hari berikutnya)
    - `picked_up_at` (DateTime, Nullable) — waktu ambil aktual
    - `returned_at` (DateTime, Nullable) — waktu kembali yang dikonfirmasi
    - `return_confirmed_by` (Enum: `admin`, `system`, Nullable)
    - `return_confirmed_at` (DateTime, Nullable)
    - `stock_release_at` (DateTime, Nullable) — kapan stok kembali ready
    - `total_days` (Integer)
    - `rental_amount` (Decimal: 12,2) — total biaya sewa (tanpa deposit)
    - `deposit_amount` (Decimal: 12,2, Default: 0)
    - `grand_total` (Decimal: 12,2) — `rental_amount + deposit_amount`
    - `payment_type` (Enum: `full`, `down_payment`)
    - `down_payment_amount` (Decimal: 12,2, Default: 0)
    - `remaining_balance` (Decimal: 12,2, Default: 0)
    - `late_fee_per_day` (Decimal: 12,2, Default: 0) — snapshot dari konfigurasi
    - `late_days` (Integer, Default: 0)
    - `late_fee_amount` (Decimal: 12,2, Default: 0)
    - `damage_deduction_amount` (Decimal: 12,2, Default: 0) — potongan deposit karena rusak/hilang
    - `deposit_refund_amount` (Decimal: 12,2, Default: 0)
    - `deposit_status` (Enum: `held`, `refunded`, `partially_refunded`, `forfeited`, Default: `held`)
    - `payment_deadline_at` (DateTime) — batas waktu bayar
    - `cancel_reason` (Text, Nullable)
    - `refund_amount` (Decimal: 12,2, Default: 0) — refund pembatalan (diisi admin)
    - `status` (Enum: `pending_payment`, `waiting_confirmation`, `dp_paid`, `fully_paid`, `picked_up`, `returned`, `completed`, `cancelled`)
    - `is_self_order` (Boolean, Default: `false`)
    - `notes` (Text, Nullable)
    - `timestamps`

- **`rental_payments`** _(riwayat bukti bayar; menggantikan `payment_proof_path`)_
    - `id` (PK), `rental_id` (FK, Cascade)
    - `kind` (Enum: `dp`, `full`, `settlement`, `late_fee_topup`)
    - `amount` (Decimal 12,2)
    - `method` (Enum: `transfer`, `qris`, `cash`)
    - `proof_path` (String, Nullable) — null jika tunai dicatat admin
    - `status` (Enum: `waiting`, `approved`, `rejected`)
    - `review_note` (Text, Nullable), `reviewed_by` (FK users, Nullable), `reviewed_at` (DateTime, Nullable), `timestamps`

- **`rental_items`**
    - `id` (PK), `rental_id` (FK, Cascade)
    - `rentable_type` (String) — Polymorphic: `App\Models\ProductVariant` / `App\Models\Package`
    - `rentable_id` (BigInt)
    - `quantity` (Integer)
    - `unit_price` (Decimal 12,2) — snapshot harga per unit untuk total durasi
    - `price_breakdown` (JSON) — snapshot rincian kombinasi tier yang dipakai
    - `subtotal` (Decimal 12,2) — `quantity x unit_price`
    - `deposit_per_unit` (Decimal 12,2, Default 0) — snapshot
    - `deposit_subtotal` (Decimal 12,2, Default 0)
    - `return_condition` (Enum: `good`, `damaged`, `lost`, Nullable)
    - `needs_maintenance` (Boolean, Default `false`)
    - `timestamps`

> Harga, deposit, dan tarif denda **di-snapshot** saat order dibuat; perubahan master tidak mengubah transaksi berjalan.

- **`variant_maintenances`**: `id` (PK), `product_variant_id` (FK), `rental_item_id` (FK, Nullable), `quantity`, `reason` (Enum: `cleaning`, `repair`, `inspection`), `status` (Enum: `in_maintenance`, `ready`), `notes` (Nullable), `completed_at` (Nullable), `timestamps`

### 3.5. Konfigurasi Bisnis & Audit

**Tidak ada modul pengaturan di panel admin.** Seluruh aturan bisnis di bawah ini **ditetapkan sekali oleh developer** sebagai konfigurasi aplikasi (file `config/rental.php`, nilai sensitif lewat `.env`). Admin tidak dapat mengubahnya dari antarmuka; perubahan hanya lewat developer (deploy ulang). Tidak ada tabel `settings` di database.

| Key konfigurasi | Nilai tetap | Keterangan |
| --------------- | ----------- | ---------- |
| `pickup_earliest_time` | `06:00` | Jam ambil paling awal |
| `pickup_latest_time` | `23:30` | Slot ambil terakhir (slot per 30 menit) |
| `evening_cutoff_time` | `18:00` | Ambil pada/setelah jam ini dihitung tanggal berikutnya |
| `return_deadline_time` | `24:00` | Batas kembali pada akhir tanggal kembali |
| `return_buffer_days` | `1` | Jeda hari setelah tanggal kembali |
| `auto_confirm_return_days` | `2` | Auto-konfirmasi jika admin tidak konfirmasi |
| `dp_enabled` | `true` | DP diizinkan |
| `dp_percentage` | `50` | Persentase DP dari (sewa + deposit) |
| `late_fee_per_day` | `50000` | Denda konstan per hari keterlambatan |
| `payment_timeout_hours` | `24` | Batas waktu bayar setelah checkout |
| `min_lead_hours` | `2` | Selisih minimum sekarang ke jadwal ambil |
| `bank_accounts` | Rekening + file gambar QRIS | Informasi pembayaran yang ditampilkan di checkout |

- **`rental_status_logs`**: `rental_id`, `from_status`, `to_status`, `actor_id` (Nullable = sistem), `note`, `created_at`.

---

## 4. Business Flows & Logistics

### 4.1. Verification & Identity Strategy

**Data pribadi final:** Nama Lengkap, Email, No. Telepon (WhatsApp), Alamat, Kontak Darurat (nomor + relasi), Sosial Media (TikTok / Instagram / Facebook, minimal 1 untuk memesan). **Tidak ada KTP, selfie, atau NIK.** KTP fisik diserahkan langsung saat pengambilan di outlet.

- **Registrasi (2 step):**
    - Step 1 — Data Akun: `name` (Nama Lengkap), `email`, `phone_number`, `password`, `password_confirmation`.
    - Step 2 — Data Tambahan (opsional saat registrasi): `emergency_contact` (nomor + relasi), `address`, `social_media` (platform + URL). Label "(opsional)" hanya tampil di formulir registrasi step 2.
- **Profil & Awareness:** pada `settings/profile`, banner kuning tanpa border di atas card data diri jika alamat, kontak darurat, atau sosial media kosong. Field tetap boleh kosong saat update profil.
- **First Checkout (gate wajib):** sebelum submit order, sistem mewajibkan **alamat, kontak darurat, dan minimal 1 sosial media** terisi. Jika belum, form pelengkap data tampil inline di checkout dan order tidak bisa disubmit.
- **Admin Manual Create:** admin dapat mengisi Nama Lengkap, telepon, email (boleh kosong untuk walk-in; sistem membuat akun tanpa login), kontak darurat, alamat, dan sosial media.
- **Pratinjau & Edit Profil Admin:** seluruh baris tabel pelanggan dapat diklik untuk membuka dialog detail/edit. Kontak darurat ditampilkan berawalan `+` (misal `+628822533 (Orang Tua)`), teks panjang di-truncate, alignment margin sejajar.

### 4.2. Pricing Engine (Harga per Durasi)

Admin menembak harga nominal untuk durasi yang diinginkan; tidak ada persentase diskon.

**Data:** harga 1 hari (`rental_price_per_day`) + daftar tier (`duration_days`, `price`) per varian/paket. `price` adalah total per unit untuk durasi tersebut.

**Aturan hitung harga per unit untuk durasi `n` hari** (otomatis pilih yang **paling murah untuk customer**):

1. Hitung `exact(n)` = biaya minimum dari kombinasi tier + harga 1 hari yang jumlah harinya **tepat** `n` (tier boleh dipakai berulang).
2. Hitung `rounded(n)` = harga tier terkecil yang durasinya **lebih besar dari** `n` (jika ada).
3. `unit_price(n) = min(exact(n), rounded(n))`.

Dengan aturan ini harga tidak pernah melebihi tier di atasnya, dan durasi lebih pendek tidak pernah lebih mahal dari durasi lebih panjang.

**Contoh** (1 hari Rp20.000; tier 3 hari Rp50.000; tier 7 hari Rp100.000):

| Durasi | Perhitungan | Harga/unit |
| ------ | ----------- | ---------- |
| 1 hari | harga 1 hari | Rp20.000 |
| 2 hari | 2 x 20.000 | Rp40.000 |
| 3 hari | tier 3 | Rp50.000 |
| 4 hari | 50.000 + 20.000 | Rp70.000 |
| 5 hari | 50.000 + 2 x 20.000 | Rp90.000 |
| 6 hari | 3+3 hari = 100.000 (sama dengan tier 7) | Rp100.000 |
| 7 hari | tier 7 | Rp100.000 |
| 8 hari | 100.000 + 20.000 | Rp120.000 |

**Deposit:** `deposit_per_unit x quantity`, tidak dipengaruhi durasi. Paket memakai `deposit_per_package x quantity paket`.

**Total:** `subtotal_item = unit_price x quantity`; `rental_amount = jumlah subtotal`; `deposit_amount = jumlah deposit_subtotal`; `grand_total = rental_amount + deposit_amount`.

**Contoh:** Tenda 4P (deposit Rp50.000/unit), 2 unit, 4 hari -> sewa 2 x 70.000 = Rp140.000; deposit Rp100.000; grand total Rp240.000.

### 4.3. Sistem Sewa Pertanggal (Aturan Poster "Sistem Sewa")

Sistem sewa **pertanggal (bukan 24 jam)**.

**Jam ambil:** customer memilih tanggal ambil dan jam ambil (slot 30 menit, **06:00 sampai 23:30**).

**Menentukan tanggal mulai hitung (`billing_start_date`):**
- Jam ambil **06:00-17:59** -> `billing_start_date` = tanggal ambil.
- Jam ambil **18:00-23:30** (18:00 ke atas) -> `billing_start_date` = **tanggal ambil + 1 hari**.

**Pengembalian:** customer memilih **tanggal kembali**; batas kembali adalah **00:00 pada akhir tanggal kembali** (`return_due_at` = `end_date` 24:00). Jam kembali tidak dipilih customer.

**Durasi:** `total_days = end_date - billing_start_date + 1` (inklusif).

**Validasi tanggal kembali:** `end_date >= billing_start_date`. Pickup tidak boleh lebih awal dari `now + min_lead_hours`.

| Contoh | Ambil | Mulai hitung | Kembali | Durasi |
| ------ | ----- | ------------ | ------- | ------ |
| 1 hari sewa (poster) | tgl 1, 19:00 | tgl 2 | tgl 2 maks 00:00 | **1 hari** |
| Pertrip 3 hari (poster) | tgl 1, 19:00 | tgl 2 | tgl 4 maks 00:00 | **3 hari** |
| Ambil pagi | tgl 1, 10:00 | tgl 1 | tgl 2 maks 00:00 | **2 hari** |
| Ambil pagi, kembali hari yang sama | tgl 1, 10:00 | tgl 1 | tgl 1 maks 00:00 | **1 hari** |

(Catatan penulisan: "tgl 2 maks 00:00" berarti sampai akhir tanggal 2 / tengah malam; "jam 12 malam" pada poster.)

**UI kalender:** date-range picker (Tanggal Ambil - Tanggal Kembali) + pilihan jam ambil. Setelah memilih, tampil ringkasan otomatis: "Mulai dihitung: <tanggal>", "Durasi: N hari", "Kembali maksimal: <tanggal> pukul 00:00". Tanggal kembali yang < `billing_start_date` dinonaktifkan di kalender.

### 4.4. Availability & Real-Time Stock Calculation

Untuk rentang tanggal $[T_{start}, T_{end}]$:

$$\text{Available Stock} = \text{Total Stock} - (\text{Rented in Range termasuk Buffer} + \text{In Maintenance})$$

Sebuah rental **memblokir stok dari `start_date` (tanggal ambil fisik) sampai `end_date + return_buffer_days`**. Stok ready lagi pukul **00:00 hari setelah hari buffer**.

| Kejadian | Tanggal |
| -------- | ------- |
| Tanggal kembali | 18 |
| Hari buffer (stok **tidak** ready) | 19 |
| Stok ready lagi | 20, mulai 00:00 |

- **Kembali terlambat:** buffer dihitung dari tanggal kembali **aktual** (`returned_at`). Contoh: kembali aktual tgl 19 -> buffer tgl 20 -> ready tgl 21 00:00. Selama belum dikonfirmasi kembali, unit tetap terblokir.
- **Dikonfirmasi lebih awal:** buffer tetap 1 hari penuh dihitung dari `end_date`; stok tidak dilepas lebih cepat.
- **Maintenance tambahan:** unit yang diberi `needs_maintenance` masuk `variant_maintenances` (`in_maintenance`) dan tidak tersedia sampai "Tandai Siap"; berjalan terpisah dan tambahan dari buffer 1 hari.
- **Paket:** ketersediaan = minimum `floor(available(variant) / quantity)` dari seluruh `package_items`.
- **Status yang memblokir stok:** `pending_payment` (hold sampai `payment_deadline_at`), `waiting_confirmation`, `dp_paid`, `fully_paid`, `picked_up`, dan `returned` sampai `stock_release_at`. Status `cancelled` melepas stok.

### 4.5. Order & Payment Flow

1. **Checkout:** customer memeriksa ringkasan (tanggal, jam, durasi, harga, deposit, grand total) lalu memilih **DP** atau **Lunas**.
    - **DP:** `down_payment_amount = 50% x grand_total` (sewa + deposit), dibulatkan ke atas ke kelipatan Rp1.000; `remaining_balance = grand_total - down_payment_amount`, dilunasi di outlet saat pengambilan.
    - **Lunas:** 100% `grand_total`.
2. **Hold stok:** order berstatus `pending_payment` menahan stok sampai `payment_deadline_at` (= checkout + 24 jam). Lewat batas -> otomatis `cancelled`, stok dilepas. Penolakan bukti bayar tidak memperpanjang batas ini.
3. **Instruksi bayar:** tampil rekening/QRIS, nominal, dan hitung mundur batas bayar.
4. **Upload bukti:** screenshot (jpg/png/pdf, maks 5 MB) -> `rental_payments.status = waiting`, rental `waiting_confirmation`.
5. **Konfirmasi #1 Admin (pesanan masuk):**
    - **Approve** -> `dp_paid` (jika DP) atau `fully_paid` (jika lunas); booking resmi.
    - **Reject** (catatan alasan wajib) -> kembali `pending_payment`; customer unggah ulang selama masih sebelum `payment_deadline_at`.
6. **Pengambilan:** pada tanggal ambil, admin mencatat pelunasan sisa (`rental_payments` kind `settlement`, transfer/QRIS/tunai) -> `fully_paid`, lalu "Tandai Diambil" -> `picked_up` (isi `picked_up_at`). Tidak bisa `picked_up` jika `remaining_balance > 0`. Jika customer tidak datang, admin membatalkan manual (4.9).

### 4.6. Return Confirmation, Late Fee & Auto-Confirm

**Konfirmasi #2 Admin (barang dikembalikan):** masa sewa resmi dianggap selesai setelah admin menekan konfirmasi pengembalian.

1. Admin membuka rental `picked_up` -> "Konfirmasi Dikembalikan" (`returned_at` = sekarang, bisa diedit).
2. Return Inspector: kondisi tiap item (`good`/`damaged`/`lost`), `needs_maintenance`, qty maintenance, potongan kerusakan/kehilangan (nominal manual, diisi admin).
3. **Denda keterlambatan (per hari, nominal konstan):**
    - `late_days = ceil((returned_at - return_due_at) / 24 jam)`, minimal 0 (tidak ada masa toleransi).
    - `late_fee_amount = late_days x late_fee_per_day`. Nominal **tetap per hari**, tidak bergantung jumlah/jenis item (Rp50.000 per hari, tetap, ditetapkan developer di konfigurasi dan di-snapshot ke rental saat order dibuat).
    - Contoh: batas kembali tgl 18 pukul 00:00 (akhir tgl 18); kembali tgl 19 pukul 14:00 -> terlambat 14 jam -> 1 hari -> Rp50.000; kembali tgl 20 pukul 01:00 -> 25 jam -> 2 hari -> Rp100.000.
4. **Penyelesaian deposit:** `deposit_refund_amount = max(0, deposit_amount - late_fee_amount - damage_deduction_amount)`. Jika total potongan melebihi deposit, selisih ditagihkan sebagai `rental_payments` kind `late_fee_topup`. `deposit_status`: `refunded` (kembali penuh), `partially_refunded` (ada potongan), `forfeited` (hangus seluruhnya, mis. barang hilang).
5. Status -> `returned`; `stock_release_at` dihitung sesuai 4.4. Setelah `stock_release_at` terlewati **dan** deposit sudah diselesaikan, status otomatis `completed`.

**Auto-konfirmasi:** jika admin belum mengonfirmasi hingga **2 hari setelah `return_due_at`**, scheduler otomatis mengonfirmasi: `return_confirmed_by = system`, `returned_at = return_due_at`, `late_days = 0`, semua item `good`, tanpa maintenance, deposit dikembalikan penuh. Rental diberi label "Auto-konfirmasi" dan admin masih dapat mengoreksi kondisi item, denda, dan deposit setelahnya. Pada H+1, dashboard menampilkan badge peringatan "akan auto-konfirmasi besok".

### 4.7. Maintenance Buffer Flow (di luar buffer 1 hari)

1. Kondisi bersih & siap sewa -> hanya buffer standar 1 hari, lalu stok otomatis ready.
2. Kondisi kotor/perlu dicek (tenda basah, alat kotor, pasak bengkok) -> centang `needs_maintenance`; unit (sebagian atau seluruh qty item) masuk `variant_maintenances` (`in_maintenance`, alasan `cleaning`/`repair`/`inspection`).
3. Unit tersebut tidak tersedia untuk tanggal mana pun sampai dipulihkan.
4. **Restorasi:** admin klik "Tandai Siap" -> `ready`, `completed_at` terisi, stok kembali ke pool publik.
5. Item `lost`: admin mengurangi `stock` varian secara permanen lewat penyesuaian stok bercatatan.

### 4.8. Status Lifecycle

```
pending_payment ──(upload bukti)──> waiting_confirmation
waiting_confirmation ──approve──> dp_paid | fully_paid
waiting_confirmation ──reject──> pending_payment
dp_paid ──(pelunasan di outlet)──> fully_paid
fully_paid ──(tandai diambil)──> picked_up
picked_up ──(konfirmasi admin / auto-konfirmasi H+2)──> returned
returned ──(lewat stock_release_at + deposit selesai)──> completed
pending_payment | waiting_confirmation | dp_paid | fully_paid ──> cancelled
```

Setiap transisi dicatat di `rental_status_logs`.

### 4.9. Pembatalan

- **Otomatis:** `pending_payment` yang melewati `payment_deadline_at` -> `cancelled`.
- **Oleh customer:** hanya saat `pending_payment` atau `waiting_confirmation` (tombol "Batalkan Pesanan"), tanpa biaya.
- **Oleh admin:** pada status `pending_payment` hingga `fully_paid` (sebelum `picked_up`), wajib isi `cancel_reason` dan `refund_amount` (nominal yang dikembalikan, boleh 0). Setelah `dp_paid`/`fully_paid`, pembatalan hanya bisa oleh admin.
- Pembatalan melepas stok seketika dan tercatat di `rental_status_logs`.

---

## 5. Functional Requirements Matrix

### 5.1. Admin Features

| ID | Modul | Fitur | Detail Teknis |
| -- | ----- | ----- | ------------- |
| AD-01 | Auth | Login / Logout | Laravel Sanctum / Session guard; rate limiting; hanya `role=admin`. |
| AD-02 | Customer Management | CRUD & Toggle Status | List, search (nama/email/telepon), activate/deactivate, klik baris untuk edit profil; field: nama lengkap, email, telepon, alamat, kontak darurat, sosial media. Tanpa KTP/NIK. Customer nonaktif tidak bisa login/checkout. |
| AD-03 | Master Catalog | CRUD Category | Slug otomatis, nested hierarchy (opsional); kategori berisi produk tidak dapat dihapus. |
| AD-04 | Master Attributes | Dynamic Attribute Management | Opsi: Warna, Ukuran, Kapasitas; atribut yang dipakai varian tidak dapat dihapus. |
| AD-05 | Product Management | CRUD Product + Variants + Harga per Durasi + Deposit | Form multi-step; detail 5.1.1. |
| AD-06 | Package Bundles | CRUD Packages | Komposisi `package_items`, harga 1 hari, harga per durasi, deposit per paket; tampil ketersediaan paket berdasarkan stok minimum. |
| AD-07 | Transaction Monitoring | Manage Rentals | Dua konfirmasi, preview bukti bayar, pelunasan, denda, deposit; detail 5.1.2. |
| AD-08 | Return & Maintenance | Return Inspector | Detail 5.1.3. |
| AD-09 | Rental Calendar | Visual Scheduler | View bulanan/mingguan; blok booking, **blok buffer 1 hari (warna berbeda)**, blok maintenance, kapasitas unit per tanggal; klik blok membuka detail rental. |
| AD-10 | Self Order (POS) | Admin Manual Order | Order walk-in/offline: pilih/buat customer, item, tanggal & jam ambil, tanggal kembali; harga/deposit memakai engine yang sama; catat pembayaran tunai/transfer; `is_self_order = true`; melewati gate kelengkapan data customer; langsung berstatus `dp_paid`/`fully_paid` sesuai nominal yang dicatat. |
| AD-11 | Dashboard Metrics | Analytics | Transaksi hari ini, jumlah per status, antrean "Butuh Konfirmasi" (pembayaran menunggu & pengembalian jatuh tempo), barang paling sering disewa, grafik revenue (sewa dan deposit dipisah). |

#### 5.1.1. Detail AD-05: Product Management

**Step 1 — Info Produk:** nama, kategori, deskripsi, status aktif, gambar (multi-upload, 1 primary).

**Step 2 — Varian & Stok:** pilih atribut dan nilai -> generate varian; per varian isi `sku`, `stock`, `weight_grams`, status aktif.

**Step 3 — Harga & Deposit (per varian):**
- **Harga 1 hari** (wajib, > 0).
- **Tabel "Harga per Durasi"**: tombol "+ Tambah Durasi" menambah baris `[Durasi (hari)] [Harga total per unit]`. Admin bebas menambah durasi apa pun (2, 3, 7, 10, dst.) dan mengetik **harga nominal langsung**. Baris dapat diubah/dihapus.
- **Deposit per unit** (nominal bebas, default 0, contoh Rp50.000).
- Tombol "Salin harga & deposit ke semua varian".
- **Pratinjau:** admin memasukkan durasi & qty simulasi -> sistem menampilkan harga dan deposit sesuai 4.2.

**Validasi:**
- Durasi unik per varian, bilangan bulat >= 2.
- Harga > 0; deposit >= 0; stok >= 0.
- Peringatan (bukan error) jika harga tier lebih mahal dari `durasi x harga 1 hari`.
- Produk/varian nonaktif tidak tampil di katalog, namun order lama tetap valid.

**Acceptance criteria:**
- Admin dapat menyimpan Tenda dengan harga 1 hari Rp20.000, tier 3 hari Rp50.000, tier 7 hari Rp100.000, deposit Rp50.000/unit.
- Customer memilih 3 hari -> tampil Rp50.000/unit; memilih 4 hari -> Rp70.000/unit; memilih 2 unit -> deposit Rp100.000.
- Mengubah harga tidak mengubah total pada order yang sudah dibuat.

#### 5.1.2. Detail AD-07: Transaction Monitoring

- **Daftar rental:** filter status, rentang tanggal, pencarian kode/nama customer; badge **"Butuh Konfirmasi"** untuk `waiting_confirmation` dan untuk `picked_up` yang sudah lewat `return_due_at`; badge "Terlambat" dan "Auto-konfirmasi".
- **Konfirmasi #1 — Pesanan masuk:** preview bukti transfer (zoom), nominal diterima vs yang seharusnya, tombol **Approve** / **Reject** (catatan wajib).
- **Pelunasan:** input nominal sisa (transfer/QRIS/tunai), tidak boleh melebihi `remaining_balance`.
- **Pengambilan:** "Tandai Diambil" (syarat: `fully_paid`).
- **Konfirmasi #2 — Pengembalian:** "Konfirmasi Dikembalikan" membuka Return Inspector (5.1.3) yang menampilkan batas kembali, `late_days`, dan `late_fee_amount` otomatis.
- **Deposit:** ringkasan `deposit_amount - late_fee - damage = deposit_refund_amount` dan tombol "Tandai Deposit Dikembalikan".
- **Pembatalan:** sesuai 4.9.
- **Riwayat:** timeline `rental_status_logs` pada halaman detail.

#### 5.1.3. Detail AD-08: Return Inspector & Maintenance

- Checklist per `rental_items`: kondisi (`good`/`damaged`/`lost`), `needs_maintenance`, qty maintenance, alasan, catatan, potongan kerusakan (nominal).
- Antrean maintenance: daftar `in_maintenance` dengan tombol "Tandai Siap".
- Item `lost`: tombol penyesuaian stok permanen.

### 5.2. Customer Features

| ID | Modul | Fitur | Detail Teknis |
| -- | ----- | ----- | ------------- |
| CU-01 | Auth | Registrasi & Login | Multi-step: Step 1 Akun (Nama Lengkap, email, telepon, password); Step 2 Kontak Darurat, Alamat, Sosial Media (opsional; icon TikTok/IG/FB). Tanpa KTP/NIK. Email unik; telepon format Indonesia (08xx / 62xx). |
| CU-02 | Profile & Data | Edit Profil & Data Diri | Update Nama Lengkap, no. WA, Kontak Darurat, Alamat, link sosmed; banner kuning awareness jika belum lengkap. |
| CU-03 | Search & Discovery | Hero Date Picker Search | Date-range picker (Tanggal Ambil - Tanggal Kembali) + pilih jam ambil; tampil ringkasan "mulai dihitung / durasi / kembali maks 00:00" (4.3); keyword; filter kategori. |
| CU-04 | Catalog & Detail | Filter & Varian Selector | Grid produk, gallery, pilih varian, **harga otomatis sesuai durasi (harga per durasi)**, **info deposit per unit**, ketersediaan real-time (stok per rentang + buffer). |
| CU-05 | Cart | Multi-Item Cart | Qty dibatasi stok tersedia; ringkasan subtotal sewa, **total deposit**, grand total; tanggal tersimpan di cart; ketersediaan divalidasi ulang saat checkout. |
| CU-06 | Checkout | DP / Full Payment | Detail 5.2.1. |
| CU-07 | Order History | Tracking Status | Histori sewa, status verifikasi admin, bukti bayar & alasan penolakan, sisa tagihan saat ambil barang, batas kembali, denda & status deposit, tombol batalkan (sesuai 4.9). |

#### 5.2.1. Detail CU-06: Checkout

1. Cek gate kelengkapan data (alamat, kontak darurat, >= 1 sosmed); jika kurang, form inline.
2. Ringkasan: item, tanggal & jam ambil, tanggal mulai hitung, tanggal & jam batas kembali, durasi, rincian harga, deposit, grand total, serta pengingat denda keterlambatan (Rp/hari dari `late_fee_per_day`).
3. Pilih pembayaran: **DP** (50% dari sewa + deposit) atau **Lunas**; jika `dp_enabled=false`, hanya Lunas. Tampil nominal bayar sekarang dan sisa yang dibayar saat ambil barang.
4. Info rekening/QRIS + hitung mundur batas bayar (24 jam).
5. Unggah bukti -> `waiting_confirmation`, tampil "Menunggu konfirmasi admin".
6. Jika ditolak, tampil alasan dan tombol unggah ulang (selama belum melewati batas bayar).

---

## 6. Non-Functional Requirements

- **Konsistensi stok:** pembuatan order memakai database transaction + row locking pada cek ketersediaan agar tidak double booking.
- **Keamanan:** bukti bayar di storage privat (signed URL; hanya admin dan pemilik order); password di-hash; rate limiting; validasi tipe & ukuran upload.
- **Privasi:** hanya data pada 4.1 yang disimpan; tidak ada KTP/NIK.
- **Auditability:** semua perubahan status, konfirmasi, harga, dan deposit tercatat (siapa & kapan).
- **Responsif:** mobile-first (mayoritas customer memesan lewat ponsel).
- **Scheduler (tiap 5 menit):** (1) batalkan `pending_payment` lewat `payment_deadline_at`; (2) auto-konfirmasi pengembalian H+2 setelah `return_due_at`; (3) lepas stok dan set `completed` setelah `stock_release_at` terlewati dan deposit selesai.

---

## 7. Keputusan Bisnis Final

| # | Keputusan | Ditetapkan |
| - | --------- | ---------- |
| 1 | Sistem sewa | Pertanggal; ambil >= 18:00 dihitung tanggal berikutnya; ambil 06:00-17:59 dihitung tanggal itu; kembali maks 00:00 (poster Sistem Sewa). |
| 2 | Harga | Nominal manual per durasi; durasi tanpa tier memakai kombinasi termurah (4.2). |
| 3 | Deposit | Per quantity, per produk/varian/paket, bebas diisi admin. |
| 4 | DP | Default aktif, 50% dari (sewa + deposit), sisa dilunasi saat ambil barang. |
| 5 | Denda keterlambatan | Per hari keterlambatan (dibulatkan ke atas), nominal konstan (Rp50.000/hari, tetap, ditetapkan developer), dipotong dari deposit. |
| 6 | Buffer | 1 hari setelah tanggal kembali; ready 00:00 hari berikutnya. |
| 7 | Auto-konfirmasi | H+2 setelah batas kembali, tanpa denda, kondisi dianggap baik. |
| 8 | Batas waktu bayar | 24 jam sejak checkout. |
| 9 | Pembatalan | Customer hanya sebelum pembayaran dikonfirmasi; setelahnya oleh admin dengan nominal refund manual. |
| 10 | Kerusakan/kehilangan | Potongan deposit nominal manual oleh admin. |
| 11 | Identitas | Tanpa KTP/NIK; KTP fisik diserahkan di outlet. |
