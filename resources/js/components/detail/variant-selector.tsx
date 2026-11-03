import { cn } from "@/lib/utils";
import type { RentalVariant } from "@/lib/rental-pricing";

export type DetailVariantValue = {
    attribute: string | null;
    value: string;
};

/** Opsi varian minimal yang dibutuhkan chip pemilih varian. */
export type DetailVariantOption = {
    id: number;
    sku: string;
    available: number | null;
    values: DetailVariantValue[];
};

export type DetailVariant = RentalVariant & DetailVariantOption;

type VariantSelectorProps = {
    /** Label kelompok chip, mis. "Varian Tenda". */
    label?: string;
    variants: DetailVariantOption[];
    selectedId: number | null;
    onSelect: (id: number) => void;
};

export function VariantSelector({
    label,
    variants,
    selectedId,
    onSelect,
}: VariantSelectorProps) {
    return (
        <div className="flex flex-col gap-2.5">
            <p className="text-sm font-medium">
                {label ?? variantGroupLabel(variants)}
            </p>
            <div className="flex flex-wrap gap-2" role="group">
                {variants.map((variant) => {
                    const isSelected = variant.id === selectedId;
                    const isSoldOut = variant.available === 0;

                    return (
                        <button
                            key={variant.id}
                            type="button"
                            disabled={isSoldOut}
                            aria-pressed={isSelected}
                            data-active={isSelected}
                            title={
                                isSoldOut
                                    ? "Stok varian ini tidak tersedia untuk tanggal terpilih"
                                    : undefined
                            }
                            className={cn(
                                "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium",
                                isSelected
                                    ? "border-primary bg-primary text-white"
                                    : "text-muted-foreground hover:border-primary/40 hover:text-primary",
                                isSoldOut &&
                                    "cursor-not-allowed line-through opacity-50",
                            )}
                            onClick={() => onSelect(variant.id)}
                        >
                            {variantChipLabel(variant)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function variantGroupLabel(variants: DetailVariantOption[]): string {
    const attributeNames = new Set(
        variants.flatMap((variant) =>
            variant.values
                .map((value) => value.attribute)
                .filter((name): name is string => name !== null),
        ),
    );

    if (attributeNames.size === 1) {
        const [attributeName] = attributeNames;

        return attributeName ?? "Varian";
    }

    return "Varian";
}

function variantChipLabel(variant: DetailVariantOption): string {
    const label = variant.values
        .map((value) => value.value)
        .join(" / ")
        .trim();

    return label || variant.sku;
}
