export type CartItemType = 'product' | 'package';

export type CartItem = {
    type: CartItemType;
    id: number;
    name: string;
    slug: string;
    image: string | null;
    unit_price: number;
    quantity: number;
    available: number;
};

export type CartState = {
    items: CartItem[];
    pickup_date: string;
    return_date: string;
    total_days: number;
};

export const CART_UPDATED_EVENT = 'cart:updated';
export const STORAGE_KEY = 'cart_state';

export const EMPTY_CART: CartState = {
    items: [],
    pickup_date: '',
    return_date: '',
    total_days: 0,
};

/**
 * Read cart state from localStorage
 */
export function readCartState(): CartState {
    if (typeof window === 'undefined') {
        return EMPTY_CART;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return EMPTY_CART;
        }

        return JSON.parse(stored);
    } catch {
        return EMPTY_CART;
    }
}

/**
 * Write cart state to localStorage and dispatch update event
 */
function writeCartState(state: CartState): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
    } catch {
        // Silent fail if localStorage is not available
    }
}

/**
 * Add or update item in cart
 */
export function addToCart(
    type: CartItemType,
    id: number,
    item: Omit<CartItem, 'type' | 'id'>,
    quantity: number,
): void {
    const state = readCartState();
    const existingIndex = state.items.findIndex(
        (i) => i.type === type && i.id === id,
    );

    if (existingIndex >= 0) {
        state.items[existingIndex].quantity += quantity;
    } else {
        state.items.push({
            type,
            id,
            ...item,
            quantity,
        });
    }

    writeCartState(state);
}

/**
 * Update quantity of cart item
 */
export function updateCartQuantity(
    type: CartItemType,
    id: number,
    quantity: number,
): void {
    const state = readCartState();
    const item = state.items.find((i) => i.type === type && i.id === id);

    if (item) {
        if (quantity <= 0) {
            removeCartItem(type, id);
        } else {
            item.quantity = quantity;
            writeCartState(state);
        }
    }
}

/**
 * Remove item from cart
 */
export function removeCartItem(type: CartItemType, id: number): void {
    const state = readCartState();
    state.items = state.items.filter((i) => !(i.type === type && i.id === id));
    writeCartState(state);
}

/**
 * Clear cart
 */
export function clearCart(): void {
    writeCartState(EMPTY_CART);
}

/**
 * Set rental dates for cart
 */
export function setCartDates(pickupDate: string, returnDate: string, totalDays: number): void {
    const state = readCartState();
    state.pickup_date = pickupDate;
    state.return_date = returnDate;
    state.total_days = totalDays;
    writeCartState(state);
}

/**
 * Get quantity of item in cart
 */
export function quantityInCart(
    items: CartItem[],
    type: CartItemType,
    id: number,
): number {
    const item = items.find((i) => i.type === type && i.id === id);
    return item?.quantity ?? 0;
}

/**
 * Calculate cart totals (rental, deposit, grand total)
 */
export function cartTotals(
    items: CartItem[],
): {
    rental: number;
    deposit: number;
    grand: number;
} {
    const totals = items.reduce(
        (acc, item) => ({
            ...acc,
            rental: acc.rental + item.unit_price * item.quantity,
            deposit: acc.deposit + item.unit_price * item.quantity,
        }),
        { rental: 0, deposit: 0, grand: 0 },
    );

    return {
        ...totals,
        grand: totals.rental + totals.deposit,
    };
}
