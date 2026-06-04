# DigiCampus — CLAUDE.md
> Fichier de directives projet. Claude Code doit lire ce fichier en entier avant toute action.

---

## RÈGLES DE TRAVAIL ABSOLUES

Ces règles s'appliquent à chaque session, sans exception.

1. **Aucune action sans accord explicite** — Claude ne crée, modifie ou supprime aucun fichier sans que le développeur ait dit "oui", "go", "ok" ou validé explicitement.
2. **Une étape à la fois** — Claude présente ce qu'il va faire, attend la validation, puis exécute. Jamais plusieurs étapes en une seule fois.
3. **Avant chaque fichier** — Claude annonce : le nom du fichier, son emplacement, et ce qu'il va contenir. Il attend le feu vert.
4. **Avant chaque commande terminal** — Claude affiche la commande complète et explique ce qu'elle fait. Il attend le feu vert.
5. **Fin d'étape** — Quand une étape est terminée, Claude coche ✅ dans ce fichier et attend les instructions pour passer à la suivante.
6. **Pas d'improvisation** — Claude ne sort pas du périmètre de l'étape en cours. Si quelque chose n'est pas prévu, il le signale et attend une décision.
7. **En cas de doute** — Claude pose une question plutôt que de supposer.
8. **Commits Git** — Claude prépare le message de commit et la commande, les soumet au développeur pour validation, et n'exécute qu'après accord explicite. Aucun commit sans feu vert.

---

## PRÉSENTATION DU PROJET

**DigiCampus** est une plateforme web de gestion des espaces et du matériel du campus DigiFemmes Côte d'Ivoire.

Elle couvre :
- La réservation de salles de programme
- La gestion de présence du staff dans les bureaux
- Le suivi du parc informatique (missions internes + locations externes)
- La gestion des rôles et des comptes utilisateurs

---

## STACK TECHNIQUE

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Auth.js (NextAuth) |
| Backend | Go, API REST |
| Base de données | PostgreSQL, driver pgx |
| Emails | Resend |
| Déploiement | VPS via Docker Compose |

---

## STRUCTURE DU REPO (monorepo)

```
DigiCampus/
├── frontend/
│   ├── src/
│   │   ├── app/              ← App Router Next.js
│   │   ├── components/       ← Composants UI réutilisables
│   │   ├── hooks/            ← Custom hooks React
│   │   ├── lib/
│   │   │   ├── api/          ← Fonctions d'appel API
│   │   │   └── auth/         ← Config Auth.js
│   │   └── types/            ← Types TypeScript globaux
│   ├── public/
│   └── .env.local
├── backend/
│   ├── cmd/
│   │   └── api/
│   │       └── main.go       ← Point d'entrée
│   ├── internal/
│   │   ├── user/             ← Domaine utilisateurs
│   │   ├── room/             ← Domaine salles
│   │   ├── booking/          ← Domaine réservations
│   │   ├── equipment/        ← Domaine matériel
│   │   └── presence/         ← Domaine présence staff
│   ├── pkg/
│   │   ├── database/         ← Connexion PostgreSQL
│   │   ├── middleware/        ← Auth, CORS, logging
│   │   └── mailer/           ← Resend
│   └── .env
├── .claude/
│   └── CLAUDE.md
├── .gitignore
└── README.md
```

---

## RÔLES UTILISATEURS

| Rôle | Périmètre |
|---|---|
| Super Admin | Gestion des comptes, attribution des rôles, badges département |
| Admin | Validation réservations, gestion espaces, matériel, stock |
| Admin IT | Sous-rôle admin — périmètre limité aux demandes de matériel IT |
| Collaborateur DigiFemmes | Réservation salles, demandes IT, déclaration de présence |
| Collaborateur Partenaire | Accès limité à ses propres demandes uniquement |

---

## DOMAINES MÉTIER

### Espaces
- **Salle de programme** : réservable via demande + validation admin
- **Bureau individuel** : affectation permanente, non réservable
- **Bureau partagé** : géré via le module de présence staff

### Réservations
- Créneau : heure de début + durée (flexible)
- Contrôle de capacité bloquant
- Validation obligatoire par un admin
- Option urgence si aucune salle disponible
- Affectation directe par l'admin (sans demande)
- Délai minimum : 24h avant le créneau

### Matériel
- Projecteurs : stock commun, réservables avec la salle
- Équipements fixes (TV 55"/65") : inclus d'office
- Parc informatique : missions internes + locations externes

### Présence staff
- Déclaration hebdomadaire par le collaborateur ou l'admin
- Alerte si présents > places assises du bureau

### Matériel IT
- Demande interne : nombre + durée + mission + lieu → admin IT valide
- Location externe : soumise par collaborateur → admin IT valide
- Statuts parc : Disponible / Attribué / En location

---

## RÈGLES MÉTIER CRITIQUES

| # | Règle |
|---|---|
| R1 | Deux programmes ne peuvent pas occuper la même salle sur le même créneau |
| R3 | Contrôle de capacité bloquant — seules les salles avec capacité ≥ participants sont proposées |
| R10 | Délai minimum de 24h avant le créneau (sauf urgence) |
| R12 | Tout nouveau compte est inactif jusqu'à validation manuelle |
| R22 | Une location externe doit être validée par l'admin IT avant attribution |
| R27 | Un seul super admin actif à la fois |

---

## CONVENTIONS DE CODE

### Frontend (Next.js)
- App Router uniquement (`app/`)
- TypeScript strict — pas de `any`
- Tailwind CSS uniquement — pas de CSS inline ni de fichiers `.css` custom sauf `globals.css`
- Composants : **PascalCase** (`BookingForm.tsx`)
- Routes/dossiers : **kebab-case** (`room-booking/`)
- Appels API : uniquement via `lib/api/`
- Pas de logique métier dans les composants — utiliser des hooks ou des server actions
- Chaque composant dans son propre fichier

### UI & Design System (Frontend)
- Bibliothèque de composants : **shadcn/ui** — à utiliser en priorité pour tous les composants
  (boutons, formulaires, modals, tableaux, badges, cards, dropdowns, toasts)
- Icônes : **Lucide React** — aucune autre bibliothèque d'icônes autorisée
- Animations : **Framer Motion** — pour les transitions de pages et les micro-interactions
- Notifications/Toasts : **shadcn/ui Sonner** — pour tous les retours utilisateur (succès, erreur, info)
- Graphiques (reporting) : **Recharts** — pour les tableaux de bord et statistiques
- Formulaires : **React Hook Form** + **Zod** — validation côté client sur tous les formulaires
- Pas de bibliothèques UI supplémentaires sans accord explicite du développeur
- Design sobre, professionnel et moderne — pas de styles flashy
- Responsive obligatoire sur chaque composant — approche mobile-first

### Palette de couleurs DigiCampus
Inspirée de l'identité visuelle DigiFemmes Côte d'Ivoire (orange + bleu ciel).
À définir dans `tailwind.config.ts` sous `theme.extend.colors`.

| Nom | Valeur | Usage |
|---|---|---|
| Primary | `#F97316` | Orange DigiFemmes — boutons principaux, actions, navigation active |
| Primary Light | `#FB923C` | Hover, backgrounds actifs |
| Primary Dark | `#C2410C` | Pressed, textes sur fond clair |
| Secondary | `#38BDF8` | Bleu ciel — accents, liens, badges informatifs |
| Secondary Dark | `#0284C7` | Hover bleu, icônes secondaires |
| Success | `#16A34A` | Validé, disponible, confirmé |
| Warning | `#EAB308` | En attente, alerte modérée |
| Danger | `#DC2626` | Refusé, suroccupé, erreur |
| Neutral | `#F8FAFC` | Fond général |
| Text Primary | `#1C1917` | Textes principaux |
| Text Secondary | `#6B7280` | Textes secondaires, placeholders |
| White | `#FFFFFF` | Fond des cards et modals |

### Gestion des états UI
- **Chargement** : skeleton loaders (shadcn/ui) sur tous les blocs de données — jamais de spinner seul
- **Erreur** : message explicite en langage clair + bouton "Réessayer" — jamais d'erreur technique brute affichée
- **État vide** : illustration simple + message explicite + action suggérée (ex. "Aucune réservation — Faire une demande")
- `loading.tsx` et `error.tsx` obligatoires sur chaque route App Router

### Structure des appels API
- Tous les appels passent par un client centralisé dans `lib/api/client.ts`
- Format standard de toutes les réponses Go :
```json
{ "data": {}, "error": null, "message": "success" }
```
- Le client frontend gère tous les cas HTTP de façon uniforme :
  - `401` → redirection `/login`
  - `403` → page non autorisée
  - `500` → toast erreur Sonner
- Jamais d'appel `fetch` direct dans un composant

### Backend (Go)
- Architecture en couches : `handler → service → repository`
- Un package par domaine : `room`, `booking`, `user`, `equipment`, `presence`
- Fichiers : **snake_case** (`room_handler.go`)
- Réponses API : toujours en JSON avec le format standard `{ data, error, message }`
- Gestion des erreurs explicite — pas de `panic` en production
- Jamais de valeurs sensibles en dur — toujours via `.env`
- Toutes les routes préfixées `/api/v1/`
- Requêtes PostgreSQL via paramètres préparés uniquement (pgx natif) — jamais de concaténation SQL

### Nommage des routes API
Convention stricte — toujours pluriel, toujours kebab-case :
```
/api/v1/auth/...
/api/v1/spaces/...
/api/v1/bookings/...
/api/v1/users/...
/api/v1/equipment/...
/api/v1/presence/...
/api/v1/reports/...
```
- `GET` → lire, `POST` → créer, `PATCH` → modifier, `DELETE` → supprimer
- Actions métier acceptées en suffixe : `/api/v1/bookings/:id/validate`

### Logging (Go)
- Librairie : **slog** (standard Go 1.21+, aucune dépendance externe)
- Format JSON en production, format lisible en développement
- Niveaux : `INFO` actions utilisateur, `WARN` anomalies non critiques, `ERROR` erreurs bloquantes
- **Jamais logger** : mots de passe, tokens, données personnelles sensibles

### Tests
- Backend Go : tests unitaires sur la couche `service/` uniquement, avec le package `testing` standard
- Frontend : pas de tests en V1 sauf sur les fonctions utilitaires critiques dans `lib/`
- Claude ne génère pas de fichiers de test sans demande explicite du développeur

### Git
- Branches : `feature/nom-feature`, `fix/nom-bug`, `chore/tâche`
- **Commits en français**, format conventionnel :
  - `feat:` nouvelle fonctionnalité
  - `fix:` correction de bug
  - `chore:` tâche technique (config, dépendances)
  - `refactor:` refactoring sans changement de comportement
  - `docs:` documentation uniquement
- **Aucun commit sans validation explicite du développeur** — Claude prépare le message et attend le feu vert
- Exemple : `git commit -m "feat: ajout du formulaire de réservation de salle"`

---

## SÉCURITÉ

### Protection anti-bot des formulaires
- **hCaptcha** sur le formulaire d'inscription (`/register`) — pas Google reCAPTCHA
- **Honeypot field** sur tous les formulaires publics — champ caché ignoré par les humains, rempli par les bots
- **Délai minimum de soumission** : tout formulaire soumis en moins de 2 secondes est rejeté côté serveur
- **Rate limiting** côté Go sur les routes publiques (`/api/v1/auth/register`, `/api/v1/auth/login`) — max 5 requêtes/minute par IP

### Protection des routes API (Go)
- Middleware JWT obligatoire sur toutes les routes sauf `/api/v1/auth/login` et `/api/v1/auth/register`
- Vérification du rôle dans chaque handler selon le tableau des rôles utilisateurs
- Token d'accès : expiration 24h — Refresh token : expiration 7 jours

### Validation et sanitisation (Go)
- **go-playground/validator** pour valider tous les inputs entrants
- Sanitisation systématique des champs texte libres avant insertion en base
- Requêtes PostgreSQL via paramètres préparés pgx uniquement — zéro concaténation SQL

### Headers de sécurité (middleware Go)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=63072000
Content-Security-Policy: default-src 'self'
```
- CORS strict : origines autorisées explicitement définies dans `.env`

---

## VARIABLES D'ENVIRONNEMENT

### `frontend/.env.local`
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:8080
RESEND_API_KEY=
HCAPTCHA_SECRET_KEY=
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=
```

### `backend/.env`
```
PORT=8080
DATABASE_URL=postgresql://user:password@localhost:5432/digicampus
JWT_SECRET=
RESEND_API_KEY=
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW=60
```

### Règle de démarrage
Au démarrage du serveur Go, toutes les variables requises sont vérifiées.
Si une variable manque, le serveur refuse de démarrer avec un message d'erreur explicite.
Librairie : **godotenv** pour charger le fichier `.env`.

---

## HORS PÉRIMÈTRE V1

Ne jamais implémenter dans cette version :
- Application mobile native
- Intégration Google Calendar / Outlook
- Facturation et gestion contractuelle
- Gestion multi-sites
- Contrôle d'accès physique

---

## PLAN DE DÉVELOPPEMENT PAR ÉTAPES

Chaque étape doit être **complètement terminée et validée** avant de passer à la suivante.
Claude coche ✅ uniquement après confirmation explicite du développeur.

---

### ÉTAPE 0 — Initialisation du projet
**Objectif** : Repo propre, structure monorepo en place, environnement prêt.

- [ ] Nettoyage du repo existant
- [ ] Création de la structure des dossiers `frontend/` et `backend/`
- [ ] Initialisation Next.js dans `frontend/`
- [ ] Initialisation du module Go dans `backend/`
- [ ] Création du `.gitignore` racine
- [ ] Création du `README.md`
- [ ] Premier commit `chore: initialisation du monorepo DigiCampus`

---

### ÉTAPE 1 — Base de données & modèle de données
**Objectif** : Schéma PostgreSQL complet, migrations prêtes.

- [ ] Installation et configuration de la connexion PostgreSQL (`pkg/database/`)
- [ ] Configuration godotenv + vérification des variables au démarrage
- [ ] Migration : table `users` (id, email, password_hash, role, department, is_active, created_at)
- [ ] Migration : table `spaces` (id, name, type, capacity, seats, equipment_fixed, is_active)
- [ ] Migration : table `bookings` (id, space_id, user_id, program, start_time, duration, participants, status, is_urgent)
- [ ] Migration : table `equipment` (id, type, name, status, assigned_to, return_date)
- [ ] Migration : table `equipment_requests` (id, equipment_id, user_id, type, mission, location, start_date, end_date, status)
- [ ] Migration : table `presence` (id, user_id, space_id, date, declared_at)
- [ ] Script de seed pour les données de test

---

### ÉTAPE 2 — Authentification & gestion des rôles
**Objectif** : Connexion, session, middleware de rôles fonctionnel.

- [ ] Configuration Auth.js côté frontend (providers, callbacks, session)
- [ ] Middleware Go JWT sur les routes protégées
- [ ] Middleware Go rate limiting sur les routes publiques
- [ ] Middleware Go headers de sécurité
- [ ] Route `POST /api/v1/auth/register` — inscription (compte inactif, honeypot + délai min)
- [ ] Route `POST /api/v1/auth/login` — connexion + génération token
- [ ] Middleware frontend : redirection si non connecté
- [ ] Middleware frontend : redirection si rôle insuffisant
- [ ] Page de connexion (`/login`) — avec hCaptcha
- [ ] Page d'inscription (`/register`) — avec hCaptcha + honeypot
- [ ] Page d'attente de validation (`/pending`)

---

### ÉTAPE 3 — Gestion des comptes (Super Admin)
**Objectif** : Interface super admin pour gérer les utilisateurs.

- [ ] Route `GET /api/v1/users` — liste des utilisateurs
- [ ] Route `PATCH /api/v1/users/:id/activate` — activer un compte
- [ ] Route `PATCH /api/v1/users/:id/role` — changer le rôle
- [ ] Route `PATCH /api/v1/users/:id/department` — attribuer un badge département
- [ ] Route `DELETE /api/v1/users/:id` — désactiver un compte
- [ ] Page super admin : liste des utilisateurs avec filtres
- [ ] Page super admin : formulaire d'édition d'un utilisateur

---

### ÉTAPE 4 — Référentiel des espaces
**Objectif** : CRUD complet des espaces (salles + bureaux).

- [ ] Route `GET /api/v1/spaces` — liste des espaces
- [ ] Route `POST /api/v1/spaces` — créer un espace (admin)
- [ ] Route `PATCH /api/v1/spaces/:id` — modifier un espace (admin)
- [ ] Route `PATCH /api/v1/spaces/:id/deactivate` — désactiver un espace (admin)
- [ ] Page admin : liste des espaces
- [ ] Page admin : formulaire création/édition espace
- [ ] Affichage du badge type (salle de programme / bureau individuel / bureau partagé)

---

### ÉTAPE 5 — Tableau de bord & vue d'accueil
**Objectif** : Vue planning du campus pour une journée donnée.

- [ ] Route `GET /api/v1/spaces/occupancy?date=` — occupation de tous les espaces pour un jour
- [ ] Composant grille horaire des salles (orange=occupé, bleu=en attente, vert=libre, rouge=suroccupé)
- [ ] Composant vue bureaux staff avec indicateur de présence
- [ ] Sélecteur de date avec navigation
- [ ] Indicateur taux d'occupation global
- [ ] Skeleton loader pendant le chargement des données
- [ ] Clic sur espace → vue hebdomadaire

---

### ÉTAPE 6 — Réservations de salle
**Objectif** : Cycle complet de réservation (demande → validation → affichage).

- [ ] Route `GET /api/v1/spaces/available?date=&duration=&participants=`
- [ ] Route `POST /api/v1/bookings` — soumettre une demande
- [ ] Route `GET /api/v1/bookings` — liste des demandes
- [ ] Route `PATCH /api/v1/bookings/:id/validate` — valider (admin)
- [ ] Route `PATCH /api/v1/bookings/:id/refuse` — refuser avec commentaire (admin)
- [ ] Route `PATCH /api/v1/bookings/:id/cancel` — annuler
- [ ] Route `POST /api/v1/bookings/urgent` — demande urgente
- [ ] Page collaborateur : formulaire de demande (React Hook Form + Zod)
- [ ] Page collaborateur : liste de mes demandes
- [ ] Page admin : tableau de bord des demandes en attente
- [ ] Vue hebdomadaire d'un espace

---

### ÉTAPE 7 — Affectation directe & récurrence
**Objectif** : L'admin peut affecter une salle en dehors du processus de demande.

- [ ] Route `POST /api/v1/bookings/direct` — affectation directe (admin)
- [ ] Route `POST /api/v1/bookings/recurring` — réservation récurrente
- [ ] Interface admin : formulaire d'affectation directe
- [ ] Gestion des rappels de créneau (affectations directes uniquement)

---

### ÉTAPE 8 — Module de présence staff
**Objectif** : Déclaration et suivi des présences dans les bureaux partagés.

- [ ] Route `POST /api/v1/presence` — déclarer ses jours de présence
- [ ] Route `GET /api/v1/presence?space_id=&week=` — présences d'un bureau sur une semaine
- [ ] Route `PATCH /api/v1/presence/:id` — modifier une déclaration
- [ ] Calcul automatique : présents déclarés vs places assises
- [ ] Déclenchement alerte suroccupation
- [ ] Page collaborateur : déclaration hebdomadaire de présence
- [ ] Page admin : vue des présences par bureau

---

### ÉTAPE 9 — Gestion du matériel IT
**Objectif** : Parc informatique, demandes internes et locations externes.

- [ ] Route `GET /api/v1/equipment` — liste du parc IT
- [ ] Route `POST /api/v1/equipment` — ajouter un ordinateur (admin)
- [ ] Route `PATCH /api/v1/equipment/:id` — modifier l'état d'un ordinateur
- [ ] Route `POST /api/v1/equipment/requests` — demande interne (mission)
- [ ] Route `POST /api/v1/equipment/rentals` — location externe (client)
- [ ] Route `GET /api/v1/equipment/requests` — liste des demandes IT
- [ ] Route `PATCH /api/v1/equipment/requests/:id/validate` — valider (admin IT)
- [ ] Route `PATCH /api/v1/equipment/requests/:id/refuse` — refuser (admin IT)
- [ ] Route `PATCH /api/v1/equipment/rentals/:id/close` — clôturer une location
- [ ] Page collaborateur : formulaire demande IT mission (React Hook Form + Zod)
- [ ] Page collaborateur : formulaire location externe client
- [ ] Page admin IT : tableau de bord des demandes en attente
- [ ] Page admin IT : suivi du parc (statuts en temps réel)
- [ ] Alerte retour matériel non clôturé à l'échéance

---

### ÉTAPE 10 — Notifications (Resend)
**Objectif** : Envoi des emails transactionnels pour chaque événement clé.

- [ ] Configuration Resend (`pkg/mailer/`)
- [ ] Email : demande de salle validée
- [ ] Email : demande de salle refusée
- [ ] Email : compte activé
- [ ] Email : réaffectation de salle (urgence)
- [ ] Email : rappel de créneau (affectation directe)
- [ ] Email : alerte suroccupation bureau
- [ ] Email : demande IT validée / refusée
- [ ] Email : alerte retour matériel non clôturé
- [ ] Notifications in-app Sonner pour chacun de ces événements

---

### ÉTAPE 11 — Reporting & export
**Objectif** : Tableaux de bord mensuels et export CSV.

- [ ] Route `GET /api/v1/reports/occupancy?month=`
- [ ] Route `GET /api/v1/reports/presence?month=`
- [ ] Route `GET /api/v1/reports/equipment?month=`
- [ ] Route `GET /api/v1/reports/export?month=&type=`
- [ ] Page reporting : graphiques Recharts et indicateurs mensuels
- [ ] Bouton export CSV

---

### ÉTAPE 12 — Finalisation & déploiement
**Objectif** : Application prête pour la mise en production sur VPS.

- [ ] Création du `Dockerfile` frontend
- [ ] Création du `Dockerfile` backend
- [ ] Création du `docker-compose.yml` (frontend + backend + PostgreSQL)
- [ ] Variables d'environnement de production
- [ ] Tests de smoke sur toutes les fonctionnalités
- [ ] Documentation déploiement dans `README.md`

---

## ÉTAT ACTUEL DU PROJET

```
Étape en cours  : ÉTAPE 0 — Initialisation
Dernière action : —
Prochaine action : Attente des instructions du développeur
```