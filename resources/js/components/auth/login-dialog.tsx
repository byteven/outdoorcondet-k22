import { usePage } from '@inertiajs/react';
import { LoginForm } from '@/components/auth/login-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type LoginDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Path lokal tujuan setelah login sukses. */
    redirectTo?: string;
};

/**
 * Modal login untuk guest (misal: klik "Tambah ke Keranjang"
 * sebelum login). Menggunakan ulang LoginForm dari halaman login.
 */
export function LoginDialog({
    open,
    onOpenChange,
    redirectTo,
}: LoginDialogProps) {
    const { errors } = usePage().props;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Masuk dulu, yuk</DialogTitle>
                    <DialogDescription>
                        Login untuk menambahkan alat ke keranjang sewa kamu.
                    </DialogDescription>
                </DialogHeader>

                <LoginForm
                    redirectTo={redirectTo}
                    preserveState
                    onSuccess={() => {
                        // Tutup modal hanya jika login benar-benar sukses;
                        // saat gagal, `errors` berisi pesan validasi dari server.
                        if (Object.keys(errors).length === 0) {
                            onOpenChange(false);
                        }
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
