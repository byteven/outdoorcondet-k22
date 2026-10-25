export type CartItemType = 'product' | 'package';

export type CartItem = {
    type: CartItemType;
    id: number;
    name: string;
    quantity: number;
    total_days: number;
    unit_price: number;
    deposit_per_unit: number;
    pickup_date: string;
    return_date: string;
};

const CART_STORAGE_KEY = 'outdoorcondet:cart';

export const CART_UPDATED_EVENT = 'outdoorcondet:cart-updated';

export function readCart(): CartItem[] {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function mergeQuantityKey(item: CartItem): string {
    return `${item.type}:${item.id}:${item.pickup_date}:${item.return_date}:${item.total_days}`;
}

export function addToCart(item: CartItem): void {
    if (typeof window === 'undefined') {
        return;
    }

    const cart = readCart();
    const key = mergeQuantityKey(item);
    const existingIndex = cart.findIndex(
        (entry) => mergeQuantityKey(entry) === key,
    );

    if (existingIndex >= 0) {
        cart[existingIndex] = {
            ...cart[existingIndex],
            quantity: cart[existingIndex].quantity + item.quantity,
            unit_price: item.unit_price,
            deposit_per_unit: item.deposit_per_unit,
        };
    } else {
        cart.push(item);
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
