export type CartStockItem = {
    id: number;
    type: "alat" | "bundle";
    quantity: number;
    available: number;
    is_rentable: boolean;
    variant_id: number | null;
    variant_consumptions?: Record<string, number>;
    variant_available?: Record<string, number>;
};

/**
 * Kebutuhan varian per satu unit baris keranjang: baris alat memakai
 * satu variannya sendiri, baris paket memakai isi paketnya.
 */
function consumptionsOf(
    item: CartStockItem,
): [string, number][] {
    if (item.type === "alat") {
        return item.variant_id === null ? [] : [[String(item.variant_id), 1]];
    }

    // Baris paket dengan pemilihan varian bebas belum terikat varian,
    // sehingga bisa saja tanpa kebutuhan varian tetap sama sekali.
    return Object.entries(item.variant_consumptions ?? {})
        .filter(
            ([variantId, perUnit]) =>
                variantId !== "" && Number.isFinite(perUnit) && perUnit >= 1,
        )
        .map(
            ([variantId, perUnit]) => [variantId, perUnit] as [string, number],
        );
}

/**
 * Stok mentah varian menurut baris pemiliknya.
 */
function stockOf(item: CartStockItem, variantId: string): number {
    if (item.type === "alat") {
        return item.variant_id !== null && String(item.variant_id) === variantId
            ? item.available
            : 0;
    }

    return item.variant_available?.[variantId] ?? 0;
}

/**
 * Sisa & quantity maksimum satu baris keranjang setelah dikurangi
 * kebutuhan varian oleh baris lain pada keranjang yang sama
 * (mis. alat A juga dipakai paket V di keranjang yang sama).
 */
export function cartLineStock(
    item: CartStockItem,
    allItems: CartStockItem[],
): { remaining: number; max: number } {
    if (!item.is_rentable) {
        return { remaining: 0, max: item.quantity };
    }

    const consumptions = consumptionsOf(item);

    if (consumptions.length === 0) {
        // Baris tanpa kebutuhan varian tetap (mis. paket dengan semua item
        // bebas pilih varian) tidak bisa dibatasi per varian — pakai ketersediaan
        // paket yang sudah dihitung server (termasuk kapasitas semua varian).
        return {
            remaining: item.available,
            max: Math.max(item.quantity, item.available),
        };
    }

    const demandByVariant = new Map<string, number>();

    for (const other of allItems) {
        if (other.id === item.id || !other.is_rentable) {
            continue;
        }

        for (const [variantId, perUnit] of consumptionsOf(other)) {
            demandByVariant.set(
                variantId,
                (demandByVariant.get(variantId) ?? 0) + perUnit * other.quantity,
            );
        }
    }

    let remaining = Number.POSITIVE_INFINITY;

    for (const [variantId, perUnit] of consumptions) {
        if (perUnit < 1) {
            continue;
        }

        const freeUnits =
            stockOf(item, variantId) - (demandByVariant.get(variantId) ?? 0);

        remaining = Math.min(
            remaining,
            Math.floor(Math.max(0, freeUnits) / perUnit),
        );
    }

    if (!Number.isFinite(remaining)) {
        // Jangan pernah tampilkan 0 karena data kebutuhan yang tidak
        // lengkap; fallback ke ketersediaan dari server.
        remaining = item.available;
    }

    return { remaining, max: Math.max(item.quantity, remaining) };
}
