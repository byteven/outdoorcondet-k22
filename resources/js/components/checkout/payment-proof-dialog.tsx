import { useState } from 'react';
import { UploadIcon, QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type PaymentProofDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rentalId: number | string;
    amount: number;
    onUpload: (file: File) => void;
    uploading?: boolean;
};

/**
 * Dialog pembayaran QRIS: menampilkan placeholder gambar QRIS, nominal,
 * dan input file untuk bukti transfer.
 */
export function PaymentProofDialog({
    open,
    onOpenChange,
    rentalId,
    amount,
    onUpload,
    uploading = false,
}: PaymentProofDialogProps) {
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const selected = event.target.files?.[0] ?? null;
        setFile(selected);
    };

    const handleSubmit = (event: React.FormEvent): void => {
        event.preventDefault();

        if (!file) {
            return;
        }

        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

        if (!allowed.includes(file.type)) {
            alert('Format file harus JPG, PNG, atau PDF.');

            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran file maksimal 5 MB.');

            return;
        }

        onUpload(file);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <QrCodeIcon className="size-5 text-primary" />
                        Bayar Sekarang (QRIS)
                    </DialogTitle>
                    <DialogDescription>
                        Scan QRIS berikut, lalu unggah bukti transfer sebagai
                        konfirmasi pembayaran.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex size-32 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/50">
                            <UploadIcon className="size-16 text-muted-foreground/40" />
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            Gambar QRIS akan ditampilkan di sini. Silakan scan
                            menggunakan aplikasi e-wallet / banking kamu.
                        </p>
                    </div>

                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm text-muted-foreground">
                                Nominal yang harus dibayar
                            </span>
                            <span className="text-xl font-semibold text-amber-800 tabular-nums">
                                {amount.toLocaleString('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    minimumFractionDigits: 0,
                                })}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-amber-600">
                            Pembayaran lewat QRIS. Simpan bukti transfer lalu
                            unggah di bawah.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="payment-proof">
                            Bukti pembayaran
                        </Label>
                        <Input
                            id="payment-proof"
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileChange}
                            disabled={uploading || file !== null}
                            className="file:mr-4 file:py-1"
                        />
                        {file && (
                            <p className="text-xs text-muted-foreground">
                                {file.name} ({Math.round(file.size / 1024)} KB)
                            </p>
                        )}
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={uploading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={!file || uploading}
                            className="w-full sm:w-auto"
                        >
                            {uploading ? 'Mengunggah...' : 'Konfirmasi Pembayaran'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
