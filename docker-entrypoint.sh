#!/bin/sh
# Dynamic Nginx configuration for Render deployment
# Substitutes environment variables at runtime

# Default backend URL if not provided
BACKEND_URL=${BACKEND_URL:-http://localhost:3000}

# Create nginx config with environment variable substitution
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 3000;
    server_name _;

    # Serve static files from dist
    root /app/dist;
    index index.html;



    # Fallback to index.html for SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

echo "Nginx config generated with BACKEND_URL=$BACKEND_URL"

# Start nginx
exec nginx -g 'daemon off;'
