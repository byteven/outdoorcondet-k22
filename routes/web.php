<?php

use App\Http\Controllers\Admin\AttributeController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\PackageController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\RentalController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CatalogDetailController;
use App\Http\Controllers\Customer\CheckoutController;
use App\Http\Controllers\LandingController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LandingController::class, 'index'])->name('home');
Route::get('alat/{productSlug}', [CatalogDetailController::class, 'product'])->name('products.show');
Route::get('paket/{packageSlug}', [CatalogDetailController::class, 'package'])->name('packages.show');

Route::inertia('kebijakan', 'legal/policy')->name('legal.policy');
Route::inertia('privasi', 'legal/privacy')->name('legal.privacy');

Route::middleware(['auth', 'can:access-customer'])->group(function () {
    Route::get('cart', [CartController::class, 'index'])->name('cart.index');
    Route::post('cart', [CartController::class, 'store'])->name('cart.store');
    Route::put('cart/dates', [CartController::class, 'updateDates'])->name('cart.dates');
    Route::patch('cart/items/{cartItem}', [CartController::class, 'update'])->name('cart.update');
    Route::patch('cart/items/{cartItem}/variant', [CartController::class, 'updateVariant'])->name('cart.variant');
    Route::delete('cart/items/{cartItem}', [CartController::class, 'destroy'])->name('cart.destroy');

    Route::get('checkout', [CheckoutController::class, 'index'])->name('checkout.index');
    Route::post('checkout', [CheckoutController::class, 'store'])->name('checkout.store');
    Route::get('checkout/{rental}', [CheckoutController::class, 'show'])->name('checkout.show');
    Route::post('checkout/{rental}/payment', [CheckoutController::class, 'storePayment'])->name('checkout.payment.store');
    Route::get('checkout/{rental}/payment-proof', [CheckoutController::class, 'paymentProof'])->name('checkout.payment.proof');
});

Route::middleware(['auth'])->group(function () {
    Route::redirect('dashboard', '/admin/dashboard');

    Route::prefix('admin')->name('admin.')->middleware('can:access-admin')->group(function () {
        Route::inertia('dashboard', 'dashboard')->name('dashboard');

        Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
        Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
        Route::put('categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
        Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');

        Route::get('pelanggan', [CustomerController::class, 'index'])->name('customers.index');
        Route::post('pelanggan', [CustomerController::class, 'store'])->name('customers.store');
        Route::put('pelanggan/{customer}', [CustomerController::class, 'update'])->name('customers.update');
        Route::delete('pelanggan/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');

        Route::get('attributes', [AttributeController::class, 'index'])->name('attributes.index');
        Route::post('attributes', [AttributeController::class, 'store'])->name('attributes.store');
        Route::put('attributes/{attribute}', [AttributeController::class, 'update'])->name('attributes.update');
        Route::delete('attributes/{attribute}', [AttributeController::class, 'destroy'])->name('attributes.destroy');

        Route::get('products', [ProductController::class, 'index'])->name('products.index');
        Route::post('products', [ProductController::class, 'store'])->name('products.store');
        Route::put('products/{product}', [ProductController::class, 'update'])->name('products.update');
        Route::delete('products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');

        Route::get('packages', [PackageController::class, 'index'])->name('packages.index');
        Route::post('packages', [PackageController::class, 'store'])->name('packages.store');
        Route::put('packages/{package}', [PackageController::class, 'update'])->name('packages.update');
        Route::delete('packages/{package}', [PackageController::class, 'destroy'])->name('packages.destroy');

        Route::post('rentals/{rental}/confirm-payment', [RentalController::class, 'confirmPayment'])->name('rentals.confirm-payment');
        Route::post('rentals/{rental}/reject-payment', [RentalController::class, 'rejectPayment'])->name('rentals.reject-payment');
        Route::post('rentals/{rental}/confirm-return', [RentalController::class, 'confirmReturn'])->name('rentals.confirm-return');
    });
});

require __DIR__.'/settings.php';
