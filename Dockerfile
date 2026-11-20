# ==============================================================================
# Stage 1: Base PHP 8.4-FPM (Debian Bookworm / glibc)
# ==============================================================================
FROM php:8.4-fpm-bookworm AS base

WORKDIR /var/www/html

# Install ekstensi PHP yang dibutuhkan Laravel 13, Spatie Media Library, & Aiven MySQL/PostgreSQL
COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions \
    pdo_mysql \
    pdo_pgsql \
    pdo_sqlite \
    gd \
    exif \
    intl \
    bcmath \
    zip \
    opcache \
    pcntl

# ==============================================================================
# Stage 2: Builder (PHP 8.4 + Composer + Node.js 22 untuk Wayfinder & vp build)
# ==============================================================================
FROM base AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    unzip \
    ca-certificates \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# 1. Install PHP dependencies (cached layer)
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

# 2. Install Node dependencies (cached layer; butuh devDependencies untuk vite-plus & wayfinder)
COPY package.json package-lock.json ./
RUN npm ci

# 3. Copy source code, generate autoloader/discovery, dan build frontend (vp build)
COPY . .

RUN mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && composer dump-autoload --optimize --no-dev --no-scripts \
    && APP_ENV=production \
       APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
       DB_CONNECTION=sqlite \
       CACHE_STORE=array \
       SESSION_DRIVER=array \
       QUEUE_CONNECTION=sync \
       SCOUT_DRIVER=null \
       php artisan package:discover --ansi \
    && APP_ENV=production \
       APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= \
       DB_CONNECTION=sqlite \
       CACHE_STORE=array \
       SESSION_DRIVER=array \
       QUEUE_CONNECTION=sync \
       SCOUT_DRIVER=null \
       npm run build

# ==============================================================================
# Stage 3: Production Runtime (PHP-FPM + Nginx + Supervisor)
# ==============================================================================
FROM base AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    gettext-base \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf

# Konfigurasi PHP & OPcache untuk production
RUN { \
    echo "memory_limit=256M"; \
    echo "upload_max_filesize=20M"; \
    echo "post_max_size=25M"; \
    echo "max_execution_time=60"; \
    echo "expose_php=Off"; \
    echo "opcache.enable=1"; \
    echo "opcache.memory_consumption=128"; \
    echo "opcache.interned_strings_buffer=16"; \
    echo "opcache.max_accelerated_files=10000"; \
    echo "opcache.validate_timestamps=0"; \
} > /usr/local/etc/php/conf.d/99-production.ini

# Copy aplikasi dan hasil build dari stage builder
COPY . .
COPY --from=builder /var/www/html/vendor ./vendor
COPY --from=builder /var/www/html/bootstrap/cache ./bootstrap/cache
COPY --from=builder /var/www/html/public/build ./public/build

# Copy konfigurasi Docker (Nginx, Supervisor, Entrypoint)
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Pastikan format line-ending LF (aman saat build dari Windows) dan permission direktori tepat
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p \
        storage/app/public \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

ENV PORT=8080 \
    RUN_MIGRATIONS=true \
    RUN_SCHEDULER=true \
    RUN_QUEUE=true

EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
