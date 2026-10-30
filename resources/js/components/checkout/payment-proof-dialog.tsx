import { useEffect, useState } from 'react';
import { UploadIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QrisLogo } from '@/components/qris-logo';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type PaymentProofDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    amount: number;
    onUpload: (file: File) => void;
    uploading?: boolean;
};

/**
 * Dialog pembayaran QRIS minimalis.
 * - Area upload bukti dengan kotak dashed dan preview gambar.
 * - Nominal di tengah, tanpa banner kuning dan tanpa caption berlebih.
 * - Klik preview gambar untuk membuka modal penuh.
 */
export function PaymentProofDialog({
    open,
    onOpenChange,
    amount,
    onUpload,
    uploading = false,
}: PaymentProofDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            setFile(null);
            setFileError(null);
            setPreviewImage(null);
            setIsPreviewOpen(false);
        }
    }, [open]);

    const validateFile = (selected: File): string | null => {
        const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

        if (!allowed.includes(selected.type)) {
            return 'Format file harus JPG, PNG, atau PDF.';
        }

        if (selected.size > 5 * 1024 * 1024) {
            return 'Ukuran file maksimal 5 MB.';
        }

        return null;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const selected = event.target.files?.[0] ?? null;
        setFileError(null);
        setFile(selected);

        if (selected) {
            const error = validateFile(selected);

            if (error) {
                setFileError(error);
                setPreviewImage(null);

                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(selected);
        } else {
            setPreviewImage(null);
        }
    };

    const handleRemovePreview = (): void => {
        setFile(null);
        setFileError(null);
        setPreviewImage(null);
    };

    const handleSubmit = (event: React.FormEvent): void => {
        event.preventDefault();

        if (!file) {
            return;
        }

        const error = validateFile(file);

        if (error) {
            setFileError(error);

            return;
        }

        onUpload(file);
    };

    const hasImage = previewImage !== null && previewImage !== '';

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-sm sm:max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Pembayaran
                            <QrisLogo className="h-4" />
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col items-center gap-3">
                            <p className="text-sm font-medium text-foreground">
                                Nominal yang harus dibayar
                            </p>
                            <span className="text-xl font-bold text-primary tabular-nums">
                                {amount.toLocaleString('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    minimumFractionDigits: 0,
                                })}
                            </span>
                        </div>

                        <div
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer transition-colors hover:bg-muted/50",
                                hasImage && 'border-transparent bg-muted/50'
                            )}
                            onClick={() => {
                                if (!file && !hasImage) {
                                    document
                                        .getElementById('payment-proof-input')
                                        ?.click();
                                }
                            }}
                        >
                            {hasImage ? (
                                <>
                                    <button
                                        type="button"
                                        aria-label="Perbesar bukti pembayaran"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setIsPreviewOpen(true);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <img
                                            src={previewImage}
                                            alt="Preview bukti pembayaran"
                                            className="max-h-32 max-w-32 rounded-lg object-cover"
                                        />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Hapus bukti"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleRemovePreview();
                                        }}
                                        className="absolute top-2 right-2 flex size-6 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/80"
                                    >
                                        <XIcon className="size-3.5" />
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <UploadIcon
                                        className="size-6 text-muted-foreground/40"
                                    />
                                    <p className="text-xs text-muted-foreground text-center">
                                        Unggah bukti transfer
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 text-center">
                                        JPG, PNG, atau PDF. Maks. 5 MB.
                                    </p>
                                </div>
                            )}
                            <input
                                id="payment-proof-input"
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={handleFileChange}
                                disabled={uploading || file !== null}
                                className="hidden"
                            />
                        </div>

                        {fileError && (
                            <p className="text-xs text-destructive" role="alert">
                                {fileError}
                            </p>
                        )}

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={uploading}
                            >
                                Batal
                            </Button>
                            {file && (
                                <Button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full sm:w-auto"
                                >
                                    {uploading ? 'Mengunggah...' : 'Unggah Bukti'}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {hasImage && (
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className="max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle>Preview transaksi</DialogTitle>
                        </DialogHeader>

                        <img
                            src={previewImage}
                            alt="Preview bukti pembayaran"
                            className="max-h-[60vh] w-full rounded-lg border border-border object-contain"
                        />

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPreviewOpen(false)}
                            >
                                Tutup
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
