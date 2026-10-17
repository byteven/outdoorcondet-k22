import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

/**
 * Tombol hapus + dialog konfirmasi yang reusable antar modul.
 * Logika hapus disuntik lewat `onConfirm` oleh masing-masing modul.
 */
export function DeleteConfirmDialog({
    title = 'Hapus data?',
    description = 'Tindakan ini tidak dapat dibatalkan.',
    confirmLabel = 'Hapus',
    cancelLabel = 'Batal',
    processing = false,
    triggerLabel = 'Hapus',
    onConfirm,
}: {
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    processing?: boolean;
    triggerLabel?: string;
    onConfirm: () => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructiveOutline">
                    <Trash2 />
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="overflow-hidden sm:max-w-md">
                <DialogHeader className="shrink-0 min-w-0">
                    <DialogTitle className="truncate pr-6" title={title}>
                        {title}
                    </DialogTitle>
                    <DialogDescription className="break-words">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            {cancelLabel}
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant="default"
                        disabled={processing}
                        onClick={onConfirm}
                    >
                        {processing && <Spinner />}
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
