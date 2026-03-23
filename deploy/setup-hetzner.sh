#!/bin/bash
set -e

echo "=============================================="
echo "  macommande.shop — Déploiement Hetzner"
echo "=============================================="
echo ""

APP_DIR="/opt/macommande"
REPO_URL="${1:-https://github.com/ulyssemdbh-commits/macommande.git}"

if ! command -v docker &> /dev/null; then
  echo "[1/6] Installation de Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "[1/6] Docker déjà installé ✓"
fi

if ! docker compose version &> /dev/null; then
  echo "[2/6] Installation de Docker Compose..."
  apt-get update && apt-get install -y docker-compose-plugin
else
  echo "[2/6] Docker Compose déjà installé ✓"
fi

echo "[3/6] Création du dossier $APP_DIR..."
mkdir -p "$APP_DIR"

if [ -n "$REPO_URL" ]; then
  echo "[3/6] Clonage du dépôt..."
  if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR" && git pull
  else
    git clone "$REPO_URL" "$APP_DIR"
  fi
fi

echo "[4/6] Configuration du fichier .env.production..."
if [ ! -f "$APP_DIR/.env.production" ]; then
  cp "$APP_DIR/deploy/env.example" "$APP_DIR/.env.production"
  
  DB_PASS=$(openssl rand -hex 24)
  SESSION=$(openssl rand -hex 32)
  sed -i "s/VOTRE_MOT_DE_PASSE_DB/$DB_PASS/g" "$APP_DIR/.env.production"
  sed -i "s/generez-une-chaine-aleatoire-ici/$SESSION/g" "$APP_DIR/.env.production"
  
  echo ""
  echo "   ⚠️  Éditez .env.production pour ajouter votre webhook Discord :"
  echo "   nano $APP_DIR/.env.production"
  echo ""
else
  echo "   .env.production existe déjà ✓"
fi

echo "[5/6] Configuration Nginx..."
if [ -f /etc/nginx/sites-enabled/default ] || [ -d /etc/nginx/sites-enabled/ ]; then
  cp "$APP_DIR/deploy/nginx/macommande.shop.conf" /etc/nginx/sites-available/macommande.shop
  
  if [ ! -L /etc/nginx/sites-enabled/macommande.shop ]; then
    ln -s /etc/nginx/sites-available/macommande.shop /etc/nginx/sites-enabled/macommande.shop
  fi
  
  echo "   Config Nginx installée dans /etc/nginx/sites-enabled/ ✓"
else
  echo "   ⚠️  /etc/nginx/sites-enabled/ non trouvé"
  echo "   Copiez manuellement : cp $APP_DIR/deploy/nginx/macommande.shop.conf /etc/nginx/conf.d/"
fi

echo "[6/6] Certificat SSL..."
if [ ! -d /etc/letsencrypt/live/macommande.shop ]; then
  echo "   Obtention du certificat SSL pour macommande.shop..."
  
  mkdir -p /var/www/certbot
  
  if command -v certbot &> /dev/null; then
    certbot certonly --webroot -w /var/www/certbot \
      -d macommande.shop -d www.macommande.shop \
      --non-interactive --agree-tos \
      --email mauriced@apptoo.com
  else
    apt-get install -y certbot
    certbot certonly --webroot -w /var/www/certbot \
      -d macommande.shop -d www.macommande.shop \
      --non-interactive --agree-tos \
      --email mauriced@apptoo.com
  fi
else
  echo "   Certificat SSL déjà en place ✓"
fi

echo ""
echo "=============================================="
echo "  Installation terminée !"
echo "=============================================="
echo ""
echo "  Prochaines étapes :"
echo ""
echo "  1. Vérifiez/éditez la config :"
echo "     nano $APP_DIR/.env.production"
echo ""
echo "  2. Construisez et démarrez :"
echo "     cd $APP_DIR"
echo "     docker compose up -d --build"
echo ""
echo "  3. Rechargez Nginx :"
echo "     nginx -t && systemctl reload nginx"
echo ""
echo "  4. Vérifiez que tout tourne :"
echo "     docker compose ps"
echo "     curl -s http://localhost:6000/api/restaurants"
echo ""
echo "  5. Pointez le DNS de macommande.shop vers 65.21.209.102"
echo ""
