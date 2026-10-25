import { useEffect, useState } from 'react';
import { CART_UPDATED_EVENT, readCart } from '@/lib/cart';

export function useCartCount(): number {
    const [count, setCount] = useState(() => readCart().length);

    useEffect(() => {
        const update = () => setCount(readCart().length);

        window.addEventListener(CART_UPDATED_EVENT, update);
        window.addEventListener('storage', update);

        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, update);
            window.removeEventListener('storage', update);
        };
    }, []);

    return count;
}
