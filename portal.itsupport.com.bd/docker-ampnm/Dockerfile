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

# Install Node.js and npm from NodeSource (Node.js 20 LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Create a dedicated directory for the React application
RUN mkdir -p /var/www/html/react-app
WORKDIR /var/www/html/react-app

# Copy React application files from the build context root
# (which is portal.itsupport.com.bd/)
COPY package.json ./
COPY package-lock.json ./
COPY src ./src
COPY public ./public
COPY tailwind.config.ts ./tailwind.config.ts
COPY postcss.config.js ./postcss.config.js
COPY tsconfig.json ./tsconfig.json
COPY vite.config.ts ./vite.config.ts

# Build the React application
RUN npm cache clean --force
RUN npm install # Changed from npm ci to npm install
RUN npm run build

# Create a subdirectory for the PHP application's DocumentRoot
RUN mkdir -p /var/www/html/php-app

# Copy PHP application files from the build context's 'docker-ampnm' folder
COPY docker-ampnm/ /var/www/html/php-app/

# Set permissions for all files
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Expose port 2266
EXPOSE 2266

# Update Apache configuration to listen on 2266 and set DocumentRoot to php-app
RUN sed -i '/^Listen 80/d' /etc/apache2/ports.conf \
    && sed -i '/^Listen 2266/d' /etc/apache2/ports.conf \
    && echo "Listen 2266" >> /etc/apache2/ports.conf \
    && sed -i -e 's/VirtualHost \*:80/VirtualHost \*:2266/g' /etc/apache2/sites-available/000-default.conf \
    && sed -i -e 's/VirtualHost \*:80/VirtualHost \*:2266/g' /etc/apache2/sites-enabled/000-default.conf \
    && sed -i -e 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/php-app|g' /etc/apache2/sites-available/000-default.conf \
    && sed -i -e 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/php-app|g' /etc/apache2/sites-enabled/000-default.conf \
    && sed -i -e 's|<Directory /var/www/html>|<Directory /var/www/html/php-app>|g' /etc/apache2/apache2.conf

# Ensure the uploads directory exists and has correct permissions (relative to php-app DocumentRoot)
RUN mkdir -p /var/www/html/php-app/uploads/icons \
    mkdir -p /var/www/html/php-app/uploads/map_backgrounds \
    mkdir -p /var/www/html/php-app/uploads/backups \
    && chown -R www-data:www-data /var/www/html/php-app/uploads \
    && chmod -R 775 /var/www/html/php-app/uploads

# Use the entrypoint script from the the php-app subdirectory
ENTRYPOINT ["/var/www/html/php-app/docker-entrypoint.sh"]