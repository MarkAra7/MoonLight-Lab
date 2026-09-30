#!/bin/sh
set -e

cd /var/www/html

# Fix ownership for the runtime dirs
chown -R www-data:www-data storage bootstrap/cache

# Generate an app key if none was provided
if [ -z "${APP_KEY:-}" ]; then
    echo "==> No APP_KEY set, generating one..."
    php artisan key:generate --force --no-interaction
fi

# Symlink public/storage -> storage/app/public
php artisan storage:link --no-interaction >/dev/null 2>&1 || true

# Wait for MySQL and run migrations (idempotent), retrying up to 20 times
attempt=0
until php artisan migrate --force --no-interaction; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 20 ]; then
        echo "==> Migrations failed after $attempt attempts. Aborting."
        exit 1
    fi
    echo "==> Database not ready (attempt $attempt/20), retrying in 3s..."
    sleep 3
done

# Seed the database. Every seeder uses firstOrCreate/updateOrCreate, so this
# is safe to run on every boot (no duplicate rows).
php artisan db:seed --force --no-interaction

# Re-apply ownership AFTER the artisan commands above, since they run as root
# and may (re)create storage/logs/laravel.log with root ownership. php-fpm
# workers run as www-data and must be able to append to the log file.
chown -R www-data:www-data storage bootstrap/cache

echo "==> Backend ready. Starting php-fpm + nginx..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf