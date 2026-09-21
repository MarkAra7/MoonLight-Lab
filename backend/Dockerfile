FROM php:8.4-fpm-bookworm

# System dependencies, nginx, supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        git \
        unzip \
        zip \
        nginx \
        supervisor \
        libzip-dev \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
        libonig-dev \
        libxml2-dev \
        libicu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        intl \
        opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Upload size limits for the media-heavy app
RUN { \
        echo 'upload_max_filesize=25M;'; \
        echo 'post_max_size=25M;'; \
    } > /usr/local/etc/php/conf.d/uploads.ini

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Application code (storage/app/public images are included for seeding;
# vendor + .env are excluded via .dockerignore)
COPY . .

# Laravel runtime layout
RUN mkdir -p storage/framework/cache storage/framework/sessions \
        storage/framework/testing storage/framework/views \
    && chown -R www-data:www-data storage bootstrap/cache

# Production-style dependencies (no dev packages)
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader

# Nginx config, supervisor config, entrypoint
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]