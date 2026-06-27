#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "==> Récupération du code..."
git pull origin main

echo "==> Rebuild et redémarrage des conteneurs..."
docker compose up --build -d --no-deps backend frontend caddy

echo "==> Nettoyage des images obsolètes..."
docker image prune -f

echo "==> Déploiement terminé."
docker compose ps
