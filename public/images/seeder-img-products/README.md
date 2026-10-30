# Seed Images — Gambar Dummy Produk

Folder ini **ikut git**. File di sini adalah sumber dummy untuk `ProductSeeder`.

```
produk-01.webp  → Tenda Dome
produk-02.webp  → Flysheet
produk-03.webp  → Bivak Ultralight
produk-04.webp  → Carrier
produk-05.webp  → Daypack
produk-06.webp  → Sleeping Bag
produk-07.webp  → Matras Sleeping
produk-08.webp  → Kompor Portable
produk-09.webp  → Nesting Cookset
produk-10.webp  → Lampu Tenda
produk-11.webp  → Headlamp
produk-12.webp  → Meja Lipat
produk-13.webp  → Kursi Lipat
produk-14.webp  → Trekking Pole
produk-15.webp  → Tenda Tunnel  (reserved – ada rental test 20-23 Nov 2026)
```

Saat `php artisan db:seed`, file disalin ke `storage/app/public/seed/products/` dan path di database tetap `seed/products/produk-XX.webp` (URL: `/storage/seed/products/...`).

`public/storage` adalah symlink, tidak di-commit. Device baru cukup `php artisan storage:link` lalu seed ulang.
