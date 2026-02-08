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

    # API proxy to backend
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
        proxy_ssl_verify off;
        proxy_ssl_session_reuse on;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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
