import { Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingCartIcon } from "lucide-react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { Button } from "@/components/ui/button";
import {
    cheapestVariantForDuration,
    type DurationPrice,
} from "@/lib/rental-pricing";
import { toRentalQueryDate } from "@/hooks/use-rental-dates";
import { index as cartIndex, store as cartStore } from "@/routes/cart";

type CartActionDetail =
    | {
          type: "alat";
          id: number;
          variants: {
              id: number;
              stock: number;
              rental_price_per_day: number;
              deposit_per_unit: number;
              duration_prices: DurationPrice[];
          }[];
      }
    | {
          type: "bundle";
          id: number;
      };

type CartActionProps = {
    detail: CartActionDetail;
    totalDays: number | null;
    pickupDate: Date | null;
    returnDate: Date | null;
    inCart: boolean;
    availability: number | null;
    selectedVariantId?: number | null;
    loading?: boolean;
    onMissingDates?: () => void;
};

/**
 * Aksi keranjang di halaman detail produk (di bawah TOTAL):
 * - customer: "Tambah ke Keranjang" / "Lihat Keranjang" jika sudah ada.
 * - guest: membuka modal login.
 * - admin: tidak ditampilkan (admin tidak punya keranjang).
 */
export function CartAction({
    detail,
    totalDays,
    pickupDate,
    returnDate,
    inCart,
    availability,
    selectedVariantId = null,
    loading = false,
    onMissingDates,
}: CartActionProps) {
    const { auth } = usePage().props;
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (auth.user?.role === "admin") {
        return null;
    }

    const hasRentalRange = totalDays !== null && !!pickupDate && !!returnDate;
    const isDisabled =
        (availability !== null && availability === 0) || loading;

    const handleAddToCart = () => {
        if (!hasRentalRange) {
            onMissingDates?.();

            return;
        }

        if (!auth.user) {
            setIsLoginOpen(true);

            return;
        }

        const rentable = resolveRentable(detail, totalDays, selectedVariantId);

        if (!rentable) {
            return;
        }

        router.post(
            cartStore.url(),
            {
                rentable_type: rentable.type,
                rentable_id: rentable.id,
                quantity: 1,
                pickup_date: toRentalQueryDate(pickupDate!),
                return_date: toRentalQueryDate(returnDate!),
            },
            {
                preserveScroll: true,
                onStart: () => setIsSubmitting(true),
                onFinish: () => setIsSubmitting(false),
                onError: (errors) => {
                    const message =
                        errors.quantity ??
                        errors.rentable_id ??
                        errors.pickup_date ??
                        errors.return_date ??
                        Object.values(errors)[0];

                    if (typeof message === "string") {
                        toast.error(message);
                    }
                },
            },
        );
    };

    if (inCart) {
        return (
            <Button asChild className="w-full rounded-full" size="lg">
                <Link href={cartIndex.url()}>Lihat Keranjang</Link>
            </Button>
        );
    }

    return (
        <>
            <Button
                type="button"
                className="w-full rounded-full"
                size="lg"
                disabled={isDisabled || isSubmitting}
                onClick={handleAddToCart}
            >
                <ShoppingCartIcon />
                {isSubmitting ? "Menambahkan..." : "Tambah ke Keranjang"}
            </Button>

            <LoginDialog
                open={isLoginOpen}
                onOpenChange={setIsLoginOpen}
                redirectTo={
                    typeof window !== "undefined"
                        ? window.location.pathname + window.location.search
                        : undefined
                }
            />
        </>
    );
}

/**
 * Item keranjang mengikuti varian yang dipilih user pada halaman detail;
 * fallback ke varian termurah untuk durasi terpilih bila belum ada
 * pilihan. Harga tetap dihitung ulang di server saat disimpan.
 */
function resolveRentable(
    detail: CartActionDetail,
    totalDays: number | null,
    selectedVariantId: number | null,
): { type: "variant" | "package"; id: number } | null {
    if (detail.type === "bundle") {
        return { type: "package", id: detail.id };
    }

    if (totalDays === null) {
        return null;
    }

    if (
        selectedVariantId !== null &&
        detail.variants.some((variant) => variant.id === selectedVariantId)
    ) {
        return { type: "variant", id: selectedVariantId };
    }

    const cheapest = cheapestVariantForDuration(detail.variants, totalDays);

    if (!cheapest || cheapest.variantId === null) {
        return null;
    }

    return { type: "variant", id: cheapest.variantId };
}
