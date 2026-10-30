<?php

namespace App\Console\Commands;

use App\Services\CheckoutService;
use Illuminate\Console\Command;

class CancelExpiredRentalPayments extends Command
{
    protected $signature = 'rentals:cancel-expired-payments';

    protected $description = 'Batalkan rental pending_payment yang melewati batas waktu pembayaran 30 menit';

    public function handle(CheckoutService $checkoutService): int
    {
        $cancelled = $checkoutService->cancelExpiredPayments();

        if ($cancelled > 0) {
            $this->info("{$cancelled} rental kedaluwarsa dibatalkan.");
        } else {
            $this->info('Tidak ada rental kedaluwarsa.');
        }

        return self::SUCCESS;
    }
}
