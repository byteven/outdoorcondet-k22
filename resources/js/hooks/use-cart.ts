import { useEffect, useMemo, useState } from 'react';
import {
    CART_UPDATED_EVENT,
    EMPTY_CART,
    cartTotals,
    readCartState,
    type CartState,
} from '@/lib/cart';

export function useCart(): CartState & {
    totals: ReturnType<typeof cartTotals>;
    isEmpty: boolean;
} {
    const [state, setState] = useState<CartState>(EMPTY_CART);

    useEffect(() => {
        const sync = () => setState(readCartState());

        sync();
        window.addEventListener(CART_UPDATED_EVENT, sync);
        window.addEventListener('storage', sync);

        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    const totals = useMemo(() => cartTotals(state.items), [state.items]);

    return {
        ...state,
        totals,
        isEmpty: state.items.length === 0,
    };
}
