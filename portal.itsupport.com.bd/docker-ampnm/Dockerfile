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
    curl \
    libmariadb-dev \
    libwebp-dev \
    libcurl4-openssl-dev \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

# Configure PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-configure pdo_mysql --with-pdo-mysql=mysqlnd

# Install PHP extensions
RUN docker-php-ext-install -j$(nproc) gd pdo_mysql zip intl opcache bcmath exif curl

# Enable Apache modules
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy application files from the current directory
COPY . /var/www/html/

# Install PHPMailer
WORKDIR /var/www/html
RUN composer require phpmailer/phpmailer

# Copy the entrypoint script from the build context root
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Expose port 2266 (or whatever port your app runs on)
EXPOSE 2266

# Update Apache configuration to listen on 2266
# Replace 'Listen 80' with 'Listen 2266' in ports.conf
RUN sed -i 's/Listen 80/Listen 2266/' /etc/apache2/ports.conf \
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