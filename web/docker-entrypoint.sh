#!/bin/sh
set -e

if [ -z "$API_UPSTREAM" ]; then
  echo "ERROR: API_UPSTREAM must be set (example: http://dta-api-prod.eba-xxxx.us-east-1.elasticbeanstalk.com)"
  exit 1
fi

sed "s|%%API_UPSTREAM%%|${API_UPSTREAM}|g" /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'