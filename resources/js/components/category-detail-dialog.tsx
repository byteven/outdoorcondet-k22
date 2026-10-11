import { router, usePage } from "@inertiajs/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderTree } from "lucide-react";
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
import { destroy, update } from "@/routes/admin/categories";

export type CategoryRow = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    created_at: string | null;
    updated_at: string | null;
};

const updateCategorySchema = z.object({
    name: z
        .string({ error: "Nama kategori wajib diisi." })
        .trim()
        .min(1, "Nama kategori wajib diisi.")
        .max(100, "Nama kategori maksimal 100 karakter."),
    slug: z
        .string({ error: "Slug kategori wajib diisi." })
        .trim()
        .min(1, "Slug kategori wajib diisi.")
        .max(120, "Slug maksimal 120 karakter."),
    description: z
        .string()
        .trim()
        .max(1000, "Deskripsi maksimal 1000 karakter.")
        .optional()
        .or(z.literal("")),
});

type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

export function CategoryDetailDialog({
    category,
    onClose,
}: {
    category: CategoryRow | null;
    onClose: () => void;
}) {
    const [processing, setProcessing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const serverErrors = usePage().props.errors;
    const updateErrors = (serverErrors.updateCategory ?? {}) as Record<string, string>;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<UpdateCategoryFormData>({
        resolver: zodResolver(updateCategorySchema),
        defaultValues: {
            name: "",
            slug: "",
            description: "",
        },
    });

    useEffect(() => {
        if (category) {
            reset({
                name: category.name,
                slug: category.slug,
                description: category.description ?? "",
            });
        }
    }, [category?.id, reset]);

    if (!category) {
        return (
            <Dialog open={false} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto" />
            </Dialog>
        );
    }

    const onSubmit = (data: UpdateCategoryFormData) => {
        router.put(
            update(category.id).url,
            {
                name: data.name,
                slug: data.slug,
                description: data.description || undefined,
            },
            {
                errorBag: "updateCategory",
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
        <Dialog open={category !== null} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-md">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Detail & Edit Kategori</DialogTitle>
                    <DialogDescription>
                        Ubah data nama, slug, atau hapus kategori dari katalog.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex shrink-0 items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FolderTree className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{category.name}</p>
                        <p className="truncate text-xs text-muted-foreground font-mono">
                            /{category.slug}
                        </p>
                    </div>
                </div>

                <form
                    id="update-category-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="min-h-0 flex-1 overflow-y-auto px-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                >
                    <div className="flex flex-col gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-category-name">
                                Nama kategori <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-category-name"
                                type="text"
                                disabled={processing}
                                {...register("name")}
                            />
                            <InputError message={errors.name?.message ?? updateErrors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-category-slug">
                                Slug URL <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-category-slug"
                                type="text"
                                disabled={processing}
                                {...register("slug")}
                            />
                            <InputError message={errors.slug?.message ?? updateErrors.slug} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-category-description">
                                Deskripsi{" "}
                                <span className="text-xs text-muted-foreground font-normal">
                                    (opsional)
                                </span>
                            </Label>
                            <textarea
                                id="edit-category-description"
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
                                {category.created_at
                                    ? dateFormatter.format(new Date(category.created_at))
                                    : "-"}
                            </span>
                        </div>
                    </div>
                </form>

                <DialogFooter className="shrink-0 sm:justify-between">
                    <DeleteConfirmDialog
                        title={`Hapus kategori ${category.name}?`}
                        description="Kategori ini akan dihapus dari daftar katalog produk."
                        processing={deleting}
                        onConfirm={() => {
                            router.delete(destroy(category.id).url, {
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
                            form="update-category-form"
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
