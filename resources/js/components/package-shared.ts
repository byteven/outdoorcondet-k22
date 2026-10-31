import { z } from 'zod';
import { variantLabel } from '@/components/product-shared';

export type PackageVariantOption = {
    id: number;
    sku: string;
    stock: number;
    is_active?: boolean;
    product?: { id: number; name: string } | null;
    values: { attribute_id: number; value: string }[];
};

export type PackageProductOption = {
    id: number;
    name: string;
    variants: PackageVariantOption[];
};

export type PackageItemRow = {
    id?: number;
    product_id: number;
    allow_variant_selection: boolean;
    product_variant_id: number | null;
    quantity: number;
    product?: {
        id: number;
        name: string;
        variants?: { id: number; stock: number; is_active: boolean }[];
    } | null;
    variant?: PackageVariantOption | null;
};

export type PackageDurationPriceRow = {
    id?: number;
    duration_days: number;
    price: number | string;
};

export type PackageRow = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    daily_price: string | number;
    deposit_per_package: string | number;
    image_path: string | null;
    is_active: boolean;
    available_stock: number;
    items: PackageItemRow[];
    duration_prices: PackageDurationPriceRow[];
    created_at: string | null;
    updated_at: string | null;
};

const packageItemSchema = z
    .object({
        product_id: z
            .number({ error: 'Produk item wajib dipilih.' })
            .int()
            .min(1, 'Produk item wajib dipilih.'),
        allow_variant_selection: z.boolean(),
        product_variant_id: z
            .number({ error: 'Varian item wajib dipilih.' })
            .int()
            .min(1, 'Varian item wajib dipilih.')
            .nullable(),
        quantity: z
            .number({ error: 'Jumlah item wajib diisi.' })
            .int()
            .min(1, 'Jumlah item minimal 1.')
            .max(10000, 'Jumlah item maksimal 10000.'),
    })
    .superRefine((item, ctx) => {
        if (!item.allow_variant_selection && item.product_variant_id === null) {
            ctx.addIssue({
                code: 'custom',
                path: ['product_variant_id'],
                message: 'Varian item wajib dipilih.',
            });
        }
    });

const packageDurationPriceSchema = z.object({
    duration_days: z
        .number({ error: 'Durasi wajib diisi.' })
        .int()
        .min(2, 'Durasi minimal 2 hari.')
        .max(365, 'Durasi maksimal 365 hari.'),
    price: z
        .number({ error: 'Harga durasi wajib diisi.' })
        .gt(0, 'Harga durasi harus lebih dari 0.')
        .max(100000000, 'Harga terlalu besar.'),
});

export const packageFormSchema = z.object({
    name: z
        .string({ error: 'Nama paket wajib diisi.' })
        .trim()
        .min(1, 'Nama paket wajib diisi.')
        .max(100, 'Nama paket maksimal 100 karakter.'),
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
    daily_price: z
        .number({ error: 'Harga 1 hari wajib diisi.' })
        .gt(0, 'Harga 1 hari harus lebih dari 0.')
        .max(100000000, 'Harga terlalu besar.'),
    deposit_per_package: z
        .number({ error: 'Deposit wajib diisi.' })
        .min(0, 'Deposit minimal 0.')
        .max(100000000, 'Deposit terlalu besar.'),
    is_active: z.boolean(),
    items: z
        .array(packageItemSchema)
        .min(1, 'Minimal satu item paket wajib diisi.')
        .max(50, 'Maksimal 50 item per paket.')
        .superRefine((items, ctx) => {
            const seen = new Set<number>();

            items.forEach((item, index) => {
                if (item.product_id < 1) {
                    return;
                }

                if (seen.has(item.product_id)) {
                    ctx.addIssue({
                        code: 'custom',
                        path: [index, 'product_id'],
                        message: 'Produk item tidak boleh duplikat.',
                    });
                }

                seen.add(item.product_id);
            });
        }),
    duration_prices: z
        .array(packageDurationPriceSchema)
        .max(20, 'Maksimal 20 opsi durasi.'),
});

export type PackageFormData = z.infer<typeof packageFormSchema>;

export function packageVariantLabel(
    variant: PackageVariantOption,
    productName?: string,
): string {
    const name = productName ?? variant.product?.name ?? variant.sku;

    return `${name} — ${variantLabel(variant)} (${variant.sku}) · stok ${variant.stock}`;
}
