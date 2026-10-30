# Design System — outdoorcondet-k22

Stack: Tailwind v4 + shadcn/ui (Radix). Token warna hanya dari `resources/css/app.css`.
Semua komponen base ada di `resources/js/components/ui/`.

## Warna

- Warna hanya dari token CSS: `bg-background`, `text-foreground`, `bg-primary`,
  `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`,
  `bg-card`, `bg-popover`, `bg-sidebar`, `bg-destructive`, `bg-accent`.
- Primary merah `#C21C24`. Netral abu terang `#F9FAFB`/`#F3F4F6`. Border `#D1D5DB`.
- Token status: `bg-success-muted`/`text-success` (hijau), `bg-info-muted`/`text-info`
  (biru), `bg-warning-muted`/`text-warning` (kuning), `bg-destructive/10`/`text-destructive`
  (merah tipis). Untuk badge status yang subtle dan tanpa border, pakai variant `secondary` + token ini.
- Netral legacy yang masih dipakai halaman (`neutral-100`, `neutral-200`,
  `neutral-500`, `neutral-700`, `neutral-900`) boleh, tapi utamakan token.
- Radius: `rounded-lg` (0.5rem), `rounded-md`, `rounded-sm`. Jangan bulat penuh.

## Tipografi

- Font: Mutlak **hanya Inter** (`font-sans`). Dilarang keras memakai font lain selain Inter (tidak boleh ada `font-mono`, serif, cursive, atau font lain), termasuk pada URL prefix, kode prefix telepon, placeholder input, maupun data tabel.
- Hierarki: judul `text-2xl font-bold` → `text-lg font-semibold` → body `text-sm` → `text-muted-foreground`.
- Label form: `text-sm font-medium` (dari `Label`), gunakan penamaan formal dan jelas (contoh: "Nama Lengkap", bukan "Nama Panggilan").
- Teks `(opsional)`: Wajib berukuran kecil dan memudar (`text-xs font-normal text-muted-foreground`). Formulir registrasi pelanggan (termasuk step 2) tidak menampilkan teks `(opsional)` karena alamat, kontak darurat, dan sosial media wajib diisi.
- Jangan pernah memunculkan label ganda/tumpang tindih (misal label field diikuti label opsional di bawahnya pada mode edit).

## Border

- Selalu `border` (1px) dengan warna token. Jangan `border-2`, `border-0` tanpa alasan.
- Card, dialog, panel, input, tabel semuanya pakai `border border-border` atau
  varian `border-sidebar-border/70` di area sidebar.
- Khusus banner pengingat / awareness: gunakan `border-0` (tanpa border).

## Ikon

- Ikon UI umum: Hanya `lucide-react`. Tidak ada emoji, tidak ada library ikon lain.
- Ukuran: `size-4` di dalam button/field, `size-5` di navigasi/sidebar.
- Button sudah otomatis `size-4` lewat `[&_svg:not([class*='size-'])]:size-4`.
- Ikon Brand Identity (seperti logo media sosial Facebook, Instagram, TikTok): Gunakan asset SVG resmi dari `public/images/` dan wajib mempertahankan warna asli brand identity masing-masing (misal Facebook biru asli, bukan monokrom atau diubah menjadi merah aplikasi).

## Spasi & layout

- Padding card: `p-6`, header/footer card `px-6`, dialog `p-6`.
- Gap antar field: `gap-4`. Gap antar section: `gap-6`.
- Grid responsif: `grid-cols-1 md:grid-cols-2` untuk form 2 kolom.
- Visual Alignment: Margin dan padding kiri-kanan pada dialog/card pratinjau harus sejajar secara visual (aligned) antara bagian header/avatar dengan deretan konten field di bawahnya.
- Dialog Form Padding: Pastikan area scrollable form dialog memiliki padding bawah yang cukup (misal `pb-6`) agar visual ring focus (`focus-visible:ring-[3px]`) pada input paling bawah tidak terpotong (cut off) oleh container dialog.

## Komponen

- Selalu cek `resources/js/components/ui/` sebelum membuat komponen baru.
  Ada: button, input, label, card, dialog, select, checkbox, calendar, badge,
  dropdown-menu, table, tabs, tooltip, sidebar, sheet, breadcrumb, alert, dll.
- Dropdown & Select: Wajib selalu menggunakan komponen `@/components/ui/select` (shadcn/ui), dilarang menggunakan elemen `<select>` native HTML.
- Pilihan / Selector Item (misal radio button / pilihan platform):
  - State aktif tidak boleh memakai warna merah menyala yang mencolok; gunakan warna netral token.
  - Gunakan indikator mark radio button di sisi kanan.
  - Hindari delay atau transisi durasi berlebih saat klik opsi aktif.
- Field Gabungan & Kontak Darurat:
  - Di sebelah prefix kode negara `+62` tidak boleh ada garis pembatas vertikal dengan input angka teleponnya.
  - Nilai kontak darurat pada tampilan pratinjau / copy wajib diawali dengan tanda `+` (misal: `+628822533 (Orang Tua)`).
- Data Table Interaktif:
  - Seluruh area baris data (`TableRow`) pada tabel manajemen (seperti Pelanggan dan Kategori) harus interaktif dan dapat diklik untuk langsung membuka modal pratinjau / edit.
- Proteksi Teks Panjang (Truncate):
  - Teks berpotensi panjang (nama, email, url, dsb.) pada dialog pratinjau dan konfirmasi wajib diproteksi dengan `truncate` dan atribut `title`.
  - Tombol aksi (seperti editable switch / tombol copy) harus selalu berada rapi di pojok kanan (always right-aligned) dan tidak boleh terdorong keluar area oleh teks yang panjang.
- Banner Awareness (Pengingat Informasi):
  - Gunakan komponen `Alert` berwarna kuning tanpa border (`border-0 bg-warning-muted text-warning`) yang diletakkan tepat di atas card data terkait.
- Halaman manajemen data (tabel): tanpa card dan tanpa border luar. Judul,
  ringkasan, filter, dan tabel diletakkan langsung di atas background halaman.
  Kartu ringkasan kecil tetap boleh memakai `border border-border`.
- Dialog scrollable memakai scrollbar tipis agar terlihat masih bisa di-scroll.
- Variants dipakai lewat `class-variance-authority` (`buttonVariants`), bukan
  class manual per pemakaian.
- Referensi: shadcn/ui. Base style di `resources/js/components/ui/` adalah
  referensi canonical. Modifikasi sekecil mungkin.
- Komponen wrapper/fitur (bukan primitive) di `resources/js/components/`.

## Form

- Field: `<Label>` + `<Input>`, dalam `div.grid.gap-2`.
- Angka uang/rate: `type="number"`, `min={0}`, `step` bila perlu.
- Select untuk enum/pilihan: gunakan shadcn `Select`.

## Jangan

- Jangan gunakan font apapun selain Inter (`font-mono`, serif, font dekoratif, dll.).
- Jangan gunakan elemen `<select>` native HTML.
- Jangan tulis hex atau warna Tailwind langsung di halaman/komponen fitur
  (`#C21C24`, `red-500`, `bg-gray-100`). Pakai token.
- Jangan `uppercase` / `text-transform: uppercase` / teks KAPITAL. Sentence case
  (kecuali singkatan seperti SKU).
- Jangan menaruh tulisan `(opsional)` pada formulir registrasi pelanggan.
- Jangan beri border pembatas vertikal di samping kode `+62` pada input nomor telepon.
- Jangan biarkan teks yang panjang mendorong tombol aksi editable/copy ke kanan atau terpotong tanpa kelas `truncate`.
- Jangan `shadow`, `shadow-lg`, `drop-shadow` di button dan card.
- Jangan gradient (terutama ungu/indigo) dan jangan `backdrop-blur`.
- Jangan `border-2` atau `border-4`.
- Jangan memakai card/border luar pada halaman tabel manajemen data.
- Jangan bikin ikon sendiri sebagai SVG inline, atau pakai emoji (kecuali asset SVG resmi untuk brand identity seperti sosmed).
- Jangan duplikasi komponen yang sudah ada di `components/ui/`.
- Jangan tambah dependency baru untuk sesuatu yang bisa pakai komponen ada.
- Jangan bikin warna/gradient dekoratif, glassmorphism, atau animasi dekoratif
  yang tidak punya fungsi.
