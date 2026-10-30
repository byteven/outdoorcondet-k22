import { Check, CircleDashed, Loader, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type RentalStatus =
    | "pending_payment"
    | "waiting_confirmation"
    | "dp_paid"
    | "fully_paid"
    | "returned"
    | "cancelled";

type RentalStatusConfig = {
    label: string;
    badgeClass: string;
    iconCircleClass: string;
    iconClass: string;
    Icon: LucideIcon;
};

const statusConfig: Record<RentalStatus, RentalStatusConfig> = {
    pending_payment: {
        label: "Menunggu pembayaran",
        badgeClass: "bg-muted text-muted-foreground",
        iconCircleClass: "bg-transparent",
        iconClass: "text-muted-foreground size-3 md:size-3.5",
        Icon: CircleDashed,
    },
    waiting_confirmation: {
        label: "Menunggu konfirmasi",
        badgeClass: "bg-warning-muted text-warning",
        iconCircleClass: "bg-transparent",
        iconClass: "text-warning size-3 md:size-3.5",
        Icon: Loader,
    },
    dp_paid: {
        label: "Siap diambil",
        badgeClass: "bg-success-muted text-success",
        iconCircleClass: "bg-success",
        iconClass: "text-white",
        Icon: Check,
    },
    fully_paid: {
        label: "Siap diambil",
        badgeClass: "bg-success-muted text-success",
        iconCircleClass: "bg-success",
        iconClass: "text-white",
        Icon: Check,
    },
    returned: {
        label: "Selesai",
        badgeClass: "bg-success-muted text-success",
        iconCircleClass: "bg-success",
        iconClass: "text-white",
        Icon: Check,
    },
    cancelled: {
        label: "Dibatalkan",
        badgeClass: "bg-destructive/10 text-destructive",
        iconCircleClass: "bg-destructive",
        iconClass: "text-white",
        Icon: X,
    },
};

const fallbackConfig: RentalStatusConfig = {
    label: "Menunggu pembayaran",
    badgeClass: "bg-muted text-muted-foreground",
    iconCircleClass: "bg-transparent",
    iconClass: "text-muted-foreground size-3 md:size-3.5",
    Icon: CircleDashed,
};

type RentalStatusBadgeProps = {
    status: string;
    className?: string;
};

export function RentalStatusBadge({
    status,
    className,
}: RentalStatusBadgeProps) {
    const config = statusConfig[status as RentalStatus] ?? fallbackConfig;
    const { label, badgeClass, iconCircleClass, iconClass, Icon } = config;

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold md:px-2.5 md:text-xs",
                badgeClass,
                className,
            )}
        >
            <span
                className={cn(
                    "flex size-3 shrink-0 items-center justify-center rounded-full md:size-3.5",
                    iconCircleClass,
                )}
            >
                <Icon
                    className={cn("size-2 md:size-2.5", iconClass)}
                    strokeWidth={3}
                    aria-hidden="true"
                />
            </span>
            {label}
        </span>
    );
}
