# Design System — outdoorcondet-k22

Stack: Tailwind v4 + shadcn/ui (Radix). Token warna hanya dari `resources/css/app.css`.
Semua komponen base ada di `resources/js/components/ui/`.

## Warna

- Warna hanya dari token CSS: `bg-background`, `text-foreground`, `bg-primary`,
  `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`,
  `bg-card`, `bg-popover`, `bg-sidebar`, `bg-destructive`, `bg-accent`.
- Primary merah `#C21C24`. Netral abu terang `#F9FAFB`/`#F3F4F6`. Border `#D1D5DB`.
- Netral legacy yang masih dipakai halaman (`neutral-100`, `neutral-200`,
  `neutral-500`, `neutral-700`, `neutral-900`) boleh, tapi utamakan token.
- Radius: `rounded-lg` (0.5rem), `rounded-md`, `rounded-sm`. Jangan bulat penuh.

## Tipografi

- Font: Inter, sans-serif bawaan.
- Hierarki: judul `text-2xl font-bold` → `text-lg font-semibold` → body `text-sm` →
  `text-muted-foreground`.
- Label form: `text-sm font-medium` (dari `Label`).

## Border

- Selalu `border` (1px) dengan warna token. Jangan `border-2`, `border-0` tanpa alasan.
- Card, dialog, panel, input, tabel semuanya pakai `border border-border` atau
  varian `border-sidebar-border/70` di area sidebar.

## Ikon

- Hanya `lucide-react`. Tidak ada emoji, tidak ada library ikon lain.
- Ukuran: `size-4` di dalam button/field, `size-5` di navigasi/sidebar.
- Button sudah otomatis `size-4` lewat `[&_svg:not([class*='size-'])]:size-4`.

## Spasi & layout

- Padding card: `p-6`, header/footer card `px-6`, dialog `p-6`.
- Gap antar field: `gap-4`. Gap antar section: `gap-6`.
- Grid responsif: `grid-cols-1 md:grid-cols-2` untuk form 2 kolom.

## Komponen

- Selalu cek `resources/js/components/ui/` sebelum membuat komponen baru.
  Ada: button, input, label, card, dialog, select, checkbox, calendar, badge,
  dropdown-menu, table, tabs, tooltip, sidebar, sheet, breadcrumb, alert, dll.
- Variants dipakai lewat `class-variance-authority` (`buttonVariants`), bukan
  class manual per pemakaian.
- Referensi: shadcn/ui. Base style di `resources/js/components/ui/` adalah
  referensi canonical. Modifikasi sekecil mungkin.
- Komponen wrapper/fitur (bukan primitive) di `resources/js/components/`.

## Form

- Field: `<Label>` + `<Input>`, dalam `div.grid.gap-2`.
- Angka uang/rate: `type="number"`, `min={0}`, `step` bila perlu.
- Select untuk enum. Nilai enum dari `app/*.php` (contoh `GearCondition`).

## Jangan

- Jangan tulis hex atau warna Tailwind langsung di halaman/komponen fitur
  (`#C21C24`, `red-500`, `bg-gray-100`). Pakai token.
- Jangan `uppercase` / `text-transform: uppercase` / teks KAPITAL. Sentence case
  (kecuali singkatan seperti SKU).
- Jangan `shadow`, `shadow-lg`, `drop-shadow` di button dan card.
- Jangan gradient (terutama ungu/indigo) dan jangan `backdrop-blur`.
- Jangan `border-2` atau `border-4`.
- Jangan bikin ikon sendiri sebagai SVG inline, atau pakai emoji.
- Jangan duplikasi komponen yang sudah ada di `components/ui/`.
- Jangan tambah dependency baru untuk sesuatu yang bisa pakai komponen ada.
- Jangan bikin warna/gradient dekoratif, glassmorphism, atau animasi dekoratif
  yang tidak punya fungsi.
