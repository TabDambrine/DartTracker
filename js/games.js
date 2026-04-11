/**
 * Games Module
 * Gère la logique des matchs
 */

const Games = (() => {
    let currentMatch = null;

    /**
     * Initialise un nouveau match
     */
    const createMatch = (player1Id, player2Id, gameType) => {
        const startScore = gameType === '501' ? 501 : 301;

        const match = {
            id: Storage.generateId(),
            playerIds: [player1Id, player2Id],
            gameType,
            startDate: Date.now(),
            endDate: null,
            winner: null,
            currentPlayerIndex: 0,
            scores: [startScore, startScore],
            throws: []
        };

        currentMatch = match;
        return match;
    };

    /**
     * Récupère le match en cours
     */
    const getCurrentMatch = () => {
        return currentMatch;
    };

    /**
     * Définit le match en cours
     */
    const setCurrentMatch = (match) => {
        currentMatch = match;
    };

    /**
     * Efface le match en cours
     */
    const clearCurrentMatch = () => {
        currentMatch = null;
    };

    /**
     * Récupère le joueur actuel
     */
    const getCurrentPlayer = () => {
        if (!currentMatch) return null;
        const playerId = currentMatch.playerIds[currentMatch.currentPlayerIndex];
        return Players.getById(playerId);
    };

    /**
     * Récupère l'autre joueur
     */
    const getOtherPlayer = () => {
        if (!currentMatch) return null;
        const playerId = currentMatch.playerIds[1 - currentMatch.currentPlayerIndex];
        return Players.getById(playerId);
    };

    /**
     * Ajoute une volée et valide les règles
     */
    const addThrow = (scores) => {
        if (!currentMatch) {
            throw new Error('Aucun match en cours');
        }

        const playerIndex = currentMatch.currentPlayerIndex;
        const currentScore = currentMatch.scores[playerIndex];
        const gameType = currentMatch.gameType;

        // Valider la volée
        const validation = Rules.validateRound(gameType, currentScore, scores);

        if (!validation.valid) {
            return {
                success: false,
                reason: validation.reason
            };
        }

        // Calculer la nouvelle volée
        const totalScore = scores.reduce((a, b) => a + b, 0);
        const newScore = currentScore - totalScore;
        const roundNumber = currentMatch.throws.filter(t => t.playerIndex === playerIndex).length + 1;

        const throwRecord = {
            id: Storage.generateId(),
            playerIndex,
            round: roundNumber,
            throw: scores,
            scores,
            roundTotal: totalScore,
            runningTotal: newScore,
            isValid: true,
            timestamp: Date.now()
        };

        // Ajouter à l'historique
        currentMatch.throws.push(throwRecord);
        currentMatch.scores[playerIndex] = newScore;

        // Si le match est fini
        if (validation.finished) {
            currentMatch.endDate = Date.now();
            currentMatch.winner = currentMatch.playerIds[playerIndex];

            // Sauvegarder le match
            Storage.addMatch(currentMatch);

            // Mettre à jour les stats
            Players.updateAfterMatch(currentMatch.playerIds[playerIndex], true);
            Players.updateAfterMatch(currentMatch.playerIds[1 - playerIndex], false);

            return {
                success: true,
                finished: true,
                winner: getCurrentPlayer()
            };
        }

        // Passer au joueur suivant
        currentMatch.currentPlayerIndex = 1 - currentMatch.currentPlayerIndex;

        return {
            success: true,
            finished: false,
            throwRecord
        };
    };

    /**
     * Annule le dernier lancer du joueur actuel (pour correction)
     */
    const undoLastThrow = () => {
        if (!currentMatch || currentMatch.throws.length === 0) {
            return false;
        }

        const playerIndex = currentMatch.currentPlayerIndex;
        const lastThrowIndex = currentMatch.throws.findIndex(
            (t, i) => currentMatch.throws.length - 1 - i === i && 
                      t.playerIndex === playerIndex
        );

        if (lastThrowIndex === -1) {
            return false;
        }

        const lastThrow = currentMatch.throws[lastThrowIndex];
        const newScore = lastThrow.runningTotal + lastThrow.roundTotal;

        currentMatch.scores[playerIndex] = newScore;
        currentMatch.throws.splice(lastThrowIndex, 1);

        return true;
    };

    /**
     * Récupère les matchs terminés
     */
    const getMatchHistory = () => {
        return Storage.getMatches();
    };

    /**
     * Récupère un match par ID
     */
    const getMatchById = (id) => {
        return Storage.getMatchById(id);
    };

    /**
     * Récupère les lancers d'un joueur dans le match actuel
     */
    const getPlayerThrows = (playerIndex) => {
        if (!currentMatch) return [];
        return currentMatch.throws.filter(t => t.playerIndex === playerIndex);
    };

    /**
     * Récupère les lancers du joueur actuel
     */
    const getCurrentPlayerThrows = () => {
        return getPlayerThrows(currentMatch.currentPlayerIndex);
    };

    return {
        createMatch,
        getCurrentMatch,
        setCurrentMatch,
        clearCurrentMatch,
        getCurrentPlayer,
        getOtherPlayer,
        addThrow,
        undoLastThrow,
        getMatchHistory,
        getMatchById,
        getPlayerThrows,
        getCurrentPlayerThrows
    };
})();
