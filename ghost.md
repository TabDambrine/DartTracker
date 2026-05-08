# Système Ghost - DartTracker

Le mode **Ghost** de DartTracker permet de jouer contre un adversaire virtuel dont les performances sont basées sur les statistiques d'un joueur réel. Ce document explique en détail comment le système sélectionne les volées de fléchettes pour le ghost.

---

## Table des matières
1. [Aperçu général](#aperçu-général)
2. [Architecture du système](#architecture-du-système)
3. [Construction du profil du Ghost](#construction-du-profil-du-ghost)
4. [Processus décisionnel principal](#processus-décisionnel-principal)
5. [Décision de finition](#décision-de-finition)
6. [Génération des volées de scoring](#génération-des-volées-de-scoring)
7. [Sélection des combinaisons de fléchettes](#sélection-des-combinaisons-de-fléchettes)
8. [Exemple complet](#exemple-complet)
9. [Diagramme du processus](#diagramme-du-processus)

---

## Aperçu général

Le système Ghost simule un adversaire réaliste en utilisant :
- Les **statistiques du joueur** (moyenne par volée, taux de réussite des doubles, etc.)
- Des **algorithmes de sélection intelligents** pour choisir les meilleures combinaisons de fléchettes
- Une **approche probabiliste** pour reproduire la variabilité des performances humaines

Le ghost peut :
- Jouer des volées de scoring normales
- Tenter des finitions quand le score le permet
- Rater ses doubles de finition selon son taux de réussite
- S'adapter au type de jeu (501, 301, etc.)

---

## Architecture du système

### Fichiers impliqués
- `js/ghost.js` : Module principal du Ghost
- `js/finishes.js` : Calcul des combinaisons de finition
- `js/rules.js` : Validation des règles des fléchettes
- `js/games.js` : Gestion des matchs (intégration du mode Ghost)

### Flux principal
```
playTurn(match) → generateTurn(profile, currentScore) → 
  [shouldAttemptFinish() → generateFinishAttempt()] OU generateSafeScoringTurn()
```

---

## Construction du profil du Ghost

### Fonction : `buildProfile(playerId, gameType)`

Construis le profil du ghost à partir des statistiques du joueur sélectionné.

**Priorité des statistiques utilisées :**
1. Statistiques de compétition pour le `gameType` spécifique
2. Statistiques globales de compétition
3. Statistiques d'entraînement pour le `gameType` spécifique
4. Statistiques globales d'entraînement
5. Valeurs par défaut si aucune statistique disponible

**Profil généré :**
```javascript
{
  playerId: string,              // ID du joueur modèle
  name: string,                  // Nom du joueur
  averageRoundScore: number,     // Moyenne de points par volée (défaut: 45)
  finishDoubleSuccessRate: number, // Taux de réussite des doubles (%) (défaut: 12%)
  bestFinishingScore: number,    // Meilleur score de finition (défaut: 60)
  preferredFinishingDouble: object, // Double préféré pour finir
  topThrows: array               // Meilleurs lancers du joueur
}
```

---

## Processus décisionnel principal

### `generateTurn(profile, currentScore)`

Fonction centrale qui détermine la volée à jouer.

**Logique :**
1. Vérifie si une tentative de finition est possible avec `shouldAttemptFinish()`
2. Si oui, tente une finition avec `generateFinishAttempt()`
3. Si la tentative échoue (double raté), génère une volée de scoring sûre
4. Sinon, génère directement une volée de scoring sûre

---

## Décision de finition

### `shouldAttemptFinish(profile, currentScore)`

Détermine si le ghost doit tenter de finir le match.

**Conditions :**
- Le `currentScore` doit être **entre 2 et 170** (inclus)
- **DEUX cas possibles :**
  1. `currentScore ≤ bestFinishingScore` → **Tente toujours de finir**
  2. `averageRoundScore ≥ 60` **ET** `Math.random() < 0.35` → **35% de chance de tenter**

**Exemples :**
- Score = 50, `bestFinishingScore` = 60 → **Tente de finir**
- Score = 100, `averageRoundScore` = 70 → **35% de chance de tenter**
- Score = 200 → **Ne tente pas** (score trop élevé)

### `generateFinishAttempt(profile, currentScore)`

Génère une tentative de finition si les conditions sont remplies.

**Étapes :**
1. Sélectionne la meilleure finition avec `Finishes.selectBestFinish()`
2. Calcule le taux de réussite : `clamp(finishDoubleSuccessRate / 100, 0.05, 0.7)`
   - Minimum : 5% (même avec un taux de 0%)
   - Maximum : 70% (même avec un taux de 100%)
3. **Test aléatoire :**
   - Si `Math.random() ≤ successRate` → **Réussit la finition**
   - Sinon → **Rate le double** et génère une volée de scoring

---

## Sélection des finitions

### `Finishes.selectBestFinish(score, playerPreferredDouble)`

Sélectionne la meilleure combinaison pour finir un score.

**Critères de sélection (par ordre de priorité) :**
1. **Double préféré du joueur** : Si disponible, privilégie les finitions utilisant ce double
2. **Nombre minimal de fléchettes** : 1 fléchette > 2 fléchettes > 3 fléchettes
3. **Score d'attaque maximal** : Maximise la somme des points avant le double final

**Exemple pour score = 60 :**
- Finition avec Double 20 : `[Triple 20, Double 20]` (60 + 40 = 100 → invalide)
- Finition valide : `[Double 20, Double 20]` → **Invalide** (2 doubles)
- Finition valide : `[Triple 16, Double 6]` (48 + 12 = 60)

---

## Génération des volées de scoring

### `generateSafeScoringTurn(profile, currentScore)`

Génère une volée de scoring quand le ghost ne tente pas de finir.

**Étapes :**
1. Calcule le score maximal possible : `min(180, currentScore - 2)`
   - Le `-2` évite de laisser un score de 1 (impossible à finir)
2. Génère un score cible avec une **distribution normale** :
   ```javascript
   deviation = clamp(profile.averageRoundScore * 0.35, 8, 35)
   target = clamp(Math.round(randomNormal(profile.averageRoundScore, deviation)), 0, maxScore)
   ```
3. Cherche une combinaison de fléchettes pour atteindre ce score
4. Complète avec des MISS si nécessaire pour avoir 3 fléchettes

**Exemple :**
- `averageRoundScore` = 60
- `deviation` = 21 (60 * 0.35)
- `target` généré aléatoirement autour de 60 (ex: 55, 70, 45)
- Combinaison trouvée : `[Triple 20, Single 10]` → 60 + 10 = 70
- Volée finale : `[Triple 20, Single 10, MISS]`

---

## Sélection des combinaisons de fléchettes

### `findDartsForTotal(total, maxDarts)`

Trouve une combinaison de 1 à `maxDarts` fléchettes qui totalise `total`.

**Processus :**
1. Trie toutes les fléchettes valides par score décroissant
2. Recherche exhaustive :
   - D'abord avec 1 fléchette
   - Puis avec 2 fléchettes
   - Enfin avec 3 fléchettes
3. Retourne la première combinaison valide trouvée

**Fléchettes disponibles :**
- MISS (0 point)
- Bull (25 et 50 points)
- Singles, Doubles et Triples pour les segments 1-20

---

## Exemple complet

### Scénario
- Joueur : Alice
  - `averageRoundScore` = 70
  - `finishDoubleSuccessRate` = 25%
  - `bestFinishingScore` = 80
  - `preferredFinishingDouble` = Double 16
- Match : 501 en mode Ghost
- Score actuel du Ghost : 120

### Déroulement
1. **Construction du profil** : Utilise les statistiques de compétition d'Alice
2. **Décision de finition** :
   - Score = 120 ∈ [2, 170] → valide
   - 120 > 80 → vérifie `averageRoundScore ≥ 60` (70 ≥ 60) ET `random() < 0.35`
   - Supposons `random() = 0.30` → **Tente de finir**
3. **Sélection de la finition** :
   - Trouve les finitions possibles pour 120
   - Aucune n'utilise Double 16 → sélectionne la finition avec 3 fléchettes et score d'attaque maximal
   - Exemple : `[Triple 20, Triple 16, Double 8]` (60 + 48 + 12 = 120)
4. **Test de réussite** :
   - `successRate` = 25% → 0.25
   - `random() = 0.20` ≤ 0.25 → **Réussit la finition**
5. **Volée jouée** : `[Triple 20, Triple 16, Double 8]`

---

## Diagramme du processus décisionnel

```
playTurn(match)
│
├── buildProfile(playerId, gameType)
│   ├── Priorité 1: stats.byGameType[gameType]
│   ├── Priorité 2: stats (globales)
│   ├── Priorité 3: trainingStats.byGameType[gameType]
│   └── Priorité 4: trainingStats (globales)
│
├── generateTurn(profile, currentScore)
│   │
│   ├── shouldAttemptFinish(profile, currentScore)
│   │   ├── currentScore ∈ [2, 170] ?
│   │   ├── currentScore ≤ bestFinishingScore ? → OUI
│   │   └── averageRoundScore ≥ 60 ET random() < 0.35 ? → OUI
│   │
│   ├── Si OUI:
│   │   ├── generateFinishAttempt(profile, currentScore)
│   │   │   ├── selectBestFinish(score, preferredDouble)
│   │   │   │   ├── Filtrer finitions avec preferredDouble
│   │   │   │   ├── Sinon: trier par nombre de fléchettes (asc) + score d'attaque (desc)
│   │   │   │   └── Retourne la meilleure finition
│   │   │   ├── successRate = clamp(finishDoubleSuccessRate / 100, 0.05, 0.7)
│   │   │   ├── random() ≤ successRate ? → Retourne finition
│   │   │   └── Sinon: generateSafeScoringTurn()
│   │   │
│   │   └── Retourne la volée
│   │
│   └── Si NON:
│       └── generateSafeScoringTurn(profile, currentScore)
│           ├── maxScore = min(180, currentScore - 2)
│           ├── target = randomNormal(averageRoundScore, deviation)
│           ├── findDartsForTotal(target, 3)
│           │   ├── Recherche exhaustive (1→2→3 fléchettes)
│           │   └── Retourne la première combinaison valide
│           └── padToRound(throws) → 3 fléchettes
│
└── addSimulatedThrow(throws, { profileName })
```

---

## Paramètres configurables

Le comportement du Ghost peut être influencé par les statistiques du joueur :

| Paramètre | Description | Valeur par défaut | Impact |
|-----------|-------------|-------------------|--------|
| `averageRoundScore` | Moyenne de points par volée | 45 | Détermine le score cible des volées de scoring |
| `finishDoubleSuccessRate` | Taux de réussite des doubles (%) | 12% | Probabilité de réussir une finition |
| `bestFinishingScore` | Meilleur score de finition | 60 | Score en dessous duquel le ghost tente toujours de finir |
| `preferredFinishingDouble` | Double préféré pour finir | null | Influence le choix des finitions |

---

## Limites et améliorations possibles

### Limites actuelles
- Le ghost ne tient pas compte de la **stratégie de l'adversaire**
- Les volées de scoring sont générées de manière **indépendante** (pas de mémoire entre les tours)
- Le taux de réussite des doubles est **constant** (ne varie pas avec la pression)

### Améliorations possibles
- Ajouter une **variabilité du taux de réussite** en fonction du score restant
- Implémenter des **stratégies avancées** (ex: forcer un score spécifique pour le tour suivant)
- Prendre en compte le **niveau de l'adversaire** pour ajuster la difficulté
- Ajouter des **patterns de jeu** (ex: toujours viser le Triple 20 en premier)

---

## Voir aussi
- [README.md](README.md) - Documentation principale
- [INSTRUCTIONS.md](INSTRUCTIONS.md) - Instructions d'utilisation
