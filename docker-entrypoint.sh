#!/bin/sh
# Dynamic Nginx configuration for Render deployment

# Determine backend URL based on environment
if [ -n "$BACKEND_URL" ]; then
    BACKEND=$BACKEND_URL
elif [ -n "$RENDER" ]; then
    # Running on Render - use the service URL
    BACKEND="http://tutorverse-backend-kpls.onrender.com"
else
    # Running locally in docker-compose
    BACKEND="http://backend:3000"
fi

echo "Backend URL: $BACKEND"

# Substitute backend URL in the nginx config template
sed "s|http://backend:3000|${BACKEND}|g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Nginx config generated"

# Start nginx
exec nginx -g 'daemon off;'
