import { z } from 'zod';

export type CategoryOption = {
    id: number;
    name: string;
    slug: string;
};

export type AttributeOption = {
    id: number;
    name: string;
};

export type ProductVariantValueRow = {
    attribute_id: number;
    attribute?: { id: number; name: string } | null;
    value: string;
};

export type VariantDurationPriceRow = {
    id?: number;
    duration_days: number;
    price: number | string;
};

export type ProductVariantRow = {
    id: number;
    sku: string;
    stock: number;
    rental_price_per_day: string | number;
    deposit_per_unit: string | number;
    weight_grams: number;
    is_active: boolean;
    values: ProductVariantValueRow[];
    duration_prices?: VariantDurationPriceRow[];
};

export type ProductImageRow = {
    id: number;
    image_path: string;
    is_primary: boolean;
};

export type ProductRow = {
    id: number;
    category_id: number;
    category?: { id: number; name: string; slug: string } | null;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    images: ProductImageRow[];
    variants: ProductVariantRow[];
    created_at: string | null;
    updated_at: string | null;
};

const variantValueSchema = z.object({
    attribute_id: z
        .number({ error: 'Atribut wajib dipilih.' })
        .int()
        .min(1, 'Atribut wajib dipilih.'),
    value: z
        .string({ error: 'Nilai atribut wajib diisi.' })
        .trim()
        .min(1, 'Nilai atribut wajib diisi.')
        .max(100, 'Nilai atribut maksimal 100 karakter.'),
});

const durationPriceSchema = z.object({
    id: z.number().int().optional(),
    duration_days: z
        .number({ error: 'Durasi hari wajib diisi.' })
        .int()
        .min(2, 'Durasi hari minimal 2 hari.')
        .max(365, 'Durasi hari maksimal 365 hari.'),
    price: z
        .number({ error: 'Harga durasi wajib diisi.' })
        .min(0, 'Harga minimal 0.')
        .max(100000000, 'Harga terlalu besar.'),
});

const variantSchema = z.object({
    id: z.number().int().optional(),
    sku: z
        .string({ error: 'SKU varian wajib diisi.' })
        .trim()
        .min(1, 'SKU varian wajib diisi.')
        .max(50, 'SKU maksimal 50 karakter.'),
    stock: z
        .number({ error: 'Stok varian wajib diisi.' })
        .int()
        .min(0, 'Stok minimal 0.')
        .max(10000, 'Stok maksimal 10000.'),
    rental_price_per_day: z
        .number({ error: 'Harga sewa wajib diisi.' })
        .min(0, 'Harga minimal 0.')
        .max(100000000, 'Harga terlalu besar.'),
    deposit_per_unit: z
        .number({ error: 'Harga deposit wajib diisi.' })
        .min(0, 'Harga deposit minimal 0.')
        .max(100000000, 'Harga deposit terlalu besar.'),
    weight_grams: z
        .number()
        .int()
        .min(0, 'Berat minimal 0.')
        .max(1000000, 'Berat terlalu besar.'),
    is_active: z.boolean(),
    values: z
        .array(variantValueSchema)
        .min(1, 'Minimal satu atribut wajib diisi untuk setiap varian.')
        .max(10, 'Maksimal 10 atribut per varian.'),
    duration_prices: z
        .array(durationPriceSchema)
        .max(20, 'Maksimal 20 opsi durasi.'),
});

export const productFormSchema = z.object({
    category_id: z
        .number({ error: 'Kategori wajib dipilih.' })
        .int()
        .min(1, 'Kategori wajib dipilih.'),
    name: z
        .string({ error: 'Nama produk wajib diisi.' })
        .trim()
        .min(1, 'Nama produk wajib diisi.')
        .max(100, 'Nama produk maksimal 100 karakter.'),
    slug: z
        .string()
        .trim()
        .max(120, 'Slug maksimal 120 karakter.')
        .optional()
        .or(z.literal('')),
    description: z
        .string()
        .trim()
        .max(1000, 'Deskripsi maksimal 1000 karakter.')
        .optional()
        .or(z.literal('')),
    is_active: z.boolean(),
    variants: z
        .array(variantSchema)
        .min(1, 'Minimal satu varian wajib diisi.')
        .max(20, 'Maksimal 20 varian.'),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

export const STEPS = [
    { label: 'Info produk' },
    { label: 'Varian & stok' },
    { label: 'Gambar' },
] as const;

export const MAX_IMAGES = 5;

const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
});

export function formatRupiah(value: string | number): string {
    return rupiah.format(Number(value) || 0);
}

export function totalStock(product: Pick<ProductRow, 'variants'>): number {
    return product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
}

export function lowestPrice(product: Pick<ProductRow, 'variants'>): number {
    if (product.variants.length === 0) {
        return 0;
    }

    return Math.min(
        ...product.variants.map((v) => Number(v.rental_price_per_day) || 0),
    );
}

export function variantLabel(
    variant: Pick<ProductVariantRow, 'sku' | 'values'>,
): string {
    if (variant.values.length === 0) {
        return variant.sku;
    }

    return variant.values.map((v) => v.value).join(' / ');
}

export function validateImageFiles(files: File[]): string | null {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    for (const file of files) {
        if (!allowed.includes(file.type)) {
            return `Format ${file.name} harus JPG, PNG, atau WebP.`;
        }

        if (file.size > 2 * 1024 * 1024) {
            return `Ukuran ${file.name} maksimal 2 MB.`;
        }
    }

    return null;
}
