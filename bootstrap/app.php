<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['sidebar_state']);

        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Jangan tampilkan halaman 403 untuk penolakan otorisasi web:
        // kembalikan pengguna ke halaman asal agar path admin tidak terungkap.
        // (Handler mengubah AuthorizationException menjadi HttpException 403
        // sebelum callback render, jadi kecocokannya lewat previous exception.)
        $exceptions->render(function (HttpException $exception, Request $request) {
            if ($exception->getStatusCode() !== 403
                || ! $exception->getPrevious() instanceof AuthorizationException
                || $request->expectsJson()
            ) {
                return null;
            }

            return redirect()->back(fallback: route('home'));
        });
    })->create();
