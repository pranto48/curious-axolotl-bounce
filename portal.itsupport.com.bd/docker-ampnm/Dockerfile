FROM php:8.2-apache

# Set frontend to noninteractive to prevent prompts
ENV DEBIAN_FRONTEND=noninteractive

# Function to retry commands
RUN set -eux; \
    apt_install_with_retries() { \
        for i in $(seq 5); do \
            if apt-get update && apt-get install -y "$@"; then \
                break; \
            fi; \
            echo "Attempt $i failed, retrying in 5 seconds..."; \
            sleep 5; \
        done; \
    }; \
    \
    apt_install_with_retries \
        git \
        unzip \
        libzip-dev \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
        libicu-dev \
        libonig-dev \
        libxml2-dev \
        nmap \
        curl \
        mariadb-client-compat \
        zlib1g-dev \
        libwebp-dev; \
    \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install -j$(nproc) pdo_mysql zip intl opcache bcmath exif curl gd --with-freetype --with-jpeg --with-zlib

# Enable Apache modules
RUN a2enmod rewrite

# Copy the entrypoint script from the build context root
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Expose port 2266 (or whatever port your app runs on)
EXPOSE 2266

# Update Apache configuration to listen on 2266
RUN echo "Listen 2266" >> /etc/apache2/ports.conf \
    && sed -i -e 's/VirtualHost \*:80/VirtualHost \*:2266/g' /etc/apache2/sites-available/000-default.conf \
    && sed -i -e 's/VirtualHost \*:80/VirtualHost \*:2266/g' /etc/apache2/sites-enabled/000-default.conf

# Ensure the uploads directory exists and has correct permissions
RUN mkdir -p /var/www/html/uploads/icons \
    mkdir -p /var/www/html/uploads/map_backgrounds \
    mkdir -p /var/www/html/uploads/backups \
    && chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 775 /var/www/html/uploads

# Use the copied entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]