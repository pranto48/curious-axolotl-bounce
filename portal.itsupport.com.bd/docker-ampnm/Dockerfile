FROM php:8.2-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
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
    mariadb-client-compat \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo_mysql zip intl opcache bcmath exif

# Enable Apache modules
RUN a2enmod rewrite

# --- PHP Application Setup ---
# Copy PHP application files from the build context's 'portal.itsupport.com.bd/docker-ampnm/' folder
# directly to Apache's default DocumentRoot
COPY portal.itsupport.com.bd/docker-ampnm/ /var/www/html/

# Set permissions for all files
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Expose port 2266
EXPOSE 2266

# Update Apache configuration to listen on 2266
RUN sed -i '/^Listen 80/d' /etc/apache2/ports.conf \
    && sed -i '/^Listen 2266/d' /etc/apache2/ports.conf \
    && echo "Listen 2266" >> /etc/apache2/ports.conf \
    && sed -i -e 's/VirtualHost \*:80/VirtualHost \*:2266/g' /etc/apache2/sites-available/000-default.conf \
    && sed -i -e 's/VirtualHost \*:80/VirtualHost \*:2266/g' /etc/apache2/sites-enabled/000-default.conf

# Ensure the uploads directory exists and has correct permissions (relative to new DocumentRoot)
RUN mkdir -p /var/www/html/uploads/icons \
    mkdir -p /var/www/html/uploads/map_backgrounds \
    mkdir -p /var/www/html/uploads/backups \
    && chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 775 /var/www/html/uploads

# Use the entrypoint script from the DocumentRoot
ENTRYPOINT ["/var/www/html/docker-entrypoint.sh"]