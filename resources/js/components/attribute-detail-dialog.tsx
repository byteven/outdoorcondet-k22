import { router, usePage } from "@inertiajs/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { destroy, update } from "@/routes/admin/attributes";

export type AttributeRow = {
    id: number;
    name: string;
    description: string | null;
    created_at: string | null;
    updated_at: string | null;
};

const updateAttributeSchema = z.object({
    name: z
        .string({ error: "Nama atribut wajib diisi." })
        .trim()
        .min(1, "Nama atribut wajib diisi.")
        .max(50, "Nama atribut maksimal 50 karakter."),
    description: z
        .string()
        .trim()
        .max(500, "Deskripsi maksimal 500 karakter.")
        .optional()
        .or(z.literal("")),
});

type UpdateAttributeFormData = z.infer<typeof updateAttributeSchema>;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

export function AttributeDetailDialog({
    attribute,
    onClose,
}: {
    attribute: AttributeRow | null;
    onClose: () => void;
}) {
    const [processing, setProcessing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const serverErrors = usePage().props.errors;
    const updateErrors = (serverErrors.updateAttribute ?? {}) as Record<string, string>;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<UpdateAttributeFormData>({
        resolver: zodResolver(updateAttributeSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    useEffect(() => {
        if (attribute) {
            reset({
                name: attribute.name,
                description: attribute.description ?? "",
            });
        }
    }, [attribute?.id, reset]);

    if (!attribute) {
        return (
            <Dialog open={false} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto" />
            </Dialog>
        );
    }

    const onSubmit = (data: UpdateAttributeFormData) => {
        router.put(
            update(attribute.id).url,
            {
                name: data.name,
                description: data.description || undefined,
            },
            {
                errorBag: "updateAttribute",
                preserveState: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    onClose();
                },
            },
        );
    };

    return (
        <Dialog open={attribute !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-md">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Detail & Edit Atribut</DialogTitle>
                    <DialogDescription>
                        Ubah nama atribut atau hapus dari daftar opsi varian produk.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <SlidersHorizontal className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{attribute.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {attribute.description || "Tidak ada deskripsi"}
                        </p>
                    </div>
                </div>

                <form
                    id="update-attribute-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="min-h-0 flex-1 overflow-y-auto px-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                >
                    <div className="flex flex-col gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-attribute-name">
                                Nama atribut <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-attribute-name"
                                type="text"
                                disabled={processing}
                                {...register("name")}
                            />
                            <InputError message={errors.name?.message ?? updateErrors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-attribute-description">
                                Deskripsi{" "}
                                <span className="text-xs text-muted-foreground font-normal">
                                    (opsional)
                                </span>
                            </Label>
                            <textarea
                                id="edit-attribute-description"
                                rows={3}
                                disabled={processing}
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                {...register("description")}
                            />
                            <InputError
                                message={errors.description?.message ?? updateErrors.description}
                            />
                        </div>

                        <div className="grid gap-1 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            <span>
                                Dibuat pada:{" "}
                                {attribute.created_at
                                    ? dateFormatter.format(new Date(attribute.created_at))
                                    : "-"}
                            </span>
                        </div>
                    </div>
                </form>

                <DialogFooter className="shrink-0 sm:justify-between">
                    <DeleteConfirmDialog
                        title={`Hapus atribut ${attribute.name}?`}
                        description="Atribut ini akan dihapus dari opsi varian produk."
                        processing={deleting}
                        onConfirm={() => {
                            router.delete(destroy(attribute.id).url, {
                                preserveState: true,
                                onStart: () => setDeleting(true),
                                onFinish: () => setDeleting(false),
                                onSuccess: () => onClose(),
                            });
                        }}
                    />

                    <div className="flex items-center gap-2">
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing || deleting}
                            >
                                Batal
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            form="update-attribute-form"
                            disabled={processing || deleting || !isDirty}
                        >
                            {processing ? <Spinner className="size-4" /> : null}
                            Simpan Perubahan
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
