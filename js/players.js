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
     * Les références du joueur supprimé dans les matchs sont remplacées par 'deleted_player'
     * Cela permet de garder l'historique des matchs sans perdre les stats des autres joueurs
     */
    const remove = (id) => {
        const player = getById(id);
        if (!player) {
            throw new Error('Joueur introuvable');
        }

        // Supprimer et remplacer les références dans les matchs
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
     * Enregistre un DNF (Did Not Finish) pour un joueur
     * C'est ni une victoire ni une défaite
     */
    const recordDNF = (playerId) => {
        const player = getById(playerId);
        if (!player) return;

        const stats = { ...player.stats };
        stats.totalMatches += 1;
        stats.dnf = (stats.dnf || 0) + 1;  // Compteur de DNF

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
        recordDNF,
        getStats
    };
})();
