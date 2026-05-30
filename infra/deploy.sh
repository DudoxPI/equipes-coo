#!/bin/bash
# Script de deploy inicial — rodar UMA VEZ na VPS como usuário dudox
# Uso: bash deploy.sh

set -e

REPO_URL="SEU_REPO_AQUI"   # ex: https://github.com/dudox/equipes-coo.git
APP_DIR="/home/dudox/equipecoo"

echo "==> Clonando repositório..."
git clone "$REPO_URL" "$APP_DIR"

echo "==> Criando .env..."
cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
echo ""
echo "  !! Edite $APP_DIR/backend/.env e defina APP_SENHA !!"
echo ""

echo "==> Instalando dependências Python..."
pip3 install -r "$APP_DIR/backend/requirements.txt"

echo "==> Configurando systemd..."
sudo cp "$APP_DIR/infra/equipecoo.service" /etc/systemd/system/equipecoo.service
sudo systemctl daemon-reload
sudo systemctl enable equipecoo
sudo systemctl start equipecoo

echo "==> Configurando Nginx..."
sudo cp "$APP_DIR/infra/nginx-equipecoo.conf" /etc/nginx/sites-available/equipecoo
sudo ln -sf /etc/nginx/sites-available/equipecoo /etc/nginx/sites-enabled/equipecoo
sudo nginx -t && sudo systemctl reload nginx

echo "==> Ativando HTTPS com Certbot..."
sudo certbot --nginx -d equipecoo.dudox.tech

echo ""
echo "✓ Deploy concluído! Acesse https://equipecoo.dudox.tech"
