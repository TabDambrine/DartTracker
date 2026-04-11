/**
 * Storage Module
 * Gère la persistance des données via localStorage
 */

const Storage = (() => {
    const KEYS = {
        PLAYERS: 'players',
        MATCHES: 'matches',
        APP_VERSION: 'appVersion'
    };

    const VERSION = '1.0.0';

    /**
     * Initialise le stockage
     */
    const init = () => {
        if (!get(KEYS.APP_VERSION)) {
            set(KEYS.APP_VERSION, VERSION);
            set(KEYS.PLAYERS, []);
            set(KEYS.MATCHES, []);
        }
    };

    /**
     * Récupère une valeur du localStorage
     */
    const get = (key) => {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error(`Erreur lecture localStorage [${key}]:`, e);
            return null;
        }
    };

    /**
     * Sauvegarde une valeur dans le localStorage
     */
    const set = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Erreur écriture localStorage [${key}]:`, e);
            return false;
        }
    };

    /**
     * Récupère tous les joueurs
     */
    const getPlayers = () => {
        return get(KEYS.PLAYERS) || [];
    };

    /**
     * Ajoute un joueur
     */
    const addPlayer = (name) => {
        const players = getPlayers();
        const newPlayer = {
            id: generateId(),
            name: name.trim(),
            created: Date.now(),
            stats: {
                totalMatches: 0,
                wins: 0,
                losses: 0,
                dnf: 0,  // Compteur de DNF (Did Not Finish)
                averageRoundScore: 0,
                finishDoubleSuccessRate: 0,
                bestFinishingScore: 0,
                topThrows: [],
                preferredFinishingDouble: null
            }
        };
        players.push(newPlayer);
        set(KEYS.PLAYERS, players);
        return newPlayer;
    };

    /**
     * Récupère un joueur par ID
     */
    const getPlayerById = (id) => {
        const players = getPlayers();
        return players.find(p => p.id === id);
    };

    /**
     * Supprime un joueur et remplace ses références dans les matchs
     */
    const deletePlayer = (id) => {
        let players = getPlayers();
        players = players.filter(p => p.id !== id);
        set(KEYS.PLAYERS, players);

        // Remplacer les références du joueur supprimé dans les matchs
        replacePlayerIdInMatches(id, 'deleted_player');

        return true;
    };

    /**
     * Remplace l'ID d'un joueur par un autre dans tous les matchs
     * Utile quand un joueur est supprimé (remplacer par "deleted_player")
     * Appelle ensuite cleanOrphanMatches() pour supprimer les matchs avec deux joueurs supprimés
     */
    const replacePlayerIdInMatches = (oldPlayerId, newPlayerId) => {
        const matches = getMatches();
        matches.forEach(match => {
            // Remplacer dans playerIds
            match.playerIds = match.playerIds.map(id => 
                id === oldPlayerId ? newPlayerId : id
            );
            // Remplacer dans winner si nécessaire
            if (match.winner === oldPlayerId) {
                match.winner = newPlayerId;
            }
            // Remplacer dans les throws (playerIds des lancers)
            match.throws.forEach(throwRecord => {
                // Note: playerIndex ne change pas, c'est un index numérique
            });
        });
        set(KEYS.MATCHES, matches);

        // Nettoyer les matchs orphelins après la suppression
        cleanOrphanMatches();
    };

    /**
     * Supprime les matchs où les deux joueurs ont été supprimés
     * Cela évite d'encombrer localStorage avec des données inutiles
     */
    const cleanOrphanMatches = () => {
        let matches = getMatches();
        const initialCount = matches.length;

        // Filtrer les matchs où les deux joueurs sont "deleted_player"
        matches = matches.filter(match => {
            const bothDeleted = match.playerIds[0] === 'deleted_player' && 
                                match.playerIds[1] === 'deleted_player';
            return !bothDeleted;
        });

        // Si des matchs ont été supprimés, mettre à jour
        if (matches.length < initialCount) {
            set(KEYS.MATCHES, matches);
            console.log(`Nettoyage: ${initialCount - matches.length} match(es) orphelin(s) supprimé(s)`);
        }

        return initialCount - matches.length;
    };

    /**
     * Met à jour les stats d'un joueur
     */
    const updatePlayerStats = (playerId, stats) => {
        const players = getPlayers();
        const player = players.find(p => p.id === playerId);
        if (player) {
            player.stats = { ...player.stats, ...stats };
            set(KEYS.PLAYERS, players);
            return true;
        }
        return false;
    };

    /**
     * Récupère tous les matchs
     */
    const getMatches = () => {
        return get(KEYS.MATCHES) || [];
    };

    /**
     * Ajoute un match
     */
    const addMatch = (match) => {
        const matches = getMatches();
        matches.push(match);
        set(KEYS.MATCHES, matches);
        return match;
    };

    /**
     * Met à jour un match
     */
    const updateMatch = (matchId, updatedMatch) => {
        const matches = getMatches();
        const index = matches.findIndex(m => m.id === matchId);
        if (index !== -1) {
            matches[index] = updatedMatch;
            set(KEYS.MATCHES, matches);
            return true;
        }
        return false;
    };

    /**
     * Récupère un match par ID
     */
    const getMatchById = (id) => {
        const matches = getMatches();
        return matches.find(m => m.id === id);
    };

    /**
     * Récupère les matchs d'un joueur
     */
    const getPlayerMatches = (playerId) => {
        const matches = getMatches();
        return matches.filter(m => m.playerIds.includes(playerId));
    };

    /**
     * Supprime tout (pour tests/reset)
     */
    const clearAll = () => {
        localStorage.clear();
        init();
    };

    /**
     * Génère un ID unique
     */
    const generateId = () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    // Initialisation au chargement
    init();

    return {
        get,
        set,
        getPlayers,
        addPlayer,
        getPlayerById,
        deletePlayer,
        updatePlayerStats,
        getMatches,
        addMatch,
        updateMatch,
        getMatchById,
        getPlayerMatches,
        replacePlayerIdInMatches,
        cleanOrphanMatches,
        clearAll,
        generateId,
        KEYS
    };
})();
