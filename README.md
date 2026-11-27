# M.I.O.R Academy — React + Node.js + MySQL

Nouvelle version du site du centre de formation **M.I.O.R Academy**.
L'ancienne version PHP se trouve dans `C:\xampp\htdocs\centre_formation` et n'est pas modifiée.

```
mior-academy-react/
├── database/
│   ├── schema.sql            ← crée la base mior_academy (tables corrigées + clés étrangères)
│   └── migrate_from_old.sql  ← copie les données de l'ancienne base centre_de_formation
├── backend/                  ← API REST Node.js + Express (port 3000)
│   ├── src/routes/           auth, formations, sessions, inscriptions, admin, formateur,
│   │                         attestations, messages, alertes
│   ├── src/services/         PDF + QR code des attestations, participants d'une session
│   ├── scripts/seed.js       données de démo pour une base vide
│   └── .env.example
└── frontend/                 ← React + Vite (port 5173)
    └── src/pages/            pages publiques, espace participant, formateur/, admin/
```

## Installation

Prérequis : Node.js 18+ et MySQL (celui de XAMPP suffit).

### 1. Base de données
Dans un terminal (ou via l'onglet SQL de phpMyAdmin) :

```bash
C:\xampp\mysql\bin\mysql.exe -u root < database/schema.sql
```

Puis **au choix** :
- reprendre les données de l'ancien site :
  ```bash
  C:\xampp\mysql\bin\mysql.exe -u root < database/migrate_from_old.sql
  ```
- ou des données de démo (base vide) : `npm run seed` dans `backend/` (comptes `admin@`, `formateur@`, `participant@mioracademy.tn`, mot de passe `demo1234`).

### 2. Backend
```bash
cd backend
copy .env.example .env      # puis mettre une valeur longue et aléatoire dans JWT_SECRET
npm install
npm run dev
```
Vérification : http://localhost:3000/health doit répondre `{"status":"UP","database":"UP"}`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Ouvrir http://localhost:5173

## API

| Méthode | Route | Accès |
|---|---|---|
| GET | `/health`, `/version` | public |
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/api/auth/me` | connecté |
| GET | `/api/formations?q=&departement=&categorie=` | public |
| GET | `/api/formations/categories` | public |
| GET | `/api/formations/:id` | public |
| GET | `/api/sessions/disponibles` | public |
| GET | `/api/sessions/:id` | public |
| GET | `/api/dashboard` | connecté (statistiques selon le rôle) |
| GET / PUT | `/api/profile` | connecté |
| PUT | `/api/profile/password` | connecté |
| GET | `/api/inscriptions/mes` | participant |
| POST | `/api/inscriptions` | participant |
| DELETE | `/api/inscriptions/:id` | participant (inscription en attente) |
| GET | `/api/attestations/verifier/:code` | public (lien du QR code) |
| GET | `/api/attestations/mes`, `/api/attestations/:id/pdf` | connecté (le bénéficiaire, ou un admin pour le PDF) |
| GET / POST | `/api/messages/conversations`, `/api/messages/conversations/:id/messages` | participant, formateur |
| GET | `/api/messages/contacts`, `/api/messages/non-lus` | participant / participant, formateur |
| GET / PATCH | `/api/alertes`, `/api/alertes/:id/lue`, `/api/alertes/lire-tout` | participant |

**Administration (`/api/admin/*`, rôle admin uniquement) :** formations, formateurs (+ affectation
aux formations), sessions, groupes, inscriptions (confirmer / refuser / paiement), comptes (activer / désactiver),
suivi des présences et alertes, attestations (générer / télécharger / révoquer).
Règles de planification d'une session : spécialité du formateur = département de la formation,
formateur disponible ce jour-là sur ce créneau, pas de chevauchement pour le formateur ni pour la salle.

**Espace formateur (`/api/formateur/*`) :** mes formations, mes sessions, annulation d'une session
planifiée (elle passe « Annulée », elle n'est plus supprimée), disponibilités (pas de chevauchement),
appel le jour de la session à partir de l'heure de début (présent / retard / absent / excusé).
Un participant absent à 3 sessions consécutives reçoit automatiquement une alerte d'absence.
Si la base existait avant cette version :
`ALTER TABLE presences MODIFY statut_presence ENUM('present','absent','retard','excuse') NOT NULL;`

**Attestations :** générées par l'admin pour une session terminée et non annulée : une pour le formateur
et une par participant dont l'inscription est confirmée et payée (totalement ou avance), comme dans l'ancien site.
Le PDF (A4 paysage) est créé par le serveur (pdfkit) avec un QR code généré localement (qrcode) qui pointe vers
`CLIENT_URL/verifier/<code>`. La page publique de vérification n'affiche que ce qui est imprimé sur l'attestation.
Pour que le QR code fonctionne depuis un téléphone, mettre dans `CLIENT_URL` une adresse joignable (IP locale, domaine…).
Les attestations de l'ancien site restent valides (même code).

**Messagerie :** un participant peut écrire aux formateurs des sessions où il est inscrit (inscription non refusée) ;
le formateur répond. Nouveaux messages récupérés toutes les 4 s, compteur de non-lus dans le menu.
Les pièces jointes de l'ancien site ne sont pas reprises (signalées dans la conversation).

**Paiement :** modes carte bancaire (**simulation**), virement, espèces au centre et chèque.
Le formulaire de carte est une interface de démonstration : les données de carte restent dans le
navigateur, ne sont jamais envoyées à l'API ni enregistrées ; le serveur génère une référence `SIM-…`.
Carte de test : `4242 4242 4242 4242`, une date future, n'importe quel CVV à 3 chiffres. L'inscription reste « en attente » jusqu'à sa confirmation par l'administration
(les places restantes diminuent à la confirmation, comme dans l'ancien site).

L'authentification utilise un token JWT envoyé dans l'en-tête `Authorization: Bearer <token>`.
Les mots de passe hachés par l'ancien site PHP (`$2y$…`) fonctionnent directement ;
les anciens mots de passe stockés en clair sont acceptés une fois puis hachés automatiquement.

## Avancement

- [x] Phase 1 — base, authentification (3 rôles), layout, accueil
- [x] Phase 2 — catalogue des formations, filtres, détail, sessions à venir
- [x] Phase 3 — participant : sessions disponibles, inscription + paiement, mes inscriptions, profil
- [x] Phase 4 — admin : gestion formations, formateurs, sessions, groupes, inscriptions, comptes
- [x] Phase 5 — formateur : sessions (+ annulation), disponibilités, appel / présences, alertes d'absence
- [x] Phase 6 — attestations PDF + QR code + vérification, messagerie, alertes d'absence, suivi des présences (admin)
## CI : Build et Smoke sur Pull Request via Jenkins
Pipeline PR : Checkout, Setup, Build, Run, Smoke Test, Archive
