<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('rentals:cancel-expired-payments')
    ->everyMinute()
    ->withoutOverlapping();
