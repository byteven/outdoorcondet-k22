import { Printer, CheckCircle2 } from 'lucide-react';
import { formatRupiah, formatDate, formatDateTime } from '@/components/rental-shared';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export type PosReceiptData = {
    rental: {
        id: number;
        rental_code: string;
        start_date: string;
        end_date: string;
        total_days: number;
        rental_amount: number | string;
        deposit_amount: number | string;
        grand_total: number | string;
        payment_type: 'full' | 'down_payment';
        down_payment_amount: number | string;
        remaining_balance: number | string;
        status: string;
        created_at: string;
        customer?: {
            id: number;
            phone_number: string;
            address?: string | null;
            user?: {
                id: number;
                name: string;
                email: string;
            };
        };
        items?: Array<{
            id: number;
            name: string;
            quantity: number;
            unit_price: number | string;
            subtotal: number | string;
            deposit_per_unit: number | string;
            deposit_subtotal: number | string;
        }>;
    };
    cash_tendered?: number | null;
    change?: number | null;
    payment_method: string;
    paid_amount: number;
};

type Props = {
    data: PosReceiptData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNewTransaction: () => void;
};

export function PosReceiptDialog({ data, open, onOpenChange, onNewTransaction }: Props) {
    if (!data) return null;

    const { rental, cash_tendered, change, payment_method, paid_amount } = data;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader className="print:hidden">
                    <div className="flex items-center gap-2 text-primary">
                        <CheckCircle2 className="size-5" />
                        <DialogTitle>Transaksi Berhasil</DialogTitle>
                    </div>
                    <DialogDescription>
                        Struk pembayaran rental telah dibuat. Anda dapat mencetak struk ini untuk pelanggan.
                    </DialogDescription>
                </DialogHeader>

                {/* Printable Receipt Paper Container */}
                <div
                    id="pos-receipt-printable"
                    className="rounded-lg border border-border bg-card p-5 text-foreground text-sm font-sans space-y-4 print:border-none print:p-0 print:m-0"
                >
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <h2 className="text-lg font-bold tracking-tight text-primary">OUTDOOR CONDET</h2>
                        <p className="text-xs text-muted-foreground">Penyewaan Alat Camping & Outdoor</p>
                        <p className="text-[11px] text-muted-foreground">Jl. Raya Condet, Jakarta Timur • Telp: 0812-8888-9999</p>
                    </div>

                    <div className="border-t border-dashed border-border my-2" />

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-y-1 text-xs">
                        <div>
                            <span className="text-muted-foreground">No. Transaksi: </span>
                            <span className="font-semibold text-foreground">{rental.rental_code}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-muted-foreground">Waktu: </span>
                            <span>{formatDateTime(rental.created_at)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Pelanggan: </span>
                            <span className="font-medium text-foreground">{rental.customer?.user?.name ?? 'Walk-in'}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-muted-foreground">No. HP: </span>
                            <span>{rental.customer?.phone_number ?? '-'}</span>
                        </div>
                        <div className="col-span-2 pt-1">
                            <span className="text-muted-foreground">Periode Sewa: </span>
                            <span className="font-medium text-foreground">
                                {formatDate(rental.start_date)} s/d {formatDate(rental.end_date)} ({rental.total_days} Hari)
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-border my-2" />

                    {/* Items List */}
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Rincian Barang
                        </div>
                        <div className="space-y-2">
                            {rental.items?.map((item) => (
                                <div key={item.id} className="text-xs flex justify-between items-start">
                                    <div className="pr-2">
                                        <div className="font-medium text-foreground">{item.name}</div>
                                        <div className="text-[11px] text-muted-foreground">
                                            {item.quantity} × {formatRupiah(item.unit_price)}
                                            {Number(item.deposit_per_unit) > 0 && ` (Jaminan: ${formatRupiah(item.deposit_subtotal)})`}
                                        </div>
                                    </div>
                                    <div className="font-semibold text-foreground text-right whitespace-nowrap">
                                        {formatRupiah(item.subtotal)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-dashed border-border my-2" />

                    {/* Financial Summary */}
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Total Biaya Sewa</span>
                            <span className="font-medium text-foreground">{formatRupiah(rental.rental_amount)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Total Jaminan (Deposit)</span>
                            <span className="font-medium text-foreground">{formatRupiah(rental.deposit_amount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                            <span>Grand Total</span>
                            <span className="text-primary">{formatRupiah(rental.grand_total)}</span>
                        </div>

                        <div className="pt-2 border-t border-dashed border-border space-y-1">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Jenis Pembayaran</span>
                                <span className="font-medium uppercase text-foreground">
                                    {rental.payment_type === 'down_payment' ? 'Uang Muka (DP 50%)' : 'Lunas (100%)'}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Metode Pembayaran</span>
                                <span className="font-medium uppercase text-foreground">
                                    {payment_method === 'cash' ? 'Tunai (Cash)' : 'QRIS Onsite'}
                                </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Nominal Dibayar</span>
                                <span className="font-semibold text-foreground">{formatRupiah(paid_amount)}</span>
                            </div>
                            {payment_method === 'cash' && cash_tendered !== null && cash_tendered !== undefined && (
                                <>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Uang Diterima</span>
                                        <span className="font-medium text-foreground">{formatRupiah(cash_tendered)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Kembalian</span>
                                        <span className="font-semibold text-primary">{formatRupiah(change ?? 0)}</span>
                                    </div>
                                </>
                            )}
                            {rental.payment_type === 'down_payment' && Number(rental.remaining_balance) > 0 && (
                                <div className="flex justify-between text-warning font-medium pt-1">
                                    <span>Sisa Tagihan saat Pengembalian</span>
                                    <span>{formatRupiah(rental.remaining_balance)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-dashed border-border my-2" />

                    {/* Footer Policy Notes */}
                    <div className="text-center text-[11px] text-muted-foreground space-y-1">
                        <p className="font-medium text-foreground">Terima kasih atas kunjungan Anda!</p>
                        <p>Wajib menunjukkan struk ini & KTP asli saat pengambilan/pengembalian alat.</p>
                        <p>Pengembalian maksimal pukul 23:59 WIB pada tanggal sewa berakhir.</p>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 print:hidden">
                    <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
                        <Printer className="size-4 mr-2" />
                        Cetak Struk
                    </Button>
                    <Button
                        onClick={() => {
                            onOpenChange(false);
                            onNewTransaction();
                        }}
                        className="w-full sm:w-auto"
                    >
                        Transaksi Baru
                    </Button>
                </DialogFooter>

                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #pos-receipt-printable, #pos-receipt-printable * {
                            visibility: visible;
                        }
                        #pos-receipt-printable {
                            position: fixed;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 20px;
                            border: none !important;
                            box-shadow: none !important;
                        }
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    );
}

