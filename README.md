# 🎯 Dart Stats Tracker

Une Progressive Web App (PWA) pour tracker et analyser les statistiques de jeux de fléchettes (darts), développée entièrement en **vanilla JavaScript, HTML et CSS** - sans frameworks ni dépendances externes.

## ✨ Features

- **Jeux supportés**: 501 et 301
- **Saisie précise**: Segment + multiplicateur (Single, Double, Triple)
- **Validation en temps réel**: Vérification automatique des règles
- **Historique détaillé**: Enregistrement de toutes les volées (valides et invalides)
- **Gestion des joueurs**: Créer, modifier, supprimer (l'historique est préservé)
- **Statistiques complètes**:
  - Moyenne des volées
  - Taux de réussite au double (finish)
  - Top 10 coups préférés avec pourcentages
  - Meilleur score de finish
  - Double préféré pour finir les matchs
- **Offline-first**: Fonctionne sans connexion internet via Service Worker
- **Responsive design**: Optimisé pour mobile, tablet et desktop
- **Données locales**: Stockage via localStorage du navigateur

## 🚀 Démarrage Rapide

1. **Cloner le projet**
```bash
git clone [https://github.com/tabdambrine/DartTracker.git](https://github.com/TabDambrine/DartTracker.git)
cd dart-stats-tracker
```

2. **Ouvrir l'application**
   - Option locale: Double-cliquez sur `index.html`
   - Option serveur: Servez les fichiers sur HTTP/HTTPS (Service Worker nécessite HTTPS en production)

3. **Créer des joueurs** et lancer des matchs!

## 📱 Utilisation

### Flux Typique
1. Créer 2+ joueurs via "Gérer les joueurs"
2. Lancer un match en sélectionnant 2 joueurs et le type de jeu (501/301)
3. Pour chaque volée:
   - Sélectionner le segment (MISS, 1-20, BULL)
   - Sélectionner le multiplicateur (Simple, Double, Triple)
   - Le score est calculé automatiquement
4. Valider la volée
   - Si invalide: proposée comme erreur (sans pénalité au score)
   - Si valide: passage au joueur suivant
5. Le match se termine automatiquement quand un joueur atteint 0 exactement avec un double

### Finish Anticipé
Le système détecte les finishes anticipés - vous pouvez terminer une volée en moins de 3 darts!
- Exemple: Score 61 = Triple 17 (51) + Double 5 (10) → Finish immédiat

### Suppression de Joueur
Vous pouvez supprimer un joueur à tout moment, même s'il a des matchs!
- ✅ Les matchs et l'historique sont **conservés**
- ✅ Les stats des autres joueurs **restent intactes**
- 🔌 Le joueur supprimé apparaît comme "Joueur supprimé" dans les matchs
- 📊 Les stats du joueur supprimé ne sont **plus** calculées

## 🏗️ Architecture

```
dart-stats-tracker/
├── index.html           # Application shell
├── manifest.json        # Configuration PWA
├── service-worker.js    # Cache et offline
├── css/
│   └── styles.css       # Styles vanilla responsifs
└── js/
    ├── app.js           # Orchestration
    ├── storage.js       # localStorage wrapper
    ├── players.js       # Gestion des joueurs
    ├── games.js         # Logique des matchs
    ├── rules.js         # Validation des règles
    ├── stats.js         # Calcul des statistiques
    └── ui.js            # Gestion de l'interface
```

## 🛠️ Stack Technique

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Stockage**: localStorage (JSON)
- **Offline**: Service Worker
- **PWA**: Web App Manifest
- **Dépendances**: Aucune! 🎉

## 📝 Notes de Développement

Ce projet a été entièrement développé avec l'aide de **GitHub Copilot**, mettant l'accent sur:
- Code modulaire avec pattern IIFE
- Validation robuste côté client
- Gestion d'état sans frameworks
- Persistance via localStorage
- Design responsive vanilla CSS

## 📄 Licence

Ce projet est sous **licence MIT** - libre d'utilisation, de modification et de distribution.

Vous êtes libre de:
- ✅ Forker ce projet
- ✅ Modifier le code comme bon vous semble
- ✅ L'utiliser pour vos propres projets
- ✅ Le distribuer (avec attribution)
- ✅ Le commercialiser

Voir [LICENSE](LICENSE) pour les détails complets.

## 📖 Spécifications Complètes

Pour des détails techniques complets sur les règles, le modèle de données et les calculs statistiques, consultez [INSTRUCTIONS.md](INSTRUCTIONS.md).

## 🎮 Jeux Supportés

### 501
- Début: 501 points
- Objectif: Atteindre exactement 0 avec un double
- Règles: Pas de dépassement (< 0 = volée invalide)

### 301
- Début: 301 points
- Sinon identique au 501

## 💡 Exemples de Statistiques

L'application calcule automatiquement:
- **Moyenne par volée**: Somme des points valides / nombre de volées
- **Taux finish double**: % de matchs terminés au double en 1ère fléchette
- **Top coups**: Classement des segments/multiplicateurs les plus lancés
- **Meilleur finish**: Score le plus haut avec lequel vous avez remporté un match
- **Double préféré**: Double (2×) le plus utilisé pour finir

---

**Fait avec ❤️ et l'aide de GitHub Copilot** 🤖
