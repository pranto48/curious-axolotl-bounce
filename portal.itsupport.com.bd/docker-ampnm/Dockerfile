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
    # Install Node.js and npm for React build
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd pdo_mysql zip intl opcache bcmath exif

# Enable Apache modules
RUN a2enmod rewrite

# Copy application files from the current directory
COPY . /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Build the React application
WORKDIR /var/www/html
RUN npm install
RUN npm run build

# Expose port 2266 (or whatever port your app runs on)
EXPOSE 2266

# Update Apache configuration to listen on 2266
# First, remove any existing Listen directives for 80 or 2266
RUN sed -i '/^Listen 80/d' /etc/apache2/ports.conf \
    && sed -i '/^Listen 2266/d' /etc/apache2/ports.conf \
    # Then, add the correct Listen directive
    && echo "Listen 2266" >> /etc/apache2/ports.conf \
    # And update VirtualHost configurations
    && sed -i -e 's/VirtualHost \*:80/VirtualHost \*:2266/g' /etc/apache2/sites-available/000-default.conf \
    && sed -i -e 's/VirtualHost \*:80/VirtualHost \*:2266/g' /etc/apache2/sites-enabled/000-default.conf

# Ensure the uploads directory exists and has correct permissions
RUN mkdir -p /var/www/html/uploads/icons \
    mkdir -p /var/www/html/uploads/map_backgrounds \
    mkdir -p /var/www/html/uploads/backups \
    && chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 775 /var/www/html/uploads

# Use the copied entrypoint script
ENTRYPOINT ["/var/www/html/docker-entrypoint.sh"]