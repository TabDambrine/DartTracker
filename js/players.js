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
     * Mets à jour les stats basiques après un match
     * Les stats détaillées sont recalculées par le module Stats
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

        Storage.updatePlayerStats(playerId, stats);
    };

    /**
     * Calcule les stats globales d'un joueur (appelle le module Stats pour les détails)
     */
    const getStats = (playerId) => {
        if (!Stats) {
            console.warn('Module Stats non disponible');
            return null;
        }

        return Stats.getFormattedStats(playerId);
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
