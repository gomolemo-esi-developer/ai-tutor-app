#!/bin/sh
# Dynamic Nginx configuration for Render deployment
# Substitutes environment variables at runtime

# Default backend URL if not provided
BACKEND_URL=${BACKEND_URL:-http://backend:3000}

# Create nginx config with environment variable substitution
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 3000;
    server_name _;

    # Allow large file uploads
    client_max_body_size 100M;

    # Serve static files from dist
    root /app/dist;
    index index.html;

    # API proxy to backend - MUST come before the / location
    location /api/ {
        proxy_pass $BACKEND_URL;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Settings for file uploads
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_redirect off;
        
        # Increase timeout for large uploads
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Fallback to index.html for SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

echo "Nginx config generated with BACKEND_URL=$BACKEND_URL"

# Start nginx
exec nginx -g 'daemon off;'
