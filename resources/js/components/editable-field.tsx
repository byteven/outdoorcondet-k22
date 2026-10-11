import { Check, Copy, Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';

/**
 * Baris nilai yang bisa disalin dan diedit inline.
 * Ikon copy/edit hanya tampil saat hover, fokus, atau mode edit.
 * Mode edit menukar tampilan menjadi editor dari `children`.
 */
export function EditableField({
    label,
    id,
    display,
    editing,
    onToggleEdit,
    copyValue,
    error,
    hint,
    children,
}: {
    label: string;
    id?: string;
    display: React.ReactNode;
    editing: boolean;
    onToggleEdit: () => void;
    /** Nilai yang disalin. Tanpa ini tombol copy disembunyikan. */
    copyValue?: string;
    error?: string;
    hint?: React.ReactNode;
    children: React.ReactNode;
}) {
    const [hovered, setHovered] = useState(false);
    const [copied, setCopied] = useState(false);
    const copyTimeout = useRef<number | undefined>(undefined);

    useEffect(() => {
        return () => window.clearTimeout(copyTimeout.current);
    }, []);

    const visible = hovered || editing;

    const copy = async () => {
        if (!copyValue) {
            return;
        }

        try {
            await navigator.clipboard.writeText(copyValue);
            setCopied(true);
            window.clearTimeout(copyTimeout.current);
            copyTimeout.current = window.setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error('Gagal menyalin nilai.');
        }
    };

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            className="group grid gap-1 rounded-md px-4 py-2 hover:bg-muted/50"
        >
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">{editing ? children : display}</div>
                <div
                    className={
                        visible
                            ? 'flex shrink-0 items-center gap-1 opacity-100 transition-opacity'
                            : 'pointer-events-none flex shrink-0 items-center gap-1 opacity-0 transition-opacity'
                    }
                >
                    {copyValue !== undefined && (
                        <button
                            type="button"
                            onClick={copy}
                            aria-label={`Salin ${label}`}
                            tabIndex={visible ? 0 : -1}
                            className="cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none"
                        >
                            {copied ? (
                                <Check className="size-4" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggleEdit}
                        aria-label={`Ubah ${label}`}
                        tabIndex={visible ? 0 : -1}
                        className="cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none"
                    >
                        <Pencil className="size-4" />
                    </button>
                </div>
            </div>
            {hint}
            <InputError message={error} />
        </div>
    );
}
