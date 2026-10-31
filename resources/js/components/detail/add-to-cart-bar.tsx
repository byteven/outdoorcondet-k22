import { useState } from 'react';
import { QuantityStepper } from '@/components/quantity-stepper';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { quantityInCart, type CartItemType } from '@/lib/cart';

type AddToCartBarProps = {
    type: CartItemType;
    id: number;
    available: number;
    disabled?: boolean;
    onAdd: (quantity: number) => boolean;
};

export function AddToCartBar({
    type,
    id,
    available,
    disabled = false,
    onAdd,
}: AddToCartBarProps) {
    const { items } = useCart();
    const inCart = quantityInCart(items, type, id);
    const remaining = Math.max(available - inCart, 0);
    const [quantity, setQuantity] = useState(1);
    const maxQuantity = Math.max(remaining, 1);
    const nextQuantity = Math.min(quantity, maxQuantity);

    if (remaining <= 0) {
        return (
            <p className="text-xs text-muted-foreground">
                Jumlah maksimal sudah ada di keranjang.
            </p>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <QuantityStepper
                value={nextQuantity}
                max={remaining}
                disabled={disabled}
                onChange={setQuantity}
            />
            <Button
                type="button"
                className="flex-1"
                disabled={disabled}
                onClick={() => {
                    if (onAdd(nextQuantity)) {
                        setQuantity(1);
                    }
                }}
            >
                Tambah ke keranjang
            </Button>
        </div>
    );
}
