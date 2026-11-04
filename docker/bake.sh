#!/bin/sh
set -eu

WP_DIR=/var/www/html/wordpress
TITLE="${WP_POST_TITLE:-336626}"

mkdir -p /run/mysqld "$WP_DIR"
chown mysql:mysql /run/mysqld

if [ ! -d /var/lib/mysql/mysql ]; then
  mariadb-install-db --user=mysql --datadir=/var/lib/mysql > /dev/null
fi

mysqld_safe --user=mysql > /dev/null 2>&1 &

i=0
until mysqladmin ping --silent > /dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 90 ]; then
    echo "MariaDB did not start" >&2
    exit 1
  fi
  sleep 1
done

mysql -e "CREATE DATABASE wp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'wp'@'localhost' IDENTIFIED BY 'wp'; GRANT ALL PRIVILEGES ON wp.* TO 'wp'@'localhost'; FLUSH PRIVILEGES;"

wpc() {
  php -d memory_limit=512M /usr/local/bin/wp --allow-root --path="$WP_DIR" "$@"
}

wpc core download --locale=en_US
cp /tmp/wp-config.php "$WP_DIR/wp-config.php"
wpc config shuffle-salts || true

ADMIN_PASS="$(php -r 'echo bin2hex(random_bytes(12));')"
wpc core install \
  --url=http://localhost/wordpress \
  --title="Week 8" \
  --admin_user=admin \
  --admin_password="$ADMIN_PASS" \
  --admin_email=admin@example.com \
  --skip-email

wpc rewrite structure '/%postname%/'
wpc post update 1 --post_title="$TITLE"
wpc post delete 2 --force || true
wpc comment delete 1 --force || true

cp /tmp/wordpress.htaccess "$WP_DIR/.htaccess"
chown -R www-data:www-data "$WP_DIR"

echo "Posts in the database:"
wpc post list --post_type=post --fields=ID,post_title,post_status
test "$(wpc post list --post_type=post --format=ids)" = "1"
test "$(wpc post get 1 --field=post_title)" = "$TITLE"

mysqladmin shutdown
i=0
while mysqladmin ping --silent > /dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    break
  fi
  sleep 1
done
sleep 2
