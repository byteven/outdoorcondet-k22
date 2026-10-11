<?php

use App\Http\Controllers\Admin\CustomerController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth'])->group(function () {
    Route::redirect('dashboard', '/admin/dashboard');

    Route::prefix('admin')->name('admin.')->middleware('can:access-admin')->group(function () {
        Route::inertia('dashboard', 'dashboard')->name('dashboard');

        Route::get('pelanggan', [CustomerController::class, 'index'])->name('customers.index');
        Route::post('pelanggan', [CustomerController::class, 'store'])->name('customers.store');
        Route::put('pelanggan/{customer}', [CustomerController::class, 'update'])->name('customers.update');
        Route::delete('pelanggan/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');
    });
});

require __DIR__.'/settings.php';
