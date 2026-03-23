#!/bin/bash
set -e

APP_DIR="/opt/macommande"

echo "=== Mise à jour macommande.shop ==="

cd "$APP_DIR"

echo "[1/3] Récupération des changements..."
git pull origin main

echo "[2/3] Reconstruction et redémarrage..."
docker compose up -d --build

echo "[3/3] Nettoyage des anciennes images..."
docker image prune -f

echo ""
echo "✓ Mise à jour terminée !"
echo ""
docker compose ps
