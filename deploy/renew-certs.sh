#!/bin/bash
set -e

echo "Renouvellement des certificats SSL..."
certbot renew --quiet

echo "Rechargement de Nginx..."
systemctl reload nginx

echo "✓ Renouvellement terminé."
