# Jeu de Soirée

Jeu interactif en temps réel pour vos soirées avec React, Vite, TypeScript, PartyKit et Tailwind CSS.

## Stack Technique

- **React + Vite + TypeScript** — Frontend
- **Tailwind CSS** — Style
- **vite-plugin-pwa** — PWA installable
- **PartyKit** — Temps réel éphémère via WebSocket
- **Zustand** — State management local
- **React Router** — Routing

## Développement Local

### Prérequis

- Node.js 18+
- npm ou yarn

### Installation

```bash
npm install
```

### Variables d'environnement

Créez un fichier `.env.local` :

```env
VITE_PARTYKIT_HOST=localhost:1999
```

### Lancer PartyKit (backend)

```bash
npx partykit dev
```

### Lancer le frontend

```bash
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## Déploiement sur Vercel

### 1. Déployer PartyKit

```bash
npx partykit deploy
```

Notez l'URL de votre serveur PartyKit (ex: `https://votre-projet.partkit.dev`)

### 2. Configurer Vercel

1. Poussez votre code sur GitHub
2. Importez le projet sur [Vercel](https://vercel.com)
3. Dans les settings du projet, ajoutez la variable d'environnement :
   - `VITE_PARTYKIT_HOST` = votre URL PartyKit (sans `https://`, ex: `votre-projet.partkit.dev`)
4. Déployez

### 3. Structure du projet

```
src/
├── pages/
│   ├── Landing.tsx          # Page d'accueil avec code équipe
│   ├── TeamView.tsx         # Vue joueur
│   ├── Finale.tsx           # Finale commune
│   ├── Results.tsx          # Podium et résultats
│   └── admin/
│       ├── AdminLogin.tsx   # Login admin
│       ├── AdminDashboard.tsx # Dashboard live
│       └── AdminSetup.tsx   # Formulaire setup
├── store/
│   └── gameStore.ts         # Zustand store + WebSocket
├── partykit/
│   └── server.ts           # Serveur PartyKit
├── types/
│   └── game.ts              # Types TypeScript
└── App.tsx                  # Routing
```

## Fonctionnalités

- **Système de code équipe** : Chaque équipe rejoint avec un code 4 chiffres
- **Validation en temps réel** : Les codes sont validés instantanément via WebSocket
- **Timer synchronisé** : Calcul local pour éviter les désynchronisations
- **Indicateur de connexion** : Vert/rouge selon l'état WebSocket
- **Génération d'indices** : Templates locaux (anagrammes, charades, devinettes, etc.)
- **Dashboard admin** : Gestion du timer, des équipes et des messages globaux
- **PWA** : Installable sur l'écran d'accueil
- **Sauvegarde locale** : Récupération en cas de crash

## License

MIT
