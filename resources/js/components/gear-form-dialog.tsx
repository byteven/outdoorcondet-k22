import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/**
 * Static "Add Gear" dialog — scaffold only.
 * 6 fields mirroring App\Models\Gear.
 */
export function GearFormDialog() {
    const [form, setForm] = useState({
        name: '',
        brand: '',
        condition: 'new',
        daily_rate: '',
        deposit_amount: '',
        stock: '',
    });

    const set = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    Add Something
                </Button>
            </DialogTrigger>

            {/* Fleksibel: lebar/tinggi bisa disesuaikan via className */}
            <DialogContent className="max-h-[85vh] overflow-y-auto bg-white sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Add New Gear</DialogTitle>
                    <DialogDescription>blablabla</DialogDescription>
                </DialogHeader>

                <form className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-neutral-700">
                            Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="Trek 500"
                            value={form.name}
                            onChange={(e) => set('name', e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="brand" className="text-neutral-700">
                            Brand
                        </Label>
                        <Input
                            id="brand"
                            placeholder="Decathlon"
                            value={form.brand}
                            onChange={(e) => set('brand', e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="condition" className="text-neutral-700">
                            Condition
                        </Label>
                        <Select
                            value={form.condition}
                            onValueChange={(v) => set('condition', v)}
                        >
                            <SelectTrigger id="condition" className="w-full">
                                <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="excellent">
                                    Excellent
                                </SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="fair">Fair</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="stock" className="text-neutral-700">
                            Stock
                        </Label>
                        <Input
                            id="stock"
                            type="number"
                            min={0}
                            placeholder="0"
                            value={form.stock}
                            onChange={(e) => set('stock', e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label
                            htmlFor="daily_rate"
                            className="text-neutral-700"
                        >
                            Daily Rate
                        </Label>
                        <Input
                            id="daily_rate"
                            type="number"
                            min={0}
                            placeholder="0.00"
                            value={form.daily_rate}
                            onChange={(e) => set('daily_rate', e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label
                            htmlFor="deposit_amount"
                            className="text-neutral-700"
                        >
                            Deposit Amount
                        </Label>
                        <Input
                            id="deposit_amount"
                            type="number"
                            min={0}
                            placeholder="0.00"
                            value={form.deposit_amount}
                            onChange={(e) =>
                                set('deposit_amount', e.target.value)
                            }
                        />
                    </div>
                </form>

                <DialogFooter className="bg-transparent pt-2">
                    <DialogClose asChild>
                        <Button variant="outline" type="button">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="submit">Save Gear</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
