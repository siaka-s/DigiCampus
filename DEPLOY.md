# Guide de déploiement — DigiCampus

## Prérequis sur le VPS

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose plugin (inclus avec Docker moderne)
docker compose version

# Git
sudo apt install git -y
```

---

## 1. Cloner le projet

```bash
sudo mkdir -p /opt/digicampus
sudo chown $USER:$USER /opt/digicampus
git clone https://github.com/VOTRE_ORG/DigiCampus.git /opt/digicampus
cd /opt/digicampus
```

---

## 2. Créer les fichiers d'environnement

### Racine du projet (docker-compose)
```bash
cp .env.production.example .env
nano .env
```
Remplir :
- `POSTGRES_PASSWORD` — mot de passe fort pour la base
- `NEXT_PUBLIC_API_URL=https://space.digifemmes.com`

### Backend
```bash
cp backend/.env.production.example backend/.env.production
nano backend/.env.production
```
Remplir :
- `POSTGRES_USER` / `POSTGRES_PASSWORD` — identiques à ceux du `.env` racine
- `JWT_SECRET` — générer avec : `openssl rand -base64 48`
- `RESEND_API_KEY` — clé Resend de production

### Frontend
```bash
cp frontend/.env.production.example frontend/.env.production
nano frontend/.env.production
```
Remplir :
- `NEXTAUTH_SECRET` — générer avec : `openssl rand -base64 48`

---

## 3. Configurer le domaine

Chez votre registrar DNS, ajouter un enregistrement **A** :
```
space.digifemmes.com  →  IP_DU_VPS
```

Attendre la propagation DNS (5–30 min) avant de démarrer Caddy.

---

## 4. Premier démarrage

```bash
cd /opt/digicampus
docker compose up -d --build
```

Caddy obtient le certificat HTTPS automatiquement via Let's Encrypt.
Vérifier que tout tourne :

```bash
docker compose ps
docker compose logs --tail=50
```

---

## 5. Créer le compte administrateur

À exécuter **une seule fois** après le premier démarrage :

```bash
cd /opt/digicampus
bash scripts/create-admin.sh
```

Le script demande un mot de passe (saisi deux fois, jamais affiché ni stocké), crée le compte `siaka@digifemmes.com` et lui attribue le rôle `super_admin` automatiquement.

---

## 6. Configurer le déploiement automatique (GitHub Actions)

Sur GitHub → **Settings → Secrets and variables → Actions**, ajouter :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP ou domaine du VPS (ex. `51.158.xxx.xxx`) |
| `VPS_USER` | Utilisateur SSH (ex. `ubuntu`) |
| `VPS_SSH_KEY` | Clé SSH privée (contenu de `~/.ssh/id_rsa`) |
| `VPS_PORT` | Port SSH, généralement `22` |

Pour générer une paire de clés SSH dédiée au déploiement :
```bash
ssh-keygen -t ed25519 -C "deploy@digicampus" -f ~/.ssh/digicampus_deploy
# Ajouter la clé publique sur le VPS
cat ~/.ssh/digicampus_deploy.pub >> ~/.ssh/authorized_keys
# Copier la clé privée dans le secret VPS_SSH_KEY sur GitHub
cat ~/.ssh/digicampus_deploy
```

À partir de maintenant, **chaque `git push` sur `main` redéploie automatiquement**.

---

## Commandes utiles

```bash
# Mettre à jour depuis Git et redéployer (script tout-en-un)
cd /opt/digicampus && ./deploy.sh

# Voir les logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f backend
docker compose logs -f frontend

# Redémarrer un service sans rebuild
docker compose restart backend

# Mettre à jour manuellement étape par étape
cd /opt/digicampus && git pull && docker compose up -d --build --no-deps backend frontend caddy

# Sauvegarder la base de données
docker compose exec postgres pg_dump -U digicampus digicampus > backup_$(date +%Y%m%d).sql
```

---

## Architecture de production

```
Internet
    │
    ▼
Caddy :443 (HTTPS automatique)
    ├── /api/*  →  Backend Go  :8080
    └── /*      →  Frontend Next.js  :3000
                           │
                   PostgreSQL :5432 (réseau interne uniquement)
```
