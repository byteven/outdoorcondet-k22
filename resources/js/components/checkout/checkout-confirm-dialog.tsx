import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type CheckoutConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

/**
 * Dialog konfirmasi sebelum ordem checkout diproses.
 * Minimalist: hanya judul dan keterangan.
 */
export function CheckoutConfirmDialog({
    open,
    onOpenChange,
    onConfirm,
}: CheckoutConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-sm sm:max-w-md bg-white"
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Konfirmasi Checkout
                    </DialogTitle>
                    <DialogDescription>
                        Item keranjang akan dipesan dan dijaga
                        ketersediaannya. Pastikan tanggal, jumlah, dan
                        pembayaran sudah benar.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Batal
                    </Button>
                    <Button type="button" onClick={onConfirm}>
                        Checkout Sekarang
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
