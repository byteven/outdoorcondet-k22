#!/usr/bin/env bash
set -e

export PORT="${PORT:-8080}"
export RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
export RUN_SCHEDULER="${RUN_SCHEDULER:-true}"
export RUN_QUEUE="${RUN_QUEUE:-true}"

# 1. Siapkan sertifikat SSL CA untuk Aiven MySQL (mendukung Base64, raw PEM, atau file ter-mount)
AIVEN_CA_PATH="/etc/ssl/certs/aiven-ca.pem"
if [ -n "${DB_SSL_CA_BASE64:-}" ]; then
    printf '%s' "$DB_SSL_CA_BASE64" | tr -d '[:space:]' | base64 -d > "$AIVEN_CA_PATH"
    chmod 644 "$AIVEN_CA_PATH"
    export MYSQL_ATTR_SSL_CA="$AIVEN_CA_PATH"
elif [ -n "${DB_SSL_CA_CERT:-}" ]; then
    printf '%b\n' "$DB_SSL_CA_CERT" > "$AIVEN_CA_PATH"
    chmod 644 "$AIVEN_CA_PATH"
    export MYSQL_ATTR_SSL_CA="$AIVEN_CA_PATH"
elif [ -f "$AIVEN_CA_PATH" ] && [ -z "${MYSQL_ATTR_SSL_CA:-}" ]; then
    export MYSQL_ATTR_SSL_CA="$AIVEN_CA_PATH"
fi

# 2. Generate konfigurasi Nginx dengan PORT dinamis dari Railway
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# 3. Pastikan direktori storage tersedia & dimiliki www-data (aman saat Railway Volume di-mount)
mkdir -p \
    /var/www/html/storage/app/public \
    /var/www/html/storage/app/private \
    /var/www/html/storage/framework/cache/data \
    /var/www/html/storage/framework/sessions \
    /var/www/html/storage/framework/views \
    /var/www/html/storage/logs \
    /var/www/html/bootstrap/cache

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# 4. Buat file SQLite otomatis jika DB_CONNECTION=sqlite
if [ "${DB_CONNECTION:-}" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    mkdir -p "$(dirname "$DB_FILE")"
    touch "$DB_FILE"
    chown www-data:www-data "$DB_FILE"
fi

# 5. Pastikan symlink storage publik tersedia
php /var/www/html/artisan storage:link --force || true

# 6. Cache konfigurasi, route, dan view dengan environment variable runtime (termasuk MYSQL_ATTR_SSL_CA)
php /var/www/html/artisan config:cache
php /var/www/html/artisan route:cache
php /var/www/html/artisan view:cache

# 7. Jalankan migrasi database non-destruktif jika diaktifkan
if [ "$RUN_MIGRATIONS" = "true" ]; then
    php /var/www/html/artisan migrate --force --no-interaction
fi

# 8. Jalankan Supervisor (PHP-FPM, Nginx, Laravel Scheduler, Laravel Queue)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
