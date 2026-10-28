<?php

use Inertia\Testing\AssertableInertia;

uses(Tests\TestCase::class);

test('cart page is available without authentication', function () {
    /** @var \Tests\TestCase $this */
    $this->get(route('cart'))
        ->assertOk()
        ->assertInertia(fn(AssertableInertia $page) => $page
            ->component('cart'));
});
