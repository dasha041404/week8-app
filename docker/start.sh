#!/bin/sh
set -eu

mkdir -p /run/mysqld
chown mysql:mysql /run/mysqld

mysqld_safe --user=mysql > /dev/null 2>&1 &
apache2-foreground &

cd /app
exec node index.js
