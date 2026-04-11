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
                averageScore: 0
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
     * Supprime un joueur
     */
    const deletePlayer = (id) => {
        let players = getPlayers();
        players = players.filter(p => p.id !== id);
        set(KEYS.PLAYERS, players);
        return true;
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
        clearAll,
        generateId,
        KEYS
    };
})();
