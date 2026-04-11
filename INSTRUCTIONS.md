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
│   ├── rules.js        # Règles des jeux
│   ├── stats.js        # Calcul des statistiques détaillées
│   └── ui.js           # Gestion de l'interface utilisateur
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
    // Stats basiques
    totalMatches: number,
    wins: number,
    losses: number,

    // Stats détaillées des volées
    averageRoundScore: number,  // moyenne des points par volée (sur toutes les volées valides)

    // Stats de finish (finition)
    finishDoubleSuccessRate: number,  // % de réussite : finir sur la première fléchette de la volée de finish
    bestFinishingScore: number,  // meilleur score avec lequel le joueur a fini une partie

    // Frappe préférée (top throws)
    topThrows: [
      {
        segment: number,      // 1-20, 25 (BULL)
        multiplier: number,   // 1 (simple), 2 (double), 3 (triple)
        count: number,        // nombre de fois lancée
        percentage: number    // % par rapport à toutes les fléchettes du joueur
      }
    ],  // array trié par fréquence, max 10 éléments

    // Double préféré pour finish
    preferredFinishingDouble: {
      segment: number,      // 1-20, 25 (BULL)
      multiplier: 2,        // toujours 2 (double)
      count: number,        // nombre de fois utilisé pour finir
      percentage: number    // % parmi tous les finish doubles
    } // null si aucun finish réalisé
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
      throw: [
        // 3 fléchettes par volée avec détails segment/multiplicateur
        { segment: 20, multiplier: 1, score: 20 }, // Simple 20
        { segment: 5, multiplier: 2, score: 10 },  // Double 5
        { segment: 15, multiplier: 3, score: 45 }  // Triple 15
      ],
      scores: [20, 10, 45],
      roundTotal: 75,
      runningTotal: number,
      isValid: boolean,  // true = volée valide et comptée, false = erreur du joueur
      reason?: string,   // raison si invalide (ex: "Dépassement : score négatif")
      timestamp: number
    }
  ]
}
```

**Important**: Les volées invalides (`isValid: false`) sont enregistrées dans l'historique pour tracker les erreurs du joueur, mais elles ne modifient PAS le score global.

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
- ✅ Enregistrer les volées avec saisie précise (segment + multiplicateur)
- ✅ Valider les règles en temps réel
- ✅ Afficher le score en direct
- ✅ Terminer un match
- ✅ Historique des matchs

### 3. Saisie des Fléchettes
- ✅ Sélectionner le segment (MISS, 1-20, BULL 25, BULL 50)
- ✅ Sélectionner le multiplicateur (simple 1×, double 2×, triple 3×)
- ✅ Fléchette hors cible : MISS (0 points, ne compte pas comme double)
- ✅ Affichage immédiat du score calculé
- ✅ Visualisation de la volée en cours

### 4. Validation des Règles
- ✅ Vérifier que le score ne dépasse pas 0
- ✅ Vérifier le double final (validation stricte du multiplicateur)
- ✅ **Enregistrement des volées invalides** : sans pénalité au score
- ✅ Afficher les raisons d'invalidité (❌ dans l'historique)

### 5. Statistiques Détaillées des Joueurs
- ✅ **Moyenne des volées** : moyenne des points marqués par volée valide
- ✅ **Taux de réussite au double** : % de fois où le joueur finit une partie sur la première fléchette de sa volée finale (fléchette double de finish)
- ✅ **Top frappe préférée** : top 10 des combinaisons (segment + multiplicateur) lancées, triées par fréquence avec % d'utilisation
- ✅ **Meilleur score de finish** : le score le plus élevé avec lequel le joueur a remporté une partie
- ✅ **Double préféré** : le double (multiplicateur 2×) le plus fréquemment utilisé pour finir une partie, avec count et %

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

## Calcul des Statistiques Détaillées

### Moyenne des Volées (averageRoundScore)
- Calculée sur **tous les matchs** du joueur
- Inclut **uniquement les volées valides** (`isValid: true`)
- Formule: somme de tous les `roundTotal` / nombre de volées valides
- Mis à jour automatiquement après chaque match

### Taux de Réussite au Double (finishDoubleSuccessRate)
- Compte les **matchs remportés** où le joueur a utilisé un double pour la finition
- Inclut les cas où le joueur finit **sur la première fléchette** de sa dernière volée (reste < 3 fléchettes)
- Formule: matchs terminés au double en 1ère fléchette / total des matchs remportés × 100
- Valeur: 0-100 (%)

### Top Frappe Préférée (topThrows)
- Collecte **toutes les fléchettes lancées** dans tous les matchs du joueur
- Filtre les fléchettes **hors MISS** (segment + multiplicateur valides)
- Groupe par combinaison (segment, multiplier)
- Calcule le pourcentage: count / total des fléchettes lancées × 100
- Tri: décroissant par count
- Limite: max 10 entrées
- Mis à jour après chaque match

### Meilleur Score de Finish (bestFinishingScore)
- **Score le plus élevé de la volée finale avec laquelle le joueur a remporté une partie**
- Exemple: si le joueur termine 3 matchs respectivement en finissant avec 45, 100, et 20 points, bestFinishingScore = 100
- La volée finale = celle où `runningTotal === 0` et `isValid === true`
- Valeur: 0 si aucun match remporté
- Mis à jour après chaque match remporté

### Double Préféré pour Finish (preferredFinishingDouble)
- Collecte les doubles (multiplier === 2) utilisés pour **finir les matchs gagnés**
- La dernière fléchette lancée doit être un double (multiplicateur 2×)
- Groupe par segment (1-20, 25)
- Sélectionne le double avec le count le plus élevé
- Null si aucun match remporté avec finish double

## Points Clés de Implémentation

1. **Pas de dépendances externes** - tout vanilla JS/CSS/HTML
2. **Modularité** - chaque fichier JS a une responsabilité unique
3. **localStorage au cœur** - toutes les données persistées
4. **Validation côté client** - règles appliquées immédiatement
5. **Responsive Design** - fonctionne sur mobile/tablet/desktop
6. **Offline-first** - service worker pour cache

## ⚠️ Notes de Développement

### Pas de Build/Compilation
- Ce projet est une **PWA web vanilla**, pas une application à compiler
- Fonctionne directement dans le navigateur (`file://` ou serveur HTTP/HTTPS)
- Aucun bundler, webpack, ou étape de build nécessaire
- Les fichiers JS sont chargés en ordre dans `index.html`

### Documentation
- Ne pas créer de fichier `.md` pour chaque modification/feature
- Documenter les changements **majeurs** seulement dans des fichiers `.md` spécifiques
- Commenter le code directement pour les détails techniques
- Fichiers `.md` existants suffisent: `README.md`, `INSTRUCTIONS.md`, `DELETION_STRATEGY.md`, `ORPHAN_CLEANUP.md`

## Flux Utilisateur Typique

1. Créer 2 joueurs
2. Lancer un match entre les 2
3. Choisir le type de jeu (501/301)
4. Pour chaque volée:
   - Entrer les 3 scores de fléchettes (segment + multiplicateur)
   - Valider (vérification automatique des règles)
   - **Si invalide** : proposer "Valider quand même" (enregistrer comme erreur) ou "Corriger"
   - **Si valide** : passer au joueur suivant
5. Quand quelqu'un atteint 0 exactement avec double:
   - Le match s'arrête
   - Le gagnant est enregistré
   - Les stats des joueurs sont mises à jour
   - L'historique affiche les volées valides ET invalides (marquées ❌)

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

## Affichage des Statistiques

La page de détail d'un joueur doit afficher:

### Vue Synthétique
```
Nom: [Joueur]
Matchs: X (Y wins, Z losses)
Moyenne par volée: XX.X points
Taux de finish au double: XX%
```

### Détails Avancés
```
🎯 Meilleur score de finish: 100 points (volée finale la plus haute)

📊 Top 5 Coups Préférés:
  1. Triple 20 - 127 fois (12.5%)
  2. Triple 19 - 98 fois (9.6%)
  3. Double 20 - 87 fois (8.5%)
  4. Single 20 - 45 fois (4.4%)
  5. Triple 15 - 42 fois (4.1%)

🎯 Double Préféré pour Finish:
  Double 20 - 8 utilisations (42% de tous les finishs)
```

### Calcul Récursif
Les statistiques doivent être **recalculées à chaque fin de match**:
1. Parcourir tous les matches du joueur
2. Extraire et agréger les données
3. Mettre à jour l'objet `stats` du joueur
4. Persister dans localStorage

Les statistiques sont **en lecture seule** pour l'utilisateur (pas d'édition manuelle).
