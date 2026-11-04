FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM php:8.3-apache

ARG WP_POST_TITLE=336626
ENV WP_POST_TITLE=${WP_POST_TITLE}

RUN apt-get update \
 && apt-get install -y --no-install-recommends mariadb-server curl ca-certificates \
 && docker-php-ext-install mysqli \
 && rm -rf /var/lib/apt/lists/*

COPY --from=node:20-bookworm-slim /usr/local/bin/node /usr/local/bin/node

RUN curl -fsSL -o /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
 && chmod +x /usr/local/bin/wp

COPY docker/mariadb-small.cnf /etc/mysql/mariadb.conf.d/99-small.cnf
COPY docker/apache-wp.conf /etc/apache2/conf-available/wp.conf

RUN sed -i 's/^Listen 80$/Listen 127.0.0.1:8080/' /etc/apache2/ports.conf \
 && sed -i 's/<VirtualHost \*:80>/<VirtualHost 127.0.0.1:8080>/' /etc/apache2/sites-available/000-default.conf \
 && a2enmod rewrite \
 && a2enconf wp

COPY docker/wp-config.php docker/wordpress.htaccess /tmp/
COPY docker/bake.sh docker/start.sh /usr/local/bin/

RUN sed -i 's/\r$//' /usr/local/bin/bake.sh /usr/local/bin/start.sh /tmp/wp-config.php /tmp/wordpress.htaccess \
      /etc/mysql/mariadb.conf.d/99-small.cnf /etc/apache2/conf-available/wp.conf \
 && chmod +x /usr/local/bin/bake.sh /usr/local/bin/start.sh \
 && bake.sh

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json app.js index.js ./
RUN mkdir -p views

ENV NODE_ENV=production
CMD ["start.sh"]
