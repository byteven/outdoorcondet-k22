import { cn } from "@/lib/utils";

/**
 * Logo QRIS resmi untuk menggantikan kata "QRIS" pada teks
 * metode pembayaran di halaman cart dan checkout.
 */
export function QrisLogo({ className }: { className?: string }) {
    return (
        <img
            src="/images/qris-logo.webp"
            alt="QRIS"
            className={cn("inline-block h-4 w-auto", className)}
        />
    );
}
