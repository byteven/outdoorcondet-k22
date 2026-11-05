import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Boxes,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    GripVertical,
    Layers,
    Loader2,
    Minus,
    Package as PackageIcon,
    PanelRightClose,
    PanelRightOpen,
    Plus,
    Receipt,
    RotateCcw,
    Search,
    ShoppingBag,
    ShoppingCart,
    Store,
    Trash2,
    User,
    UserPlus,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PosReceiptDialog, type PosReceiptData } from '@/components/pos/pos-receipt-dialog';
import { formatDate, formatRupiah } from '@/components/rental-shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FormattedNumberInput } from '@/components/ui/formatted-number-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { unitPriceForDuration } from '@/lib/rental-pricing';

type CategoryItem = {
    id: number;
    name: string;
    slug: string;
};

type VariantValue = {
    id: number;
    attribute?: {
        id: number;
        name: string;
    };
    value: string;
};

type DurationPrice = {
    duration_days: number;
    price: number;
};

type ProductVariantItem = {
    id: number;
    sku: string;
    stock: number;
    rental_price_per_day: number | string;
    deposit_per_unit: number | string;
    values?: VariantValue[];
    duration_prices?: DurationPrice[];
};

type ProductImageItem = {
    id: number;
    image_path: string;
    is_primary: boolean;
};

type ProductItem = {
    id: number;
    name: string;
    slug: string;
    category_id: number;
    category?: CategoryItem;
    images?: ProductImageItem[];
    variants: ProductVariantItem[];
};

type PackageSubItem = {
    id: number;
    product_id: number;
    product_variant_id: number | null;
    allow_variant_selection: boolean;
    quantity: number;
    product?: {
        id: number;
        name: string;
        variants?: Array<{
            id: number;
            sku: string;
            stock: number;
            rental_price_per_day: number | string;
        }>;
    };
    variant?: {
        id: number;
        sku: string;
        stock: number;
        rental_price_per_day: number | string;
    };
};

type PackageItem = {
    id: number;
    name: string;
    slug: string;
    daily_price: number | string;
    deposit_per_package: number | string;
    image_path: string | null;
    items?: PackageSubItem[];
    duration_prices?: DurationPrice[];
};

type CustomerItem = {
    id: number;
    user_id: number;
    phone_number: string;
    address?: string | null;
    emergency_contact?: string | null;
    user?: {
        id: number;
        name: string;
        email: string;
    };
};

type CartItem = {
    key: string;
    type: 'variant' | 'package';
    id: number;
    name: string;
    skuOrInfo: string;
    imageUrl?: string | null;
    quantity: number;
    maxStock: number;
    dailyPrice: number;
    unitPrice: number;
    depositPerUnit: number;
    selectedVariants?: Record<number, number>;
};

type Props = {
    categories: CategoryItem[];
    products: ProductItem[];
    packages: PackageItem[];
    customers: CustomerItem[];
    initialDates: {
        start_date: string;
        end_date: string;
        total_days: number;
    };
    initialAvailability: {
        variants: Record<number, number>;
        packages: Record<number, number>;
    };
};

export default function PosIndex({
    categories,
    products,
    packages,
    customers: initialCustomers,
    initialDates,
    initialAvailability,
}: Props) {
    // Dates & Duration state
    const [startDate, setStartDate] = useState(initialDates.start_date);
    const [endDate, setEndDate] = useState(initialDates.end_date);
    const [totalDays, setTotalDays] = useState(initialDates.total_days);

    // Dynamic stock availability
    const [variantStock, setVariantStock] = useState<Record<number, number>>(
        initialAvailability.variants,
    );
    const [packageStock, setPackageStock] = useState<Record<number, number>>(
        initialAvailability.packages,
    );
    const [isCheckingStock, setIsCheckingStock] = useState(false);

    // Customer state
    const [customers, setCustomers] = useState<CustomerItem[]>(initialCustomers);
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
        customers.length > 0 ? customers[0].id : null,
    );
    const [customerSearch, setCustomerSearch] = useState('');

    // Catalog filtering
    const [catalogTab, setCatalogTab] = useState<'all' | 'packages' | number>('all');
    const [catalogSearch, setCatalogSearch] = useState('');

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);

    // Payment state
    const [paymentType, setPaymentType] = useState<'full' | 'down_payment'>('full');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
    const [cashTendered, setCashTendered] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Side panel open/close & resize state
    const [cartOpen, setCartOpen] = useState(true);
    const [panelWidth, setPanelWidth] = useState(460); // default width: 460px
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Quick customer modal
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');
    const [newCustomerEmail, setNewCustomerEmail] = useState('');
    const [newCustomerAddress, setNewCustomerAddress] = useState('');
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

    // Receipt Modal state
    const [receiptData, setReceiptData] = useState<PosReceiptData | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    // CSRF helper
    const getCsrfToken = () => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    // Resizing drag listener
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            // Calculate width from the right border of container to mouse cursor
            const newWidth = containerRect.right - e.clientX;
            const maxWidth = Math.min(720, window.innerWidth * 0.6);
            if (newWidth >= 340 && newWidth <= maxWidth) {
                setPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    // Calculate dates duration and fetch live availability
    const fetchAvailability = useCallback(async (start: string, end: string) => {
        setIsCheckingStock(true);
        try {
            const res = await fetch('/admin/pos/availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    start_date: start,
                    end_date: end,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setVariantStock(data.variants || {});
                setPackageStock(data.packages || {});
                setTotalDays(data.total_days || 1);
            }
        } catch {
            // Silently fallback
        } finally {
            setIsCheckingStock(false);
        }
    }, []);

    const handleStartDateChange = (val: string) => {
        setStartDate(val);
        // Ensure end date is >= start date + 1 day
        if (new Date(endDate) <= new Date(val)) {
            const nextDay = new Date(val);
            nextDay.setDate(nextDay.getDate() + 1);
            const nextDayStr = nextDay.toISOString().split('T')[0];
            setEndDate(nextDayStr);
            fetchAvailability(val, nextDayStr);
        } else {
            fetchAvailability(val, endDate);
        }
    };

    const handleEndDateChange = (val: string) => {
        setEndDate(val);
        fetchAvailability(startDate, val);
    };

    // Recalculate cart item unit prices whenever duration days change
    useEffect(() => {
        setCart((prevCart) =>
            prevCart.map((item) => {
                if (item.type === 'variant') {
                    // Find product variant
                    const variant = products
                        .flatMap((p) => p.variants)
                        .find((v) => v.id === item.id);
                    if (variant) {
                        const tiers = (variant.duration_prices || []).map((t) => ({
                            duration_days: t.duration_days,
                            price: Number(t.price),
                        }));
                        const newUnitPrice =
                            unitPriceForDuration(
                                Number(variant.rental_price_per_day),
                                tiers,
                                totalDays,
                            ) ?? Number(variant.rental_price_per_day) * totalDays;
                        const currentStock = variantStock[variant.id] ?? variant.stock;
                        return {
                            ...item,
                            unitPrice: newUnitPrice,
                            maxStock: currentStock,
                            quantity: Math.min(item.quantity, Math.max(1, currentStock)),
                        };
                    }
                } else {
                    const pkg = packages.find((p) => p.id === item.id);
                    if (pkg) {
                        const tiers = (pkg.duration_prices || []).map((t) => ({
                            duration_days: t.duration_days,
                            price: Number(t.price),
                        }));
                        const newUnitPrice =
                            unitPriceForDuration(
                                Number(pkg.daily_price),
                                tiers,
                                totalDays,
                            ) ?? Number(pkg.daily_price) * totalDays;
                        const currentStock = packageStock[pkg.id] ?? 99;
                        return {
                            ...item,
                            unitPrice: newUnitPrice,
                            maxStock: currentStock,
                            quantity: Math.min(item.quantity, Math.max(1, currentStock)),
                        };
                    }
                }
                return item;
            }),
        );
    }, [totalDays, variantStock, packageStock, products, packages]);

    // Add variant to cart
    const handleAddVariant = (product: ProductItem, variant: ProductVariantItem) => {
        const available = variantStock[variant.id] ?? variant.stock;
        if (available <= 0) {
            toast.error(`Stok ${variant.sku} sedang habis.`);
            return;
        }

        const cartKey = `variant-${variant.id}`;
        const existing = cart.find((i) => i.key === cartKey);

        if (existing) {
            if (existing.quantity >= available) {
                toast.warning(`Maksimal ${available} unit tersedia untuk ${variant.sku}.`);
                return;
            }
            setCart(
                cart.map((i) =>
                    i.key === cartKey ? { ...i, quantity: i.quantity + 1 } : i,
                ),
            );
            toast.success(`Jumlah ${variant.sku} ditambah ke keranjang.`);
            return;
        }

        const tiers = (variant.duration_prices || []).map((t) => ({
            duration_days: t.duration_days,
            price: Number(t.price),
        }));
        const unitPrice =
            unitPriceForDuration(
                Number(variant.rental_price_per_day),
                tiers,
                totalDays,
            ) ?? Number(variant.rental_price_per_day) * totalDays;

        const primaryImg = product.images?.find((img) => img.is_primary)?.image_path
            ?? product.images?.[0]?.image_path;
        const attrValues = (variant.values || []).map((v) => v.value).join(', ');

        const newItem: CartItem = {
            key: cartKey,
            type: 'variant',
            id: variant.id,
            name: product.name,
            skuOrInfo: attrValues ? `${variant.sku} • ${attrValues}` : variant.sku,
            imageUrl: primaryImg ? `/storage/${primaryImg}` : null,
            quantity: 1,
            maxStock: available,
            dailyPrice: Number(variant.rental_price_per_day),
            unitPrice,
            depositPerUnit: Number(variant.deposit_per_unit),
        };

        setCart([...cart, newItem]);
        toast.success(`${product.name} dimasukkan ke keranjang.`);
    };

    // Add package to cart
    const handleAddPackage = (pkg: PackageItem) => {
        const available = packageStock[pkg.id] ?? 0;
        if (available <= 0) {
            toast.error(`Paket ${pkg.name} tidak mencukupi untuk rentang tanggal ini.`);
            return;
        }

        const cartKey = `package-${pkg.id}`;
        const existing = cart.find((i) => i.key === cartKey);

        if (existing) {
            if (existing.quantity >= available) {
                toast.warning(`Maksimal ${available} paket tersedia.`);
                return;
            }
            setCart(
                cart.map((i) =>
                    i.key === cartKey ? { ...i, quantity: i.quantity + 1 } : i,
                ),
            );
            toast.success(`Jumlah paket ${pkg.name} ditambah.`);
            return;
        }

        const tiers = (pkg.duration_prices || []).map((t) => ({
            duration_days: t.duration_days,
            price: Number(t.price),
        }));
        const unitPrice =
            unitPriceForDuration(
                Number(pkg.daily_price),
                tiers,
                totalDays,
            ) ?? Number(pkg.daily_price) * totalDays;

        // Default selectable variants
        const defaultSelections: Record<number, number> = {};
        pkg.items?.forEach((it) => {
            if (it.allow_variant_selection && it.product?.variants && it.product.variants.length > 0) {
                defaultSelections[it.id] = it.product.variants[0].id;
            }
        });

        const newItem: CartItem = {
            key: cartKey,
            type: 'package',
            id: pkg.id,
            name: pkg.name,
            skuOrInfo: `Paket Camping (${pkg.items?.length || 0} item perlengkapan)`,
            imageUrl: pkg.image_path ? `/storage/${pkg.image_path}` : null,
            quantity: 1,
            maxStock: available,
            dailyPrice: Number(pkg.daily_price),
            unitPrice,
            depositPerUnit: Number(pkg.deposit_per_package),
            selectedVariants: defaultSelections,
        };

        setCart([...cart, newItem]);
        toast.success(`Paket ${pkg.name} dimasukkan ke keranjang.`);
    };

    // Update cart quantity
    const handleUpdateQuantity = (key: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.key !== key) return item;
                    const nextQty = item.quantity + delta;
                    if (nextQty <= 0) return null;
                    if (nextQty > item.maxStock) {
                        toast.warning(`Stok maksimal tersedia hanya ${item.maxStock} unit.`);
                        return item;
                    }
                    return { ...item, quantity: nextQty };
                })
                .filter(Boolean) as CartItem[],
        );
    };

    // Remove from cart
    const handleRemoveItem = (key: string) => {
        setCart(cart.filter((i) => i.key !== key));
    };

    // Financial calculations
    const totalRental = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    }, [cart]);

    const totalDeposit = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.depositPerUnit * item.quantity, 0);
    }, [cart]);

    const grandTotal = totalRental + totalDeposit;

    const amountToPayNow = useMemo(() => {
        if (paymentType === 'down_payment') {
            return totalRental * 0.5;
        }
        return totalRental;
    }, [paymentType, totalRental]);

    const numericCashTendered = parseFloat(cashTendered.replace(/[^0-9]/g, '')) || 0;
    const change = paymentMethod === 'cash' ? Math.max(0, numericCashTendered - amountToPayNow) : 0;
    const isCashSufficient = paymentMethod === 'cash' ? numericCashTendered >= amountToPayNow : true;

    // Filtered customers for search
    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        const q = customerSearch.toLowerCase();
        return customers.filter(
            (c) =>
                c.user?.name.toLowerCase().includes(q) ||
                c.phone_number.includes(q) ||
                c.user?.email.toLowerCase().includes(q),
        );
    }, [customers, customerSearch]);

    const selectedCustomer = useMemo(() => {
        return customers.find((c) => c.id === selectedCustomerId) || null;
    }, [customers, selectedCustomerId]);

    // Filtered catalog items
    const filteredProducts = useMemo(() => {
        if (catalogTab === 'packages') return [];
        return products.filter((p) => {
            const matchesCategory =
                catalogTab === 'all' || p.category_id === catalogTab;
            const matchesSearch =
                !catalogSearch ||
                p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                p.variants.some((v) =>
                    v.sku.toLowerCase().includes(catalogSearch.toLowerCase()),
                );
            return matchesCategory && matchesSearch;
        });
    }, [products, catalogTab, catalogSearch]);

    const filteredPackages = useMemo(() => {
        if (catalogTab !== 'all' && catalogTab !== 'packages') return [];
        return packages.filter((pkg) => {
            if (!catalogSearch) return true;
            return pkg.name.toLowerCase().includes(catalogSearch.toLowerCase());
        });
    }, [packages, catalogTab, catalogSearch]);

    // Handle Quick Customer Creation
    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomerName || !newCustomerPhone) {
            toast.error('Nama dan nomor telepon wajib diisi.');
            return;
        }

        setIsCreatingCustomer(true);
        try {
            const res = await fetch('/admin/pos/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    name: newCustomerName,
                    phone_number: newCustomerPhone,
                    email: newCustomerEmail || null,
                    address: newCustomerAddress || null,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                const created = data.customer as CustomerItem;
                setCustomers([created, ...customers]);
                setSelectedCustomerId(created.id);
                setShowCustomerModal(false);
                setNewCustomerName('');
                setNewCustomerPhone('');
                setNewCustomerEmail('');
                setNewCustomerAddress('');
                toast.success(`Pelanggan ${created.user?.name} berhasil didaftarkan!`);
            } else {
                toast.error(data.message || 'Gagal mendaftarkan pelanggan.');
            }
        } catch {
            toast.error('Terjadi kesalahan saat mendaftarkan pelanggan.');
        } finally {
            setIsCreatingCustomer(false);
        }
    };

    // Handle Checkout Submit
    const handleCheckout = async () => {
        if (!selectedCustomerId) {
            toast.error('Silakan pilih atau tambahkan pelanggan terlebih dahulu.');
            return;
        }

        if (cart.length === 0) {
            toast.error('Keranjang sewa masih kosong. Tambahkan barang terlebih dahulu.');
            return;
        }

        if (paymentMethod === 'cash' && !isCashSufficient) {
            toast.error('Jumlah uang tunai yang diterima kurang dari total yang harus dibayar.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                customer_id: selectedCustomerId,
                start_date: startDate,
                end_date: endDate,
                payment_type: paymentType,
                payment_method: paymentMethod,
                cash_tendered: paymentMethod === 'cash' ? numericCashTendered : null,
                notes: notes || null,
                items: cart.map((i) => ({
                    type: i.type,
                    id: i.id,
                    quantity: i.quantity,
                    selected_variants: i.selectedVariants || null,
                })),
            };

            const res = await fetch('/admin/pos/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                toast.success(result.message || 'Transaksi kasir berhasil!');

                // Set receipt and open modal
                setReceiptData({
                    rental: result.rental,
                    cash_tendered: result.cash_tendered,
                    change: result.change,
                    payment_method: result.payment_method,
                    paid_amount: result.paid_amount,
                });
                setShowReceiptModal(true);

                // Refresh availability
                fetchAvailability(startDate, endDate);
            } else {
                const errMsg =
                    result.errors?.items?.[0] ||
                    result.errors?.cart?.[0] ||
                    result.errors?.dates?.[0] ||
                    result.message ||
                    'Gagal memproses transaksi. Periksa kembali stok dan input.';
                toast.error(errMsg);
            }
        } catch {
            toast.error('Terjadi kesalahan koneksi saat memproses checkout.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNewTransaction = () => {
        setCart([]);
        setCashTendered('');
        setNotes('');
        setPaymentType('full');
        setPaymentMethod('cash');
        fetchAvailability(startDate, endDate);
    };

    return (
        <>
            <Head title="Point of Sale (Kasir Onsite)" />

            <div className="flex flex-col gap-6 p-4 sm:p-6 font-sans">
                {/* Header */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Store className="size-6 text-primary" />
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                                Point of Sale (Kasir Onsite)
                            </h1>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Input pemesanan langsung dari toko/walk-in customer dengan pengecekan stok live & cetak struk.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-border bg-card text-foreground px-3 py-1 font-medium hidden sm:inline-flex">
                            <Clock className="size-3.5 mr-1.5 text-primary" />
                            Buka: 18:00 - 23:59 WIB
                        </Badge>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCartOpen(!cartOpen)}
                            className="h-8 text-xs font-medium"
                            title={cartOpen ? 'Sembunyikan panel kasir' : 'Buka panel kasir'}
                        >
                            {cartOpen ? (
                                <>
                                    <PanelRightClose className="size-4 mr-1.5 text-muted-foreground" />
                                    Sembunyikan Kasir
                                </>
                            ) : (
                                <>
                                    <PanelRightOpen className="size-4 mr-1.5 text-primary" />
                                    Buka Kasir ({cart.reduce((s, i) => s + i.quantity, 0)})
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* 2-Column POS Layout with Resizable Divider */}
                <div
                    ref={containerRef}
                    className={`flex flex-col lg:flex-row items-start relative w-full transition-all duration-300 ${
                        cartOpen ? 'gap-4' : 'gap-0'
                    }`}
                >
                    {/* LEFT COLUMN: Catalog & Date Picker */}
                    <div className="flex-1 min-w-0 space-y-4 w-full">
                        {/* 1. Date Range & Duration Card */}
                        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Calendar className="size-4 text-primary" />
                                    <span>Tentukan Periode Sewa</span>
                                </div>
                                <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold px-2.5 py-0.5">
                                    Total: {totalDays} Hari Sewa
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Tanggal Ambil (Mulai)</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => handleStartDateChange(e.target.value)}
                                        className="mt-1"
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Ambil jam 18:00 - 23:59 WIB
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Tanggal Kembali (Selesai)</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        min={startDate}
                                        onChange={(e) => handleEndDateChange(e.target.value)}
                                        className="mt-1"
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Kembali maks jam 23:59 WIB
                                    </p>
                                </div>
                            </div>

                            {isCheckingStock && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse pt-1">
                                    <Loader2 className="size-3.5 animate-spin text-primary" />
                                    <span>Memperbarui status ketersediaan stok live...</span>
                                </div>
                            )}
                        </div>

                        {/* 2. Catalog Tabs & Search */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari alat atau nama paket camping..."
                                        value={catalogSearch}
                                        onChange={(e) => setCatalogSearch(e.target.value)}
                                        className="pl-9 bg-card"
                                    />
                                    {catalogSearch && (
                                        <button
                                            onClick={() => setCatalogSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="size-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Category Filter Pills */}
                            <div className="flex flex-wrap gap-1.5 pb-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={catalogTab === 'all' ? 'default' : 'outline'}
                                    onClick={() => setCatalogTab('all')}
                                    className="h-8 text-xs font-medium"
                                >
                                    Semua Item
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={catalogTab === 'packages' ? 'default' : 'outline'}
                                    onClick={() => setCatalogTab('packages')}
                                    className="h-8 text-xs font-medium"
                                >
                                    <Boxes className="size-3.5 mr-1" />
                                    Paket Camping
                                </Button>
                                {categories.map((cat) => (
                                    <Button
                                        key={cat.id}
                                        type="button"
                                        size="sm"
                                        variant={catalogTab === cat.id ? 'default' : 'outline'}
                                        onClick={() => setCatalogTab(cat.id)}
                                        className="h-8 text-xs font-medium"
                                    >
                                        {cat.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* 3. Catalog Grid */}
                        <div
                            className={`grid gap-3 overflow-y-auto pr-1 items-stretch transition-all duration-300 ${
                                cartOpen
                                    ? 'grid-cols-1 sm:grid-cols-2 max-h-[640px]'
                                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 max-h-[calc(100vh-220px)]'
                            }`}
                        >
                            {/* Packages */}
                            {filteredPackages.map((pkg) => {
                                const stock = packageStock[pkg.id] ?? 0;
                                const isOutOfStock = stock <= 0;
                                const inCartItem = cart.find((i) => i.key === `package-${pkg.id}`);
                                const cartQty = inCartItem?.quantity || 0;
                                const tiers = (pkg.duration_prices || []).map((t) => ({
                                    duration_days: t.duration_days,
                                    price: Number(t.price),
                                }));
                                const calculatedPrice =
                                    unitPriceForDuration(
                                        Number(pkg.daily_price),
                                        tiers,
                                        totalDays,
                                    ) ?? Number(pkg.daily_price) * totalDays;

                                const pkgImg = pkg.image_path ? `/storage/${pkg.image_path}` : null;

                                return (
                                    <div
                                        key={`pkg-${pkg.id}`}
                                        className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between hover:border-primary/50 transition-colors h-full min-h-[185px]"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex gap-2.5 items-start flex-1 min-w-0">
                                                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                                                        {pkgImg ? (
                                                            <img
                                                                src={pkgImg}
                                                                alt={pkg.name}
                                                                loading="lazy"
                                                                className="size-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <Boxes className="size-6 text-muted-foreground/40" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <Badge variant="outline" className="border-border bg-muted/50 text-[10px] font-semibold text-primary mb-0.5">
                                                            Paket Camping
                                                        </Badge>
                                                        <h3 className="font-semibold text-sm text-foreground truncate" title={pkg.name}>
                                                            {pkg.name}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {pkg.items?.length || 0} macam alat camping
                                                        </p>
                                                    </div>
                                                </div>

                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        isOutOfStock
                                                            ? 'border-destructive/30 bg-destructive/10 text-destructive text-[10px] shrink-0'
                                                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] shrink-0'
                                                    }
                                                >
                                                    {isOutOfStock ? 'Habis' : `Tersedia: ${stock}`}
                                                </Badge>
                                            </div>

                                            <div className="text-xs pt-1.5 border-t border-border mt-auto">
                                                <div className="font-bold text-foreground">
                                                    {formatRupiah(calculatedPrice)}
                                                    <span className="text-[11px] font-normal text-muted-foreground ml-1">
                                                        / {totalDays} hari
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Deposit: {formatRupiah(pkg.deposit_per_package)}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={isOutOfStock || cartQty >= stock}
                                            onClick={() => handleAddPackage(pkg)}
                                            className="w-full mt-2.5 h-8 text-xs"
                                        >
                                            <Plus className="size-3.5 mr-1" />
                                            {cartQty > 0 ? `Tambah (${cartQty} di kasir)` : 'Pilih Paket'}
                                        </Button>
                                    </div>
                                );
                            })}

                            {/* Products & Variants (Flattened to ensure consistent uniform card heights) */}
                            {filteredProducts.flatMap((product) =>
                                product.variants.map((variant) => ({ product, variant }))
                            ).map(({ product, variant }) => {
                                const primaryImg = product.images?.find((img) => img.is_primary)?.image_path
                                    ?? product.images?.[0]?.image_path;
                                const prodImgUrl = primaryImg ? `/storage/${primaryImg}` : null;

                                const stock = variantStock[variant.id] ?? variant.stock;
                                const isOutOfStock = stock <= 0;
                                const inCartItem = cart.find(
                                    (i) => i.key === `variant-${variant.id}`,
                                );
                                const cartQty = inCartItem?.quantity || 0;
                                const tiers = (variant.duration_prices || []).map((t) => ({
                                    duration_days: t.duration_days,
                                    price: Number(t.price),
                                }));
                                const calculatedPrice =
                                    unitPriceForDuration(
                                        Number(variant.rental_price_per_day),
                                        tiers,
                                        totalDays,
                                    ) ?? Number(variant.rental_price_per_day) * totalDays;

                                const attrText = (variant.values || [])
                                    .map((v) => v.value)
                                    .join(', ');

                                return (
                                    <div
                                        key={`var-${variant.id}`}
                                        className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between hover:border-primary/50 transition-colors h-full min-h-[185px]"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex gap-2.5 items-start flex-1 min-w-0">
                                                    <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                                                        {prodImgUrl ? (
                                                            <img
                                                                src={prodImgUrl}
                                                                alt={product.name}
                                                                loading="lazy"
                                                                className="size-full object-cover"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <PackageIcon className="size-6 text-muted-foreground/40" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] text-muted-foreground font-medium truncate">
                                                            {product.category?.name ?? 'Outdoor'}
                                                        </div>
                                                        <h3 className="font-semibold text-sm text-foreground truncate" title={product.name}>
                                                            {product.name}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground font-mono truncate" title={`${variant.sku} ${attrText}`}>
                                                            {variant.sku} {attrText && `• ${attrText}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        isOutOfStock
                                                            ? 'border-destructive/30 bg-destructive/10 text-destructive text-[10px] shrink-0'
                                                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] shrink-0'
                                                    }
                                                >
                                                    {isOutOfStock ? 'Habis' : `Tersedia: ${stock}`}
                                                </Badge>
                                            </div>

                                            <div className="text-xs pt-1.5 border-t border-border mt-auto">
                                                <div className="font-bold text-foreground">
                                                    {formatRupiah(calculatedPrice)}
                                                    <span className="text-[11px] font-normal text-muted-foreground ml-1">
                                                        / {totalDays} hari
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Deposit: {formatRupiah(variant.deposit_per_unit)}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={isOutOfStock || cartQty >= stock}
                                            onClick={() => handleAddVariant(product, variant)}
                                            className="w-full mt-2.5 h-8 text-xs"
                                        >
                                            <Plus className="size-3.5 mr-1" />
                                            {cartQty > 0 ? `Tambah (${cartQty} di kasir)` : 'Tambah Alat'}
                                        </Button>
                                    </div>
                                );
                            })}

                            {filteredProducts.length === 0 && filteredPackages.length === 0 && (
                                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg bg-card/50">
                                    <PackageIcon className="size-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">Tidak ada produk atau paket yang cocok.</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Coba ubah kata kunci atau ganti filter kategori.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resizer Splitter Bar (desktop only) */}
                    <div
                        onMouseDown={() => cartOpen && setIsDragging(true)}
                        style={{
                            width: cartOpen ? '10px' : '0px',
                            height: cartOpen ? 'auto' : '0px',
                            maxHeight: cartOpen ? 'none' : '0px',
                            opacity: cartOpen ? 1 : 0,
                            pointerEvents: cartOpen ? 'auto' : 'none',
                            visibility: cartOpen ? 'visible' : 'hidden',
                        }}
                        className={`hidden lg:flex flex-col items-center justify-center cursor-col-resize select-none shrink-0 self-stretch group overflow-hidden ${
                            isDragging
                                ? 'transition-none bg-primary/20'
                                : 'transition-[width,opacity] duration-300 ease-in-out hover:bg-muted/80'
                        }`}
                        title={cartOpen ? 'Klik dan geser ke kiri/kanan untuk mengatur lebar panel kasir' : ''}
                    >
                        <div className="h-12 w-1 rounded-full bg-border group-hover:bg-primary transition-colors flex items-center justify-center">
                            <GripVertical className="size-2.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Register Cart & Checkout (Smooth Collapsible Container) */}
                    <div
                        style={{
                            width: typeof window !== 'undefined' && window.innerWidth >= 1024
                                ? (cartOpen ? `${panelWidth}px` : '0px')
                                : (cartOpen ? '100%' : '0px'),
                            height: cartOpen ? 'auto' : '0px',
                            maxHeight: cartOpen ? 'none' : '0px',
                            opacity: cartOpen ? 1 : 0,
                            pointerEvents: cartOpen ? 'auto' : 'none',
                            visibility: cartOpen ? 'visible' : 'hidden',
                        }}
                        className={`overflow-hidden lg:shrink-0 ${
                            isDragging
                                ? 'transition-none'
                                : 'transition-[width,opacity,max-height] duration-300 ease-in-out'
                        }`}
                    >
                        <div style={{ width: `${panelWidth}px` }} className="w-full max-w-full space-y-4 pb-2">
                            <div className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-sm">
                                {/* Panel Header with Close Button */}
                                <div className="flex items-center justify-between pb-2 border-b border-border">
                                    <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                        <ShoppingCart className="size-4 text-primary" />
                                        Kasir & Pembayaran
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setCartOpen(false)}
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        title="Sembunyikan panel kasir"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </div>

                                {/* Customer Selection */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                            <User className="size-3.5 text-primary" />
                                            Pelanggan Onsite
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowCustomerModal(true)}
                                            className="h-7 text-xs px-2"
                                        >
                                            <UserPlus className="size-3 mr-1" />
                                            Pelanggan Baru
                                        </Button>
                                    </div>

                                    <Select
                                        value={selectedCustomerId?.toString() || ''}
                                        onValueChange={(val) => setSelectedCustomerId(parseInt(val, 10))}
                                    >
                                        <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder="Pilih pelanggan terdaftar..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-56">
                                            {customers.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                                                    {c.user?.name} ({c.phone_number})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {selectedCustomer && (
                                        <div className="rounded-md bg-muted/40 border border-border p-2 text-xs flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold text-foreground">{selectedCustomer.user?.name}</div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    Telp: {selectedCustomer.phone_number}
                                                    {selectedCustomer.address && ` • ${selectedCustomer.address}`}
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="border-border text-[10px] bg-background">
                                                Aktif
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-border" />

                                {/* Cart Items List */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <ShoppingCart className="size-3.5 text-primary" />
                                            Keranjang Kasir ({cart.reduce((s, i) => s + i.quantity, 0)} item)
                                        </span>
                                        {cart.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCart([])}
                                                className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2"
                                            >
                                                Kosongkan
                                            </Button>
                                        )}
                                    </div>

                                    {cart.length === 0 ? (
                                        <div className="py-8 text-center border border-dashed border-border rounded-lg bg-muted/20">
                                            <ShoppingBag className="size-6 mx-auto mb-1.5 text-muted-foreground opacity-50" />
                                            <p className="text-xs text-muted-foreground">Keranjang masih kosong.</p>
                                            <p className="text-[11px] text-muted-foreground">Pilih alat dari katalog di sebelah kiri.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {cart.map((item) => (
                                                <div
                                                    key={item.key}
                                                    className="rounded-md border border-border bg-background p-2.5 text-xs space-y-2"
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <div className="relative size-9 shrink-0 overflow-hidden rounded border border-border bg-muted flex items-center justify-center">
                                                                {item.imageUrl ? (
                                                                    <img
                                                                        src={item.imageUrl}
                                                                        alt={item.name}
                                                                        className="size-full object-cover"
                                                                        onError={(e) => {
                                                                            e.currentTarget.style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <PackageIcon className="size-4 text-muted-foreground/40" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-medium text-foreground truncate">{item.name}</div>
                                                                <div className="text-[11px] text-muted-foreground truncate">{item.skuOrInfo}</div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveItem(item.key)}
                                                            className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted"
                                                            title="Hapus item"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-1 border-t border-border">
                                                        {/* Stepper */}
                                                        <div className="flex items-center border border-border rounded-md bg-card">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleUpdateQuantity(item.key, -1)}
                                                                className="h-6 w-6 rounded-none p-0"
                                                            >
                                                                <Minus className="size-3" />
                                                            </Button>
                                                            <span className="w-8 text-center text-xs font-semibold text-foreground">
                                                                {item.quantity}
                                                            </span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                disabled={item.quantity >= item.maxStock}
                                                                onClick={() => handleUpdateQuantity(item.key, 1)}
                                                                className="h-6 w-6 rounded-none p-0"
                                                            >
                                                                <Plus className="size-3" />
                                                            </Button>
                                                        </div>

                                                        <div className="text-right">
                                                            <div className="font-bold text-foreground">
                                                                {formatRupiah(item.unitPrice * item.quantity)}
                                                            </div>
                                                            {item.depositPerUnit > 0 && (
                                                                <div className="text-[10px] text-muted-foreground">
                                                                    +Jaminan {formatRupiah(item.depositPerUnit * item.quantity)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-border" />

                                {/* Financial Summary */}
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Total Biaya Sewa ({totalDays} Hari)</span>
                                        <span className="font-medium text-foreground">{formatRupiah(totalRental)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Total Jaminan (Deposit Fisik/Tunai)</span>
                                        <span className="font-medium text-foreground">{formatRupiah(totalDeposit)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border">
                                        <span>Grand Total</span>
                                        <span className="text-primary">{formatRupiah(grandTotal)}</span>
                                    </div>
                                </div>

                                <div className="border-t border-border" />

                                {/* Payment Options */}
                                <div className="space-y-3">
                                    {/* Type: Full vs DP */}
                                    <div>
                                        <Label className="text-xs font-semibold text-muted-foreground">Jenis Pembayaran</Label>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={paymentType === 'full' ? 'default' : 'outline'}
                                                onClick={() => setPaymentType('full')}
                                                className="h-8 text-xs font-medium"
                                            >
                                                Bayar Lunas (100%)
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={paymentType === 'down_payment' ? 'default' : 'outline'}
                                                onClick={() => setPaymentType('down_payment')}
                                                className="h-8 text-xs font-medium"
                                            >
                                                DP 50%
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Method: Cash vs QRIS */}
                                    <div>
                                        <Label className="text-xs font-semibold text-muted-foreground">Metode Pembayaran</Label>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                                onClick={() => setPaymentMethod('cash')}
                                                className="h-8 text-xs font-medium"
                                            >
                                                <DollarSign className="size-3.5 mr-1" />
                                                Tunai (Cash)
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={paymentMethod === 'qris' ? 'default' : 'outline'}
                                                onClick={() => setPaymentMethod('qris')}
                                                className="h-8 text-xs font-medium"
                                            >
                                                <CreditCard className="size-3.5 mr-1" />
                                                QRIS Onsite
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Amount To Pay Now Banner */}
                                    <div className="rounded-md bg-primary/10 border border-primary/20 p-2.5 text-xs flex justify-between items-center">
                                        <span className="font-semibold text-primary">Wajib Dibayar Sekarang:</span>
                                        <span className="text-sm font-bold text-primary">{formatRupiah(amountToPayNow)}</span>
                                    </div>

                                    {/* Cash Tendered & Change */}
                                    {paymentMethod === 'cash' && (
                                        <div className="space-y-2 pt-1">
                                            <Label className="text-xs font-semibold text-foreground">Uang Diterima dari Pelanggan</Label>
                                            <FormattedNumberInput
                                                placeholder="Contoh: 100.000"
                                                value={numericCashTendered}
                                                onValueChange={(val) => setCashTendered(val.toString())}
                                                className="font-bold text-sm"
                                            />

                                            {/* Quick denomination buttons */}
                                            <div className="flex flex-wrap gap-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCashTendered(amountToPayNow.toString())}
                                                    className="h-6 text-[10px] px-2"
                                                >
                                                    Uang Pas
                                                </Button>
                                                {[50000, 100000, 200000, 300000, 500000].map((amt) => (
                                                    <Button
                                                        key={amt}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCashTendered(amt.toString())}
                                                        className="h-6 text-[10px] px-2"
                                                    >
                                                        {formatRupiah(amt)}
                                                    </Button>
                                                ))}
                                            </div>

                                            {numericCashTendered > 0 && (
                                                <div
                                                    className={`p-2 rounded-md text-xs font-semibold flex justify-between ${
                                                        isCashSufficient
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-destructive/10 text-destructive border border-destructive/20'
                                                    }`}
                                                >
                                                    <span>{isCashSufficient ? 'Kembalian:' : 'Uang Kurang:'}</span>
                                                    <span>
                                                        {isCashSufficient
                                                            ? formatRupiah(change)
                                                            : formatRupiah(amountToPayNow - numericCashTendered)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Admin Notes */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Catatan Onsite (Opsional)</Label>
                                        <Textarea
                                            rows={2}
                                            placeholder="Contoh: Titip identitas KTP a.n ..., sewa tambahan matras..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="text-xs mt-1"
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="button"
                                    size="lg"
                                    disabled={
                                        cart.length === 0 ||
                                        !selectedCustomerId ||
                                        isSubmitting ||
                                        (paymentMethod === 'cash' && !isCashSufficient)
                                    }
                                    onClick={handleCheckout}
                                    className="w-full font-bold text-sm h-11"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin mr-2" />
                                            Memproses Transaksi...
                                        </>
                                    ) : (
                                        <>
                                            <Receipt className="size-4 mr-2" />
                                            Proses Transaksi Onsite
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Customer Modal */}
            <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-primary">
                            <UserPlus className="size-5" />
                            <DialogTitle>Pendaftaran Pelanggan Walk-in</DialogTitle>
                        </div>
                        <DialogDescription>
                            Daftarkan data pelanggan cepat saat transaksi di toko.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateCustomer} className="space-y-3 py-2">
                        <div>
                            <Label className="text-xs">Nama Lengkap *</Label>
                            <Input
                                required
                                placeholder="Contoh: Budi Santoso"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label className="text-xs">Nomor WhatsApp / HP *</Label>
                            <Input
                                required
                                placeholder="Contoh: 081234567890"
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label className="text-xs">Email (Opsional)</Label>
                            <Input
                                type="email"
                                placeholder="budi@example.com (opsional)"
                                value={newCustomerEmail}
                                onChange={(e) => setNewCustomerEmail(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label className="text-xs">Alamat Tinggal / KTP (Opsional)</Label>
                            <Input
                                placeholder="Alamat lengkap pelanggan"
                                value={newCustomerAddress}
                                onChange={(e) => setNewCustomerAddress(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCustomerModal(false)}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={isCreatingCustomer}>
                                {isCreatingCustomer ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin mr-2" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    'Simpan Pelanggan'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Receipt Modal */}
            <PosReceiptDialog
                data={receiptData}
                open={showReceiptModal}
                onOpenChange={setShowReceiptModal}
                onNewTransaction={handleNewTransaction}
            />
        </>
    );
}

PosIndex.layout = {
    breadcrumbs: [
        {
            title: 'Point of Sale (Kasir)',
            href: '/admin/pos',
        },
    ],
};
