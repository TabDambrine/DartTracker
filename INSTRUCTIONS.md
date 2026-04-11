# Dart Stats Tracker - Instructions Projet

## Objectif
Créer une Progressive Web App (PWA) pour tracker les statistiques de jeux de fléchettes (darts). L'application doit fonctionner offline, sans dépendances externes, avec stockage via localStorage.

## Jeux Supportés
- **501**: Commencer à 501 points, descendre à 0 exactement avec un double final
- **301**: Commencer à 301 points, descendre à 0 exactement avec un double final

## Architecture

### Structure des Fichiers
```
dart-stats-tracker/
├── index.html           # Point d'entrée, PWA manifest
├── css/
│   └── styles.css       # Tous les styles (vanilla CSS)
├── js/
│   ├── app.js          # Initialisation et orchestration
│   ├── storage.js      # Gestion du localStorage
│   ├── players.js      # Gestion des joueurs
│   ├── games.js        # Logique des jeux (501, 301)
│   ├── ui.js           # Gestion de l'interface utilisateur
│   └── rules.js        # Règles des jeux
├── manifest.json        # PWA manifest
└── service-worker.js    # Service worker pour offline
```

## Modèle de Données

### Joueur (Player)
```javascript
{
  id: string (uuid),
  name: string,
  created: number (timestamp),
  stats: {
    totalMatches: number,
    wins: number,
    losses: number,
    averageScore: number
  }
}
```

### Match (Match)
```javascript
{
  id: string (uuid),
  playerIds: [string, string], // 2 joueurs
  gameType: "501" | "301",
  startDate: number (timestamp),
  endDate: number (timestamp),
  winner: string (playerId),
  throws: [
    {
      playerIndex: 0 | 1,
      round: number,
      throw: [number, number, number], // 3 fléchettes par volée
      scores: [number, number, number],
      roundTotal: number,
      runningTotal: number,
      isValid: boolean,
      reason?: string // raison si invalide
    }
  ]
}
```

## Règles Implémentées

### 501
- Commence à 501 points
- Les joueurs alternent par volée (3 fléchettes)
- Doit finir exactement à 0 avec un double (2x, 3x, 4x, 5x, 6x, 7x, 8x, 9x, 10x, 11x, 12x, 15x, 16x, 17x, 18x, 19x, 20x, 25x)
- Si dépasse 0 ou finit sans double, la volée est annulée

### 301
- Identique au 501 mais commence à 301 points

## Fonctionnalités Principales

### 1. Gestion des Joueurs
- ✅ Créer un joueur
- ✅ Lister les joueurs
- ✅ Supprimer un joueur
- ✅ Afficher les stats d'un joueur

### 2. Gestion des Matchs
- ✅ Créer un nouveau match (select 2 joueurs, choisir le jeu)
- ✅ Enregistrer les volées
- ✅ Valider les règles en temps réel
- ✅ Afficher le score en direct
- ✅ Terminer un match
- ✅ Historique des matchs

### 3. Validation des Règles
- ✅ Vérifier que le score ne dépasse pas 0
- ✅ Vérifier le double final
- ✅ Annuler une volée invalide
- ✅ Afficher les raisons d'invalidité

## Technologie Stack
- **Frontend**: HTML5, CSS3, JavaScript Vanilla (ES6+)
- **Stockage**: localStorage + JSON
- **Offline**: Service Worker
- **PWA**: Manifest.json

## Points d'Entrée

### localStorage Keys
```
players              // array of all players
matches              // array of all matches
appVersion          // version de l'app
```

## Points Clés de Implémentation

1. **Pas de dépendances externes** - tout vanilla JS/CSS/HTML
2. **Modularité** - chaque fichier JS a une responsabilité unique
3. **localStorage au cœur** - toutes les données persistées
4. **Validation côté client** - règles appliquées immédiatement
5. **Responsive Design** - fonctionne sur mobile/tablet/desktop
6. **Offline-first** - service worker pour cache

## Flux Utilisateur Typique

1. Créer 2 joueurs
2. Lancer un match entre les 2
3. Choisir le type de jeu (501/301)
4. Pour chaque volée:
   - Entrer les 3 scores de fléchettes
   - Valider (vérification automatique des règles)
   - Passer au joueur suivant
5. Quand quelqu'un atteint 0 exactement avec double:
   - Le match s'arrête
   - Le gagnant est enregistré
   - Les stats des joueurs sont mises à jour

## État Global (in-memory)
- currentMatch: Match en cours ou null
- currentPlayer: index du joueur actuel (0 ou 1)
- players: liste des joueurs
- matches: liste des matchs terminés

## Conventions de Code

- **Nommage**: camelCase pour variables/fonctions
- **Fonctions pures**: éviter les effects quand possible
- **DOM**: manipuler avec vanilla methods (getElementById, querySelector, etc.)
- **Events**: utiliser addEventListener sans dépendances
- **Données**: JSON stringified dans localStorage

## TODO Initial
- [ ] Structure HTML de base + PWA setup
- [ ] Service Worker pour offline
- [ ] CSS responsive vanilla
- [ ] Module Storage (CRUD localStorage)
- [ ] Module Players (gestion joueurs)
- [ ] Module Rules (validation des règles 501/301)
- [ ] Module Games (logique matchs)
- [ ] Module UI (interactions utilisateur)
- [ ] Module App (orchestration)
- [ ] Tests manuels sur mobile
