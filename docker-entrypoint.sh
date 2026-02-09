#!/bin/sh
# Dynamic Nginx configuration for Render deployment
# Substitutes environment variables at runtime

# Backend URL - use env var if provided, otherwise default
# On Render, set BACKEND_URL to the backend service URL
# For local docker-compose, it defaults to http://backend:3000
if [ -z "$BACKEND_URL" ]; then
    # Auto-detect if running on Render
    if [ -n "$RENDER" ]; then
        BACKEND_URL="http://tutorverse-backend-kpls.onrender.com"
    else
        BACKEND_URL="http://backend:3000"
    fi
fi

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
        
        # Disable SSL verification for upstream (if using HTTPS)
        proxy_ssl_verify off;
        proxy_ssl_verify_depth 0;
        
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
