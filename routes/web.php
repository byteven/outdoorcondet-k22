<?php

use App\Http\Controllers\Admin\AttributeController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CatalogDetailController;
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
    Route::delete('cart/items/{cartItem}', [CartController::class, 'destroy'])->name('cart.destroy');
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
    });
});

require __DIR__.'/settings.php';
