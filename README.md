# outdoorcondet

03/10/2026

Outdoor gear rental platform built with Laravel 13, Inertia.js v3, React 19, Tailwind CSS v4, and TypeScript.

The application manages a rental catalog of outdoor equipment. Each item stores its condition, daily rate, deposit, stock, and rental duration rules. Images are handled through MediaLibrary and items are indexed for search through Scout.

---

## Stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Backend    | PHP 8.5, Laravel 13                                |
| Auth       | Laravel Fortify (session, 2FA, password reset)     |
| Frontend   | Inertia.js v3, React 19, TypeScript 5              |
| Styling    | Tailwind CSS v4 (CSS-first config)                 |
| Components | Radix UI primitives, shadcn/ui conventions         |
| Routing    | Laravel Wayfinder (typed route helpers for TS)     |
| Search     | Laravel Scout (database driver, Meilisearch ready) |
| Media      | Spatie MediaLibrary                                |
| Build      | Vite 8 via Vite Plus (`vp`)                        |
| Tests      | Pest 5, Larastan, Pint                             |

---

## Requirements

- PHP 8.3 or higher with the `pdo_mysql` driver
- Composer 2
- Node.js 22 and npm
- MySQL 8
- Meilisearch (optional, only when `SCOUT_DRIVER=meilisearch`)

---

## Installation

```bash
composer setup
```

This installs PHP and Node dependencies, creates `.env` from `.env.example`, generates the app key, runs migrations, and builds frontend assets.

Create the database and seed sample data:

```bash
php artisan migrate:fresh --seed
```

The seeder creates one user (`test@example.com` / `password`) and a set of gear items.

### Manual setup

```bash
composer install
cp .env.example .env
php artisan key:generate
npm install
php artisan migrate --seed
```

---

## Running the application

Start the PHP server, queue worker, and Vite dev server together:

```bash
composer dev
```

Or run each process separately:

```bash
php artisan serve
php artisan queue:listen
npm run dev
```

List the registered processes with `php artisan dev:list`.

---

## Commands

### Composer

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `composer setup`       | Install dependencies and prepare the application    |
| `composer dev`         | Run all dev processes in one terminal               |
| `composer test`        | Run lint check, static analysis, and the test suite |
| `composer ci:check`    | Frontend format, lint, types, and tests             |
| `composer lint`        | Format PHP code with Pint                           |
| `composer types:check` | Run PHPStan static analysis                         |

### NPM

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Start the Vite dev server                   |
| `npm run build`       | Build production assets                     |
| `npm run build:ssr`   | Build client and SSR bundles                |
| `npm run check`       | Format check and lint TypeScript/TSX files  |
| `npm run check:fix`   | Apply formatting fixes                      |
| `npm run types:check` | Run the TypeScript compiler in no-emit mode |

### Artisan

| Command                                | Description                       |
| -------------------------------------- | --------------------------------- |
| `php artisan wayfinder:generate`       | Regenerate typed route helpers    |
| `php artisan scout:import Gear`        | Reindex the gear catalog          |
| `php artisan scout:flush`              | Clear all search indexes          |
| `php artisan media-library:regenerate` | Rebuild derived media conversions |

---

## Project structure

```
app/
  Actions/Fortify/          User creation and password reset actions
  Concerns/                 Shared password and profile validation rules
  GearCondition.php         Enum of gear condition states
  Http/Controllers/Settings Profile and security controllers
  Http/Middleware/          Inertia request handling
  Http/Requests/Settings    Form request validation
  Models/                   Gear and User models
  Providers/                App and Fortify service providers
database/
  factories/                User and Gear factories
  migrations/               Schema definitions
  seeders/                  Demo user and gear data
resources/
  css/app.css               Tailwind theme and design tokens
  js/
    actions/                Generated controller actions (Wayfinder)
    components/ui/          shadcn/ui primitives
    components/             Application components
    hooks/                  Shared React hooks
    layouts/                Page layout templates
    pages/                  Inertia page components
    routes/                 Generated route helpers (Wayfinder)
    types/                  TypeScript types
  views/app.blade.php       Inertia root view
routes/
  web.php                   Public and authenticated routes
  settings.php              Profile and security routes
tests/
  Feature/                  Feature tests by domain
  Unit/                     Unit tests
```

---

## Domain model

### Gear

| Attribute         | Type               | Notes                                   |
| ----------------- | ------------------ | --------------------------------------- |
| `name`            | string             | Item name                               |
| `slug`            | string (unique)    | URL identifier                          |
| `brand`           | string, nullable   | Manufacturer                            |
| `description`     | text, nullable     | Long description                        |
| `condition`       | GearCondition enum | `new`, `excellent`, `good`, `fair`      |
| `daily_rate`      | decimal(12,2)      | Price charged per rental day            |
| `deposit_amount`  | decimal(12,2)      | Refundable deposit                      |
| `stock`           | unsigned small int | Available units                         |
| `min_rental_days` | unsigned small int | Minimum booking length                  |
| `max_rental_days` | unsigned small int | Maximum booking length, null when unset |
| `is_active`       | boolean            | Whether the item can be rented          |

`Gear` implements `HasMedia` for photos stored in the `images` collection, and `Searchable` for Scout indexing. The `active` scope filters rentable items.

### User

Standard authentication model extended by Fortify with email verification, two-factor authentication, and password confirmation.

---

## Environment variables

Beyond the standard Laravel configuration:

| Variable           | Default                 | Description                         |
| ------------------ | ----------------------- | ----------------------------------- |
| `VITE_APP_NAME`    | `${APP_NAME}`           | Application name exposed to the SPA |
| `SCOUT_DRIVER`     | `database`              | Search driver for Scout             |
| `SCOUT_QUEUE`      | `false`                 | Queue indexing instead of sync      |
| `MEILISEARCH_HOST` | `http://127.0.0.1:7700` | Meilisearch endpoint                |
| `MEILISEARCH_KEY`  | empty                   | Meilisearch API key                 |

To use Meilisearch, start an instance and set `SCOUT_DRIVER=meilisearch` with `SCOUT_QUEUE=true`.

---

## Dependencies

### PHP runtime

| Package                       | Purpose                                                               |
| ----------------------------- | --------------------------------------------------------------------- |
| `laravel/framework`           | Application framework                                                 |
| `inertiajs/inertia-laravel`   | Server-side Inertia adapter, renders pages through Blade              |
| `laravel/fortify`             | Authentication scaffolding: login, registration, password reset, 2FA  |
| `laravel/scout`               | Driver-based full-text search for Eloquent models                     |
| `meilisearch/meilisearch-php` | PHP client for the Meilisearch search engine                          |
| `laravel/wayfinder`           | Generates TypeScript route and controller helpers from Laravel routes |
| `spatie/laravel-medialibrary` | Attaches files and images to models with conversions                  |
| `laravel/chisel`              | Scripts that strip unused code, files, and dependencies               |
| `laravel/tinker`              | REPL for exploring the application in the terminal                    |

### PHP development

| Package                       | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `pestphp/pest`                | Testing framework                                           |
| `pestphp/pest-plugin-laravel` | Pest integration for Laravel helpers                        |
| `larastan/larastan`           | PHPStan extension with Laravel-specific rules               |
| `laravel/pint`                | Code formatter                                              |
| `laravel/sail`                | Docker environment for local development                    |
| `laravel/pail`                | Tails log files in the terminal                             |
| `laravel/pao`                 | Agent-optimized output for PHP testing tools                |
| `laravel/boost`               | MCP server that exposes schema, docs, and logs to AI agents |
| `fakerphp/faker`              | Fake data generation for factories and seeders              |
| `mockery/mockery`             | Mock objects in tests                                       |
| `nunomaduro/collision`        | Readable console error output                               |

### JavaScript runtime

| Package                      | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `react`, `react-dom`         | UI runtime                                               |
| `@inertiajs/react`           | Inertia client adapter for React                         |
| `tailwindcss`                | Utility-first CSS framework                              |
| `clsx`, `tailwind-merge`     | Conditional class names and Tailwind conflict resolution |
| `class-variance-authority`   | Variant-driven component styles                          |
| `lucide-react`               | Icon set                                                 |
| `sonner`                     | Toast notifications                                      |
| `react-hook-form`            | Form state and validation                                |
| `@hookform/resolvers`, `zod` | Schema validation shared between server and client       |
| `react-day-picker`           | Date picker primitive                                    |
| `date-fns`                   | Date manipulation utilities                              |
| `@radix-ui/react-*`          | Accessible unstyled primitives for shadcn/ui components  |
| `tw-animate-css`             | Animations referenced by Tailwind utilities              |

### JavaScript build and development

| Package                                           | Purpose                                                |
| ------------------------------------------------- | ------------------------------------------------------ |
| `vite`                                            | Frontend build tool and dev server                     |
| `vite-plus`                                       | Provides the `vp` CLI used for build, format, and lint |
| `laravel-vite-plugin`                             | Vite integration, entry points, and Bunny Fonts host   |
| `@inertiajs/vite`                                 | Vite plugin for Inertia SSR support                    |
| `@tailwindcss/vite`                               | Tailwind CSS v4 Vite plugin                            |
| `@vitejs/plugin-react`                            | React Fast Refresh and JSX transform                   |
| `@rolldown/plugin-babel`                          | Babel transform that applies the React Compiler        |
| `babel-plugin-react-compiler`                     | React Compiler preset for automatic memoization        |
| `@laravel/vite-plugin-wayfinder`                  | Runs Wayfinder generation during the Vite build        |
| `typescript`                                      | Type checking                                          |
| `concurrently`                                    | Runs multiple dev processes together                   |
| `@types/react`, `@types/react-dom`, `@types/node` | Type definitions for the TypeScript compiler           |

---

## Frontend architecture

Pages live in `resources/js/pages` and map one-to-one to Inertia components rendered from routes. Layouts are assigned in `resources/js/app.tsx` based on the page name prefix.

| Page prefix  | Layout                             |
| ------------ | ---------------------------------- |
| `welcome`    | None                               |
| `auth/*`     | `layouts/auth`                     |
| `settings/*` | `layouts/app` + `layouts/settings` |
| default      | `layouts/app`                      |

Route helpers are generated by Wayfinder into `resources/js/routes` and controller actions into `resources/js/actions`. Import from these instead of hardcoding URLs:

```tsx
import { Link } from '@inertiajs/react';
import { dashboard } from '@/routes';

export function DashboardLink() {
    return <Link href={dashboard()}>Dashboard</Link>;
}
```

Regenerate after changing routes:

```bash
php artisan wayfinder:generate
```

The design system is defined in `resources/css/app.css`. Colors are exposed as CSS custom properties under `:root` and mapped to Tailwind theme tokens through `@theme`. Application UI is light mode only; there is no dark mode variant.

---

## Testing

```bash
php artisan test
vendor/bin/pest tests/Feature/Models/GearTest.php
```

Tests run against an in-memory SQLite database with the cache, session, and mail drivers overridden. `SCOUT_DRIVER` is set to `null` so no search engine is required.

To run tests locally, enable the PHP SQLite extension:

```bash
# php.ini
extension=pdo_sqlite
```

---

## Code quality

```bash
composer lint          # Format PHP
composer types:check   # PHPStan
npm run check          # Format check and lint frontend
npm run types:check    # TypeScript
```

Continuous integration runs `composer setup` followed by `composer ci:check` on every push to `main` and every pull request.

---

## License

MIT
