#!/bin/bash
set -e

DOMAIN=$1
if [ -z "$DOMAIN" ]; then
  echo "Usage: ./deploy/add-domain.sh mon-restaurant.fr"
  exit 1
fi

echo "=== Ajout du domaine $DOMAIN ==="

echo "[1/3] Création de la config Nginx..."
cat > /etc/nginx/sites-available/$DOMAIN <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:6000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN

echo "[2/3] Obtention du certificat SSL..."
mkdir -p /var/www/certbot
certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "www.$DOMAIN" \
  --non-interactive --agree-tos \
  --email mauriced@apptoo.com

echo "[3/3] Rechargement de Nginx..."
nginx -t && systemctl reload nginx

echo ""
echo "✓ $DOMAIN est configuré avec SSL !"
echo ""
echo "IMPORTANT : Le restaurateur doit ajouter un enregistrement DNS"
echo "  A  $DOMAIN  →  65.21.209.102"
echo "  CNAME  www.$DOMAIN  →  $DOMAIN"
