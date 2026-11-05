import * as React from 'react';
import { Input } from '@/components/ui/input';

export interface FormattedNumberInputProps
    extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
    value?: number | string;
    onValueChange?: (value: number) => void;
    min?: number;
    max?: number;
}

export const FormattedNumberInput = React.forwardRef<
    HTMLInputElement,
    FormattedNumberInputProps
>(({ value, onValueChange, className, disabled, placeholder = '0', ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);

    // Merge refs so both forwardedRef and innerRef work
    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement);

    const [displayVal, setDisplayVal] = React.useState<string>(() => {
        if (value === undefined || value === null || value === '' || value === 0) {
            return '';
        }
        const num =
            typeof value === 'number'
                ? value
                : Number(String(value).replace(/[^0-9]/g, ''));
        return isNaN(num) || num === 0 ? '' : num.toLocaleString('id-ID');
    });

    React.useEffect(() => {
        if (value === undefined || value === null || value === '' || value === 0) {
            setDisplayVal('');
            return;
        }
        const num =
            typeof value === 'number'
                ? value
                : Number(String(value).replace(/[^0-9]/g, ''));
        if (!isNaN(num)) {
            setDisplayVal(num.toLocaleString('id-ID'));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const raw = input.value;
        const cursorPos = input.selectionStart ?? raw.length;
        const digitsToRight = raw.slice(cursorPos).replace(/[^0-9]/g, '').length;

        const clean = raw.replace(/[^0-9]/g, '');
        if (clean === '') {
            setDisplayVal('');
            onValueChange?.(0);
            return;
        }

        const num = parseInt(clean, 10);
        const formatted = num.toLocaleString('id-ID');
        setDisplayVal(formatted);
        onValueChange?.(num);

        requestAnimationFrame(() => {
            if (!innerRef.current) return;
            let newCursor = formatted.length;
            if (digitsToRight > 0) {
                let count = 0;
                for (let i = formatted.length - 1; i >= 0; i--) {
                    if (/[0-9]/.test(formatted[i])) {
                        count++;
                        if (count === digitsToRight) {
                            newCursor = i;
                            break;
                        }
                    }
                }
            }
            innerRef.current.setSelectionRange(newCursor, newCursor);
        });
    };

    return (
        <Input
            {...props}
            ref={innerRef}
            type="text"
            inputMode="numeric"
            value={displayVal}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={className}
        />
    );
});

FormattedNumberInput.displayName = 'FormattedNumberInput';

