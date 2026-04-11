/**
 * Players Module
 * Gère les joueurs
 */

const Players = (() => {
    /**
     * Récupère tous les joueurs
     */
    const getAll = () => {
        return Storage.getPlayers();
    };

    /**
     * Crée un nouveau joueur
     */
    const create = (name) => {
        if (!name || name.trim().length === 0) {
            throw new Error('Le nom du joueur est requis');
        }

        if (name.trim().length > 50) {
            throw new Error('Le nom ne doit pas dépasser 50 caractères');
        }

        const players = getAll();
        if (players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
            throw new Error('Un joueur avec ce nom existe déjà');
        }

        return Storage.addPlayer(name);
    };

    /**
     * Récupère un joueur par ID
     */
    const getById = (id) => {
        return Storage.getPlayerById(id);
    };

    /**
     * Supprime un joueur
     */
    const remove = (id) => {
        const player = getById(id);
        if (!player) {
            throw new Error('Joueur introuvable');
        }

        // Vérifier s'il a des matchs
        const matches = Storage.getPlayerMatches(id);
        if (matches.length > 0) {
            throw new Error('Impossible de supprimer un joueur avec des matchs');
        }

        return Storage.deletePlayer(id);
    };

    /**
     * Mets à jour les stats après un match
     */
    const updateAfterMatch = (playerId, won) => {
        const player = getById(playerId);
        if (!player) return;

        const stats = { ...player.stats };
        stats.totalMatches += 1;
        if (won) {
            stats.wins += 1;
        } else {
            stats.losses += 1;
        }

        // Recalculer la moyenne
        stats.averageScore = stats.wins / stats.totalMatches;

        Storage.updatePlayerStats(playerId, stats);
    };

    /**
     * Calcule les stats globales d'un joueur
     */
    const getStats = (playerId) => {
        const player = getById(playerId);
        if (!player) return null;

        const matches = Storage.getPlayerMatches(playerId);
        const wins = matches.filter(m => m.winner === playerId).length;

        return {
            player,
            totalMatches: matches.length,
            wins,
            losses: matches.length - wins,
            winRate: matches.length > 0 ? ((wins / matches.length) * 100).toFixed(1) : 0
        };
    };

    return {
        getAll,
        create,
        getById,
        remove,
        updateAfterMatch,
        getStats
    };
})();
