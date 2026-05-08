# DartTracker - Instructions pour Agents IA

**Dernière mise à jour** : 2025-05-08  
**Version** : 2.0  
**Projet** : [TabDambrine/DartTracker](https://github.com/TabDambrine/DartTracker)

---

## 📌 Contexte du Projet

**DartTracker** est une **Progressive Web App (PWA)** développée en **vanilla JavaScript/HTML/CSS** (sans frameworks) pour tracker les statistiques de jeux de fléchettes (darts). L'application permet de :

- Jouer des matchs en **501** ou **301**
- Enregistrer les volées de fléchettes (3 darts par tour)
- Calculer des **statistiques détaillées** par joueur
- Jouer contre un **adversaire virtuel (Ghost)** basé sur les stats d'un joueur réel
- Fonctionner **hors ligne** (offline-first via Service Worker)
- Exporter/Importer les données en JSON

---

## 🎯 Objectif pour les Agents IA

En tant qu'agent IA (Mistral Vibe Code, GitHub Copilot, Codex, etc.), votre rôle est d'aider à :

1. **Comprendre le code existant** (architecture, patterns, conventions)
2. **Implémenter de nouvelles fonctionnalités** en respectant les conventions du projet
3. **Corriger des bugs** sans casser l'existant
4. **Améliorer les performances** ou l'UX
5. **Documenter le code** de manière claire et concise

---

## 🏗️ Architecture du Projet

### Structure des Fichiers

```
dart-stats-tracker/
├── index.html              # Point d'entrée principal (PWA)
├── manifest.json           # Configuration PWA
├── service-worker.js       # Gestion du cache et offline
├── README.md               # Documentation utilisateur
├── ghost.md                # Documentation technique du mode Ghost
├── INSTRUCTIONS_AI.md      # Ce fichier (instructions pour IA)
├── css/
│   ├── variables.css       # Variables CSS globales
│   ├── layout.css          # Structure de base
│   ├── components.css      # Composants UI réutilisables
│   ├── players.css         # Styles pour la gestion des joueurs
│   ├── game.css            # Styles pour les matchs
│   ├── throws.css          # Styles pour la saisie des lancers
│   ├── matches.css         # Styles pour l'historique des matchs
│   ├── stats.css           # Styles pour les statistiques
│   ├── utils.css           # Classes utilitaires
│   └── responsive.css      # Media queries (mobile/desktop)
└── js/
    ├── app.js              # Orchestration principale (initialisation, routage)
    ├── storage.js          # Wrapper pour localStorage
    ├── players.js          # Gestion des joueurs (CRUD)
    ├── games.js            # Logique des matchs (création, tours, fin de match)
    ├── ghost.js            # Système Ghost (adversaire virtuel)
    ├── rules.js            # Validation des règles des jeux
    ├── stats.js            # Calcul des statistiques
    ├── finishes.js         # Gestion des combinaisons de finition
    ├── throws-input.js     # Saisie et validation des lancers
    ├── export.js           # Export/Import des données (JSON)
    └── ui.js               # Gestion de l'interface utilisateur
```

---

## 📦 Modèle de Données

### 1. Joueur (`Player`)

```javascript
{
  id: string,              // UUID généré par Storage.generateId()
  name: string,            // Nom du joueur (ex: "Alice")
  created: number,          // Timestamp de création
  stats: {
    // Stats globales
    totalMatches: number,   // Nombre total de matchs joués
    wins: number,           // Nombre de victoires
    losses: number,         // Nombre de défaites
    
    // Stats par volée
    averageRoundScore: number,  // Moyenne de points par volée valide (défaut: 0)
    totalRounds: number,        // Nombre total de volées valides
    totalRoundScore: number,    // Somme de tous les points des volées valides
    
    // Stats de finition (finish)
    finishDoubleSuccessRate: number,  // % de réussite des doubles de finition (0-100)
    bestFinishingScore: number,        // Meilleur score de finition (défaut: 0)
    
    // Top 10 des lancers préférés
    topThrows: [
      {
        segment: number,      // 1-20, 25 (BULL), 0 (BULL 50)
        multiplier: number,   // 1 (Simple), 2 (Double), 3 (Triple)
        count: number,        // Nombre de fois lancé
        percentage: number    // % par rapport à tous les lancers du joueur
      }
    ],
    
    // Double préféré pour finir
    preferredFinishingDouble: {
      segment: number,      // 1-20, 25
      multiplier: 2,        // Toujours 2 (Double)
      count: number,        // Nombre de fois utilisé pour finir
      percentage: number    // % parmi tous les finishs
    } | null
  },
  trainingStats: {         // Statistiques d'entraînement (même structure que stats)
    byGameType: {
      "501": { /* stats pour 501 */ },
      "301": { /* stats pour 301 */ }
    }
  }
}
```

### 2. Match (`Match`)

```javascript
{
  id: string,              // UUID
  playerIds: [string, string], // IDs des 2 joueurs (ou ['playerId', 'ghost'])
  mode: "competition" | "training" | "ghost", // Mode de jeu
  isGhost: boolean,        // true si mode Ghost
  ghostProfilePlayerId: string | null,  // ID du joueur utilisé pour le Ghost
  ghostProfileName: string | null,    // Nom du joueur Ghost
  ghostProfileSnapshot: object | null, // Copie des stats du joueur au moment du match
  gameType: "501" | "301", // Type de jeu
  roundLimit: number | null, // Limite de tours (optionnel)
  startDate: number,       // Timestamp de début
  endDate: number | null, // Timestamp de fin (null si en cours)
  winner: string | null,  // ID du gagnant (ou 'ghost' si le Ghost gagne)
  currentRound: number,    // Tour actuel (1-based)
  currentPlayerIndex: 0 | 1, // Index du joueur actuel (0 ou 1)
  isDNF: boolean,          // true si match abandonné
  scores: [number, number], // Scores actuels des 2 joueurs
  throws: [               // Historique des volées
    {
      id: string,          // UUID
      playerIndex: 0 | 1,  // Index du joueur
      round: number,       // Numéro du tour
      throw: [             // 3 fléchettes (toujours un tableau de 3)
        { segment: number, multiplier: number }, // Ex: {segment: 20, multiplier: 3}
        { segment: number, multiplier: number },
        { segment: number, multiplier: number }
      ],
      scores: [number, number, number], // Scores calculés pour chaque fléchette
      roundTotal: number,  // Somme des scores de la volée
      runningTotal: number, // Score restant après cette volée
      isValid: boolean,    // true si volée valide (respecte les règles)
      isSimulated: boolean, // true si volée générée par le Ghost
      source: "human" | "ghost", // Origine de la volée
      reason: string | null, // Raison si invalide (ex: "Dépassement : score négatif")
      timestamp: number    // Timestamp de la volée
    }
  ]
}
```

### 3. Stockage (`localStorage`)

| Clé | Type | Description |
|-----|------|-------------|
| `players` | `Player[]` | Liste de tous les joueurs |
| `matches` | `Match[]` | Liste de tous les matchs terminés |
| `appVersion` | `string` | Version actuelle de l'app |

---

## 🎮 Règles des Jeux

### Règles communes (501 et 301)

1. **Début du match** :
   - 501 : Chaque joueur commence à **501 points**
   - 301 : Chaque joueur commence à **301 points**

2. **Déroulement** :
   - Les joueurs jouent à tour de rôle
   - Chaque tour = **1 volée de 3 fléchettes** (ou moins si fin de match)
   - Le score de chaque fléchette est soustrait du score total

3. **Fin du match** :
   - Le joueur doit atteindre **exactement 0 points**
   - **La dernière fléchette doit être un double** (multiplicateur = 2 ou segment = 0/50 pour BULL)
   - Si un joueur dépasse 0 ou atteint 0 sans un double → **volée invalide**

4. **Score de 1** :
   - Un score de **1 point restant** est **impossible à finir** (aucun double ne vaut 1 point)
   - Une volée qui laisse 1 point est **invalide**

5. **Fléchettes valides** :
   - **Segments** : `-1` (MISS), `0` (BULL 50), `1-20`, `25` (BULL 25), `50` (BULL 50)
   - **Multiplicateurs** : `1` (Simple), `2` (Double), `3` (Triple)
   - **Règles spéciales** :
     - `segment = -1` (MISS) → toujours `multiplier = 1`, score = 0
     - `segment = 0` ou `50` → toujours `multiplier = 1`, score = 50 (compte comme double)
     - `segment = 25` → toujours `multiplier = 1`, score = 25

### Validation d'une volée

Une volée est **invalide** si :
- Le score total de la volée fait **dépasser 0** (ex: score actuel = 10, volée = 20 → invalide)
- La volée atteint **0 sans un double** en dernière fléchette
- La volée laisse un score de **1** (impossible à finir)

---

## 👻 Système Ghost (Adversaire Virtuel)

Le mode **Ghost** permet de jouer contre un adversaire virtuel basé sur les statistiques d'un joueur réel.

### Fonctionnement

1. **Sélection du profil** :
   - L'utilisateur choisit un joueur existant comme "Ghost"
   - Le système crée un **snapshot** des statistiques du joueur au moment du match

2. **Génération des volées** :
   - Le Ghost utilise `Ghost.playTurn(match)` pour générer une volée
   - Deux modes possibles :
     - **Volée de scoring** : Génère une volée normale pour marquer des points
     - **Tentative de finition** : Tente de finir le match si le score le permet

3. **Décision de finition** (`shouldAttemptFinish`) :
   - Le Ghost tente de finir si :
     - `currentScore ≤ bestFinishingScore` (toujours tente)
     - **OU** `averageRoundScore ≥ 60` **ET** `Math.random() < 0.35` (35% de chance)

4. **Réussite de la finition** (`generateFinishAttempt`) :
   - Sélectionne la meilleure finition avec `Finishes.selectBestFinish()`
   - Taux de réussite : `clamp(finishDoubleSuccessRate / 100, 0.05, 0.7)`
     - Minimum : 5% (même si le joueur a 0% de réussite)
     - Maximum : 70% (même si le joueur a 100% de réussite)
   - Si échec → génère une volée de scoring à la place

5. **Volée de scoring** (`generateSafeScoringTurn`) :
   - Score cible généré avec une **distribution normale** autour de `averageRoundScore`
   - Écart-type : `clamp(averageRoundScore * 0.35, 8, 35)`
   - Trouve une combinaison de fléchettes pour atteindre ce score

### Fichiers impliqués
- `js/ghost.js` : Logique principale du Ghost
- `js/finishes.js` : Calcul des combinaisons de finition
- `js/rules.js` : Validation des règles

---

## 📊 Calcul des Statistiques

Les statistiques sont **recalculées automatiquement** après chaque match terminé.

### 1. Moyenne par volée (`averageRoundScore`)

```javascript
// Formule : somme des points des volées valides / nombre de volées valides
totalRoundScore = somme de tous les `roundTotal` des volées valides
totalRounds = nombre de volées valides (`isValid: true`)
averageRoundScore = totalRoundScore / totalRounds
```

**Exemple** :
- Volée 1 : 60 points (valide)
- Volée 2 : 100 points (valide)
- Volée 3 : 45 points (invalide)
→ `averageRoundScore = (60 + 100) / 2 = 80`

---

### 2. Taux de réussite des doubles de finition (`finishDoubleSuccessRate`)

```javascript
// Formule : (nombre de matchs finis au double en 1ère fléchette / total matchs gagnés) × 100
successfulFinishes = nombre de matchs où le joueur a fini avec un double en 1ère fléchette
totalWins = nombre total de victoires
finishDoubleSuccessRate = (successfulFinishes / totalWins) * 100
```

**Exemple** :
- 10 matchs gagnés
- 3 finis au double en 1ère fléchette
→ `finishDoubleSuccessRate = (3 / 10) * 100 = 30%`

---

### 3. Meilleur score de finition (`bestFinishingScore`)

```javascript
// Score le plus élevé de la volée finale avec laquelle le joueur a gagné un match
bestFinishingScore = max(score avant la volée finale de tous les matchs gagnés)
```

**Exemple** :
- Match 1 : Gagné avec une volée finale de 100 points
- Match 2 : Gagné avec une volée finale de 60 points
- Match 3 : Gagné avec une volée finale de 120 points
→ `bestFinishingScore = 120`

---

### 4. Top 10 des lancers préférés (`topThrows`)

```javascript
// 1. Collecter toutes les fléchettes valides (segment + multiplier) de tous les matchs
// 2. Compter les occurrences de chaque combinaison
// 3. Calculer le pourcentage : (count / totalFléchettes) × 100
// 4. Trier par count (décroissant) et prendre les 10 premières
```

**Exemple** :
```javascript
topThrows: [
  { segment: 20, multiplier: 3, count: 150, percentage: 15.0 }, // Triple 20
  { segment: 20, multiplier: 1, count: 120, percentage: 12.0 }, // Simple 20
  { segment: 16, multiplier: 3, count: 90, percentage: 9.0 },  // Triple 16
  // ...
]
```

---

### 5. Double préféré pour finir (`preferredFinishingDouble`)

```javascript
// 1. Collecter tous les doubles (multiplier = 2) utilisés pour finir un match gagné
// 2. Compter les occurrences par segment
// 3. Sélectionner le double avec le count le plus élevé
// 4. Calculer le pourcentage : (count / totalFinishes) × 100
```

**Exemple** :
```javascript
preferredFinishingDouble: {
  segment: 20,
  multiplier: 2,
  count: 5,        // 5 fois utilisé pour finir
  percentage: 50  // 50% de tous les finishs
}
```

---

## 🛠️ Conventions de Code

### 1. Structure des Modules

- **Pattern IIFE** : Tous les modules JS utilisent le pattern **Immediately Invoked Function Expression** pour encapsuler les variables privées.
  ```javascript
  const ModuleName = (() => {
    // Variables privées
    const privateVar = 'value';
    
    // Fonctions privées
    const privateFunction = () => { ... };
    
    // Fonctions publiques (exposées)
    return {
      publicFunction1,
      publicFunction2
    };
  })();
  ```

- **Nommage** :
  - Variables/fonctions : `camelCase` (ex: `calculateScore`, `currentPlayerIndex`)
  - Constantes : `UPPER_SNAKE_CASE` (ex: `MAX_SCORE`, `DEFAULT_AVERAGE`)
  - Classes CSS : `kebab-case` (ex: `player-card`, `score-display`)

- **Commentaires** :
  - Utiliser des commentaires **JSDoc** pour les fonctions publiques
  - Commentaires en ligne pour les parties complexes
  - Éviter les commentaires évidents (ex: `// Incrémente i`)

### 2. Gestion du DOM

- **Sélecteurs** : Utiliser `document.getElementById()` ou `document.querySelector()`
- **Événements** : Utiliser `addEventListener()` (pas d'attributs `onclick`)
- **Manipulation** :
  - `element.textContent` pour le texte
  - `element.classList.add/remove/toggle` pour les classes
  - `element.dataset` pour les attributs `data-*`

### 3. Gestion des Données

- **localStorage** :
  - Toujours utiliser le module `Storage` pour accéder à localStorage
  - Les données sont **sérialisées en JSON**
  - Exemple :
    ```javascript
    // Sauvegarder
    Storage.savePlayers(players);
    
    // Charger
    const players = Storage.getPlayers();
    ```

- **Immutabilité** :
  - Éviter de modifier directement les objets stockés
  - Toujours **cloner** avant modification :
    ```javascript
    const updatedPlayer = { ...player, name: 'New Name' };
    ```

### 4. Validation

- **Toujours valider** les entrées utilisateur et les données
- Utiliser le module `Rules` pour valider les volées
- Exemple :
  ```javascript
  const validation = Rules.validateRound(gameType, currentScore, throws);
  if (!validation.valid) {
    // Gérer l'erreur
  }
  ```

### 5. Gestion des Erreurs

- **Ne pas utiliser `throw`** pour les erreurs utilisateur (ex: saisie invalide)
- Retourner des objets avec un champ `valid` ou `success` :
  ```javascript
  return {
    success: false,
    reason: "Dépassement : score négatif non autorisé"
  };
  ```

---

## 🚀 Workflow de Développement

### 1. Comprendre la demande

- **Analyser le contexte** : Quel est le problème ou la nouvelle fonctionnalité ?
- **Identifier les fichiers concernés** : Quels modules doivent être modifiés ?
- **Vérifier les dépendances** : Quelles fonctions/variables sont utilisées ailleurs ?

### 2. Explorer le code existant

- **Lire les fichiers concernés** avant toute modification
- **Rechercher les usages** d'une fonction/variable avec `grep` ou l'IDE
- **Comprendre les conventions** du projet (nommage, structure, etc.)

### 3. Planifier les modifications

- **Pour les bugs** :
  1. Reproduire le bug
  2. Identifier la cause racine
  3. Proposer une solution minimale
- **Pour les nouvelles fonctionnalités** :
  1. Définir les exigences
  2. Identifier les fichiers à modifier/créer
  3. Définir les interfaces (fonctions publiques)
  4. Écrire un plan d'implémentation

### 4. Implémenter

- **Modifications minimales** : Ne changer que ce qui est nécessaire
- **Respecter les conventions** : Suivre le style existant
- **Valider les entrées** : Toujours vérifier les données
- **Gérer les erreurs** : Retourner des objets d'erreur clairs

### 5. Tester

- **Tester manuellement** dans le navigateur
- **Vérifier les cas limites** :
  - Données vides ou null
  - Valeurs extrêmes (ex: score = 0, score = 170)
  - Actions utilisateur inattendues
- **Vérifier la persistance** : Les données sont-elles bien sauvegardées ?

### 6. Documenter

- **Mettre à jour le README.md** si la fonctionnalité est visible par l'utilisateur
- **Ajouter des commentaires** dans le code pour les parties complexes
- **Documenter les nouvelles fonctions publiques** avec JSDoc

---

## 📌 Bonnes Pratiques Spécifiques

### 1. Performance

- **Éviter les boucles imbriquées** sur de grands tableaux (ex: `matches`)
- **Utiliser `Array.prototype.find`/`filter`/`map`** plutôt que des boucles `for` quand c'est plus lisible
- **Mettre en cache** les calculs coûteux (ex: statistiques)

### 2. UX/UI

- **Feedback visuel** : Toujours indiquer à l'utilisateur ce qui se passe
  - Ex: "Match enregistré !" après la fin d'un match
- **Désactiver les boutons** quand une action est en cours
- **Messages d'erreur clairs** : Expliquer **pourquoi** une action a échoué

### 3. Données

- **Ne jamais faire confiance** aux données de localStorage (toujours valider)
- **Cloner les objets** avant modification pour éviter les effets de bord
- **Utiliser des IDs uniques** pour toutes les entités (joueurs, matchs, volées)

### 4. Sécurité

- **Échapper le HTML** si affiché via `innerHTML` (pour éviter XSS)
- **Ne pas stocker de données sensibles** (l'app est client-side seulement)

---

## 🔍 Points d'Attention Fréquents

### 1. Gestion des Scores

- **Score = 1** : Impossible à finir (aucun double ne vaut 1 point)
- **Score = 0** : Doit être atteint **exactement** avec un double
- **Dépassement** : Une volée qui fait passer le score en dessous de 0 est **invalide**

### 2. Mode Ghost

- Le Ghost est toujours le **joueur 1** (`playerIndex = 1`) dans un match
- Les volées du Ghost sont marquées avec `isSimulated: true` et `source: 'ghost'`
- Le Ghost utilise les statistiques du joueur **au moment du match** (snapshot)

### 3. Statistiques

- Les statistiques sont **recalculées après chaque match** (pas en temps réel)
- Les volées **invalides** (`isValid: false`) ne comptent pas dans les statistiques
- Les statistiques d'entraînement (`trainingStats`) sont séparées des statistiques de compétition

### 4. Service Worker

- Le Service Worker est utilisé pour :
  - Le **cache** des ressources (CSS, JS, HTML)
  - Le **mode hors ligne** (offline-first)
  - La **détection des mises à jour** (auto-reload)
- **Ne pas modifier** `service-worker.js` sans comprendre les implications

---

## 📚 Ressources Utiles

### Outils de Développement

- **Serveur local** : Utiliser `python -m http.server 8000` ou `live-server`
- **Debugging** : Utiliser les **DevTools** du navigateur (F12)
- **Validation JSON** : [JSONLint](https://jsonlint.com/)

### Documentation Externe

- [MDN JavaScript](https://developer.mozilla.org/fr/docs/Web/JavaScript)
- [MDN localStorage](https://developer.mozilla.org/fr/docs/Web/API/Window/localStorage)
- [Service Workers (MDN)](https://developer.mozilla.org/fr/docs/Web/API/Service_Worker_API)
- [PWA (MDN)](https://developer.mozilla.org/fr/docs/Web/Progressive_web_apps)

---

## 💡 Exemples de Tâches Courantes

### 1. Ajouter une nouvelle statistique

**Étapes :**
1. Ajouter le champ dans le modèle `Player.stats`
2. Mettre à jour `Stats.updatePlayerStats()` pour calculer la nouvelle stat
3. Ajouter l'affichage dans l'UI (`ui.js`)
4. Tester avec des données réelles

**Exemple : Ajouter `highestRoundScore`**
```javascript
// Dans stats.js
const updatePlayerStats = (playerId) => {
  const player = Players.getById(playerId);
  const matches = Storage.getMatches().filter(m => m.playerIds.includes(playerId));
  
  let highestRoundScore = 0;
  matches.forEach(match => {
    match.throws
      .filter(t => t.playerIndex === match.playerIds.indexOf(playerId) && t.isValid)
      .forEach(throw_ => {
        if (throw_.roundTotal > highestRoundScore) {
          highestRoundScore = throw_.roundTotal;
        }
      });
  });
  
  player.stats.highestRoundScore = highestRoundScore;
  Players.update(player);
};
```

### 2. Corriger un bug de validation

**Étapes :**
1. Reproduire le bug (trouver les étapes exactes)
2. Identifier la fonction de validation concernée (ex: `Rules.validateRound`)
3. Ajouter un test pour le cas problématique
4. Corriger la logique de validation
5. Tester avec d'autres cas similaires

**Exemple : Corriger la validation du score = 1**
```javascript
// Dans rules.js
const validateRoundDetailed = (gameType, currentScore, throws) => {
  // ... code existant ...
  
  const newScore = currentScore - total;
  
  // Score de 1 = impossible à finir
  if (newScore === 1) {
    return {
      valid: false,
      finished: false,
      reason: 'Score 1 impossible à finir (minimum finissable = 2 pour Double 1)'
    };
  }
  
  // ... reste du code ...
};
```

### 3. Ajouter une nouvelle règle de jeu

**Étapes :**
1. Définir la règle (ex: "Cricket")
2. Ajouter le type de jeu dans les constantes
3. Implémenter la validation spécifique dans `rules.js`
4. Mettre à jour l'UI pour supporter le nouveau type
5. Tester avec des matchs réels

---

## 🎓 Conseils pour les Agents IA

### 1. Comprendre avant de coder

- **Lire le code existant** avant de proposer des modifications
- **Poser des questions** si quelque chose n'est pas clair (ex: "Quel est le rôle de `ghostProfileSnapshot` ?")
- **Ne pas supposer** que le code fonctionne comme dans d'autres projets

### 2. Respecter le style existant

- **Suivre les conventions** du projet (nommage, structure, etc.)
- **Ne pas introduire** de nouveaux patterns sans raison valable
- **Écrire du code lisible** : les autres développeurs (humains) devront le maintenir

### 3. Tester rigoureusement

- **Vérifier les cas limites** (ex: score = 0, score = 170, joueur sans statistiques)
- **Tester l'UI** : l'application est utilisée par des humains
- **Vérifier la persistance** : les données sont-elles bien sauvegardées ?

### 4. Documenter les changements

- **Mettre à jour le README.md** si la fonctionnalité est visible par l'utilisateur
- **Ajouter des commentaires** pour les parties complexes ou non évidentes
- **Documenter les nouvelles API** (fonctions publiques) avec JSDoc

### 5. Optimiser pour le mobile

- **L'application est d'abord mobile** (responsive design)
- **Éviter les éléments trop petits** pour les doigts
- **Tester sur mobile** (ou utiliser les DevTools en mode mobile)

---

## 📞 Support

Si vous avez des questions sur le projet :
- **Consulter le code** : La plupart des réponses s'y trouvent
- **Consulter le README.md** : Documentation utilisateur
- **Consulter ce fichier** : Instructions pour les agents IA
- **Ouvrir une issue** sur GitHub pour les bugs ou demandes de fonctionnalités

---

**Bon développement !** 🚀
