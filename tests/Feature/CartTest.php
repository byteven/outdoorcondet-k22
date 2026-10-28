<?php

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Package;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Services\RentalPricingService;
use App\UserRole;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->pricing = app(RentalPricingService::class);
});

// -------------------------------------------------------------------------
// Pricing engine (PRD 4.2)
// -------------------------------------------------------------------------

test('pricing engine follows the PRD 4.2 cheapest-combination rules', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
        'rental_price_per_day' => 20000,
        'deposit_per_unit' => 50000,
    ]);

    $variant->durationPrices()->createMany([
        ['duration_days' => 3, 'price' => 50000],
        ['duration_days' => 7, 'price' => 100000],
    ]);
    $variant->load('durationPrices');

    $expected = [
        1 => 20000,
        2 => 40000,
        3 => 50000,
        4 => 70000,
        5 => 90000,
        6 => 100000,
        7 => 100000,
        8 => 120000,
    ];

    foreach ($expected as $days => $price) {
        expect($this->pricing->unitPriceForVariant($variant, $days))->toBe((float) $price);
    }
});

test('rental duration counts from the day after pickup (PRD 4.3)', function () {
    $pickup = CarbonImmutable::parse('2026-11-01');
    $return = CarbonImmutable::parse('2026-11-04');

    // Ambil tgl 1 -> mulai dihitung tgl 2 -> kembali tgl 4 = 3 hari.
    expect($this->pricing->totalDays($pickup, $return))->toBe(3);
});

// -------------------------------------------------------------------------
// Access control
// -------------------------------------------------------------------------

test('guests are redirected to the login page when opening the cart', function () {
    $this->get(route('cart.index'))->assertRedirect(route('login'));
});

test('admins cannot open the cart', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Admin]));

    $this->get(route('cart.index'))->assertForbidden();
});

test('customers can open the cart', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Customer]));

    $this->get(route('cart.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('cart/index')
            ->has('cart.items', 0)
            ->where('cart.count', 0)
            ->where('cart.summary.rental_amount', 0.0)
            ->where('cart.summary.grand_total', 0.0));
});

test('admins cannot add items to the cart', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Admin]));

    $variant = createVariant();

    $this->post(route('cart.store'), addToCartPayload($variant))
        ->assertForbidden();

    expect(CartItem::count())->toBe(0);
});

// -------------------------------------------------------------------------
// Add to cart
// -------------------------------------------------------------------------

test('customers can add a product variant with server-computed pricing', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $variant = createVariant(rentalPricePerDay: 20000, depositPerUnit: 50000);
    $variant->durationPrices()->create(['duration_days' => 3, 'price' => 50000]);

    $this->post(route('cart.store'), addToCartPayload(
        $variant,
        quantity: 2,
        pickupDate: '2026-11-01',
        returnDate: '2026-11-03',
    ))->assertRedirect();

    $item = CartItem::query()->firstOrFail();

    expect($item->quantity)->toBe(2)
        ->and($item->rentable_id)->toBe($variant->id)
        ->and($item->pickup_date->format('Y-m-d'))->toBe('2026-11-01')
        ->and($item->return_date->format('Y-m-d'))->toBe('2026-11-03');

    // Konsisten dengan halaman detail: 3 hari = tier Rp50.000/unit.
    $cart = app(App\Services\CartService::class)->summaryFor($customer);

    expect($cart['items'][0]['unit_price'])->toBe(50000.0)
        ->and($cart['items'][0]['rental_subtotal'])->toBe(100000.0)
        ->and($cart['items'][0]['deposit_subtotal'])->toBe(100000.0)
        ->and($cart['summary']['rental_amount'])->toBe(100000.0)
        ->and($cart['summary']['deposit_amount'])->toBe(100000.0)
        ->and($cart['summary']['grand_total'])->toBe(200000.0);
});

test('adding the same item again merges quantity into one row', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Customer]));

    $variant = createVariant(rentalPricePerDay: 20000, depositPerUnit: 0);

    $this->post(route('cart.store'), addToCartPayload($variant, quantity: 1))->assertRedirect();
    $this->post(route('cart.store'), addToCartPayload($variant, quantity: 2))->assertRedirect();

    expect(CartItem::count())->toBe(1)
        ->and(CartItem::query()->firstOrFail()->quantity)->toBe(3);
});

test('adding beyond available stock is rejected', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Customer]));

    $variant = createVariant(stock: 2, rentalPricePerDay: 20000, depositPerUnit: 0);

    $response = $this->post(route('cart.store'), addToCartPayload($variant, quantity: 3));
    $response->assertRedirect();
    $response->assertSessionHasErrors(['quantity']);

    expect(CartItem::count())->toBe(0);
});

test('adding an inactive variant is rejected', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Customer]));

    $variant = createVariant(isActive: false);

    $this->post(route('cart.store'), addToCartPayload($variant))
        ->assertRedirect()
        ->assertSessionHasErrors(['rentable_id']);

    expect(CartItem::count())->toBe(0);
});

test('invalid rental ranges are rejected', function (string $pickup, string $return) {
    $this->actingAs(User::factory()->create(['role' => UserRole::Customer]));

    $variant = createVariant();

    $this->post(route('cart.store'), addToCartPayload($variant, quantity: 1, pickupDate: $pickup, returnDate: $return))
        ->assertRedirect()
        ->assertSessionHasErrors();
})->with([
    'return before billing start' => ['2026-11-01', '2026-11-01'],
    'pickup in the past' => ['2020-01-01', '2020-01-05'],
]);

// -------------------------------------------------------------------------
// Update quantity
// -------------------------------------------------------------------------

test('customers can change the quantity of their cart item', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $variant = createVariant(stock: 5, rentalPricePerDay: 20000, depositPerUnit: 50000);
    $item = CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-04',
    ]);

    $this->patch(route('cart.update', ['cartItem' => $item->id]), ['quantity' => 3])
        ->assertRedirect(route('cart.index'));

    expect($item->fresh()->quantity)->toBe(3);
});

test('quantity below one is rejected', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $variant = createVariant();
    $item = CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'quantity' => 2,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);

    $this->patch(route('cart.update', ['cartItem' => $item->id]), ['quantity' => 0])
        ->assertRedirect()
        ->assertSessionHasErrors(['quantity']);

    expect($item->fresh()->quantity)->toBe(2);
});

test('another user cart item is not reachable', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Customer]));
    $owner = User::factory()->create(['role' => UserRole::Customer]);

    $variant = createVariant();
    $item = CartItem::factory()->create([
        'user_id' => $owner->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);

    $this->patch(route('cart.update', ['cartItem' => $item->id]), ['quantity' => 2])
        ->assertNotFound();
});

// -------------------------------------------------------------------------
// Update rental range
// -------------------------------------------------------------------------

test('changing the rental range updates all cart items and clamps quantities', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $variant = createVariant(stock: 5, rentalPricePerDay: 20000, depositPerUnit: 50000);
    // Rental aktif menghabiskan stok untuk rentang baru.
    $activeRental = createRentalFor($variant, quantity: 4, startDate: '2026-11-01', endDate: '2026-11-05');

    $item = CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'quantity' => 4,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);

    $this->put(route('cart.dates'), [
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-05',
    ])->assertRedirect(route('cart.index'));

    $fresh = $item->fresh();

    expect($fresh->pickup_date->format('Y-m-d'))->toBe('2026-11-01')
        ->and($fresh->return_date->format('Y-m-d'))->toBe('2026-11-05')
        // Stok tersedia 1 unit -> quantity di-clamp.
        ->and($fresh->quantity)->toBe(1);
});

// -------------------------------------------------------------------------
// Remove item
// -------------------------------------------------------------------------

test('customers can remove a cart item', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $variant = createVariant();
    $item = CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);

    $this->delete(route('cart.destroy', ['cartItem' => $item->id]))
        ->assertRedirect(route('cart.index'));

    expect(CartItem::count())->toBe(0);
});

// -------------------------------------------------------------------------
// Product detail page: in_cart flag
// -------------------------------------------------------------------------

test('product detail page marks products already in the cart', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $variant = createVariant(name: 'Tenda Dome 4P', slug: 'tenda-dome-4p');

    $this->get(route('products.show', ['productSlug' => 'tenda-dome-4p']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('in_cart_ids', []));

    CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);

    $this->get(route('products.show', ['productSlug' => 'tenda-dome-4p']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('in_cart_ids', [$variant->id]));
});

// -------------------------------------------------------------------------
// Cart item: switch variant
// -------------------------------------------------------------------------

test('customer can switch a cart item to another variant of the same product', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'is_active' => true,
    ]);
    $variantA = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
    ]);
    $variantB = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 3,
    ]);

    $item = CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variantA->id,
        'quantity' => 2,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);

    $this->patch(route('cart.variant', ['cartItem' => $item->id]), [
        'variant_id' => $variantB->id,
    ])->assertRedirect(route('cart.index'));

    expect(CartItem::query()->find($item->id)->rentable_id)->toBe($variantB->id);
});

test('switching to a variant already in the cart merges the quantities', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'is_active' => true,
    ]);
    $variantA = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
    ]);
    $variantB = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
    ]);

    $itemA = CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variantA->id,
        'quantity' => 2,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);
    $itemB = CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variantB->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);

    $this->patch(route('cart.variant', ['cartItem' => $itemA->id]), [
        'variant_id' => $variantB->id,
    ])->assertRedirect(route('cart.index'));

    expect(CartItem::query()->find($itemB->id)->quantity)->toBe(3)
        ->and(CartItem::query()->find($itemA->id))->toBeNull();
});

test('cart page exposes sibling variants as switch options', function () {
    $customer = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customer);

    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'is_active' => true,
    ]);
    $variantA = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
    ]);
    $variantB = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 3,
    ]);

    CartItem::factory()->create([
        'user_id' => $customer->id,
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variantA->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ]);

    $this->get(route('cart.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('cart.items.0.variant_id', $variantA->id)
            ->where('cart.items.0.product_id', $product->id)
            ->has('cart.items.0.variant_options', 2)
        );
});

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function createVariant(
    int $stock = 5,
    float $rentalPricePerDay = 20000,
    float $depositPerUnit = 0,
    bool $isActive = true,
    string $name = 'Tenda Dome 4P',
    string $slug = 'tenda-dome-4p',
): ProductVariant {
    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'name' => $name,
        'slug' => $slug,
        'is_active' => true,
    ]);

    ProductImage::factory()->create([
        'product_id' => $product->id,
        'image_path' => 'products/primary.jpg',
        'is_primary' => true,
    ]);

    return ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => $stock,
        'rental_price_per_day' => $rentalPricePerDay,
        'deposit_per_unit' => $depositPerUnit,
        'is_active' => $isActive,
    ]);
}

function addToCartPayload(
    ProductVariant $variant,
    int $quantity = 1,
    string $pickupDate = '2026-11-01',
    string $returnDate = '2026-11-03',
): array {
    return [
        'rentable_type' => 'variant',
        'rentable_id' => $variant->id,
        'quantity' => $quantity,
        'pickup_date' => $pickupDate,
        'return_date' => $returnDate,
    ];
}

function createRentalFor(
    ProductVariant $variant,
    int $quantity,
    string $startDate,
    string $endDate,
): App\Models\Rental {
    $rental = App\Models\Rental::create([
        'rental_code' => 'RNT-'.Str::uuid(),
        'start_date' => $startDate,
        'billing_start_date' => Carbon\Carbon::parse($startDate)->addDay()->toDateString(),
        'end_date' => $endDate,
        'return_due_at' => Carbon\Carbon::parse($endDate)->endOfDay(),
        'total_days' => Carbon\Carbon::parse($endDate)->diffInDays(Carbon\Carbon::parse($startDate)->addDay()) + 1,
        'rental_amount' => 0,
        'grand_total' => 0,
        'payment_deadline_at' => now()->addDay(),
        'status' => 'fully_paid',
    ]);

    $rental->items()->create([
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'quantity' => $quantity,
        'unit_price' => 20000,
        'subtotal' => 20000 * $quantity,
        'deposit_per_unit' => 0,
        'deposit_subtotal' => 0,
    ]);

    return $rental;
}
