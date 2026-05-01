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
- **Export/Import JSON**: Sauvegarde et restauration complète des données (joueurs et matchs)
- **PWA Auto-Reload**: Notification et rechargement automatique lors des mises à jour
- **Offline-first**: Fonctionne sans connexion internet via Service Worker
- **Responsive design**: Optimisé pour mobile, tablet et desktop
- **Données locales**: Stockage via localStorage du navigateur

## 🚀 Démarrage Rapide

1. **Cloner le projet**
```bash
git clone https://github.com/tabdambrine/DartTracker.git
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
├── service-worker.js    # Cache, offline et auto-reload
├── css/
│   ├── variables.css    # Variables CSS
│   ├── layout.css       # Structure de base
│   ├── components.css   # Composants UI (inclut boutons export/import)
│   ├── players.css      # Styles gestion des joueurs
│   ├── game.css         # Styles des matchs
│   ├── throws.css       # Styles des lancers
│   ├── matches.css      # Styles de l'historique
│   ├── stats.css        # Styles des statistiques
│   ├── utils.css        # Utilitaires CSS
│   └── responsive.css   # Design responsive
└── js/
    ├── app.js           # Orchestration principale
    ├── storage.js       # localStorage wrapper
    ├── players.js       # Gestion des joueurs
    ├── games.js         # Logique des matchs
    ├── rules.js         # Validation des règles
    ├── stats.js         # Calcul des statistiques
    ├── finishes.js       # Gestion des finishes
    ├── throws-input.js   # Saisie des lancers
    ├── export.js        # Export/Import JSON (nouveau!)
    └── ui.js            # Gestion de l'interface
```

## 🛠️ Stack Technique

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Stockage**: localStorage (JSON)
- **Offline**: Service Worker
- **PWA**: Web App Manifest
- **Dépendances**: Aucune! 🎉

## 📝 Notes de Développement

Ce projet a été développé avec l'aide de **GitHub Copilot** et **Mistral Vibe**, mettant l'accent sur:
- Code modulaire avec pattern IIFE
- Validation robuste côté client
- Gestion d'état sans frameworks
- Persistance via localStorage
- Design responsive vanilla CSS
- Fonctionnalités avancées de PWA (Service Worker, cache, auto-reload)
- Export/Import des données en JSON avec validation

### Contributions récentes (Mistral Vibe)
- **Export/Import JSON**: Module complet pour la sauvegarde et restauration des données
- **PWA Auto-Reload**: Système de notification et rechargement automatique des mises à jour
- **Améliorations Service Worker**: Gestion avancée du cache et détection des nouvelles versions
- **Intégration UI**: Boutons d'export/import et notifications utilisateur

## 📄 Licence

Ce projet est sous **licence MIT** - libre d'utilisation, de modification et de distribution.

Vous êtes libre de:
- ✅ Forker ce projet
- ✅ Modifier le code comme bon vous semble
- ✅ L'utiliser pour vos propres projets
- ✅ Le distribuer (avec attribution)
- ✅ Le commercialiser

Voir [LICENSE](LICENSE) pour les détails complets.

## 📥 Export/Import des Données

### Export
- Exporte toutes les données (joueurs et matchs) au format JSON
- Inclut la version de l'application et la date d'export
- Génère un fichier nommé `DartStatsTracker_export_YYYY-MM-DD.json`

### Import
- Importe les données depuis un fichier JSON valide
- Validation automatique du format et des données
- Conservation de l'historique complet
- Notification du nombre de joueurs et matchs importés

### Utilisation
1. **Exporter**: Cliquez sur le bouton "Exporter" dans l'écran d'accueil
2. **Importer**: Cliquez sur le bouton "Importer" et sélectionnez un fichier JSON

## 📖 Spécifications Techniques

### Règles des Jeux

#### 501
- **Début**: 501 points
- **Objectif**: Atteindre exactement 0 avec un double
- **Règles**: Pas de dépassement (< 0 = volée invalide)

#### 301
- **Début**: 301 points
- **Objectif**: Identique au 501

### Statistiques Calculées
L'application calcule automatiquement pour chaque joueur:
- **Moyenne par volée**: Somme des points valides / nombre de volées
- **Taux finish double**: % de matchs terminés au double en 1ère fléchette
- **Top coups**: Classement des segments/multiplicateurs les plus lancés
- **Meilleur finish**: Score le plus haut avec lequel vous avez remporté un match
- **Double préféré**: Double (2×) le plus utilisé pour finir

---

**Fait avec ❤️ et l'aide de [GitHub Copilot](https://github.com/features/copilot) et [Mistral Vibe](https://mistral.ai/)** 🤖
