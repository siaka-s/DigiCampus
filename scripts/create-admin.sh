#!/bin/bash
# Crée le compte super admin initial pour DigiCampus.
# À exécuter une seule fois après le premier démarrage des conteneurs.
set -e

ADMIN_EMAIL="siaka@digifemmes.com"
API_URL="${API_URL:-http://localhost:8080}"

echo ""
echo "=== Création du compte super admin DigiCampus ==="
echo "Email : $ADMIN_EMAIL"
echo ""

# Demande du mot de passe (saisi deux fois, jamais affiché)
read -rsp "Mot de passe : " PASSWORD
echo ""
read -rsp "Confirmer le mot de passe : " PASSWORD_CONFIRM
echo ""

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
  echo "Erreur : les mots de passe ne correspondent pas."
  exit 1
fi

if [ ${#PASSWORD} -lt 8 ]; then
  echo "Erreur : le mot de passe doit contenir au moins 8 caractères."
  exit 1
fi

# Étape 1 — inscription via l'API (hachage bcrypt géré par le backend)
echo ""
echo "--> Inscription..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PASSWORD\",\"_hp\":\"\"}")

if [ "$HTTP_STATUS" != "201" ] && [ "$HTTP_STATUS" != "200" ]; then
  echo "Erreur lors de l'inscription (HTTP $HTTP_STATUS)."
  echo "Le compte existe peut-être déjà. Vérifiez avec : docker compose exec postgres psql -U digicampus -c \"SELECT email, role, is_active FROM users WHERE email = '$ADMIN_EMAIL';\""
  exit 1
fi

# Étape 2 — activation + rôle super_admin via SQL direct
echo "--> Activation et attribution du rôle super_admin..."
docker compose exec -T postgres psql -U digicampus -d digicampus \
  -c "UPDATE users SET is_active = true, role = 'super_admin' WHERE email = '$ADMIN_EMAIL';"

echo ""
echo "=== Compte créé avec succès ==="
echo "Email    : $ADMIN_EMAIL"
echo "Rôle     : super_admin"
echo "Statut   : actif"
echo ""
echo "Connectez-vous sur https://space.digifemmes.com/login"
