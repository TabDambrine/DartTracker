/**
 * Games Module
 * Gère la logique des matchs
 */

const Games = (() => {
    let currentMatch = null;

    /**
     * Initialise un nouveau match
     * @param {string} player1Id - ID du joueur 1
     * @param {string} player2Id - ID du joueur 2 (peut être null pour entraînement)
     * @param {string} gameType - "501" ou "301"
     * @param {number|null} roundLimit - Limite de tours (null = pas de limite)
     */
    const createMatch = (player1Id, player2Id, gameType, roundLimit = null) => {
        const startScore = gameType === '501' ? 501 : 301;
        const isSelfPlay = player1Id === player2Id;

        const match = {
            id: Storage.generateId(),
            playerIds: [player1Id, player2Id],
            isSelfPlay,  // true si player1Id === player2Id (match contre soi-même)
            gameType,
            roundLimit,  // null = pas de limite, sinon nombre de tours
            currentRound: 1,  // Compte les tours (1, 2, 3...)
            isDNF: false,  // Did Not Finish (seulement si roundLimit atteint sans finish)
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
    const addThrow = (throws) => {
        if (!currentMatch) {
            throw new Error('Aucun match en cours');
        }

        const playerIndex = currentMatch.currentPlayerIndex;
        const currentScore = currentMatch.scores[playerIndex];
        const gameType = currentMatch.gameType;

        // Valider la volée (throws est maintenant un tableau d'objets {segment, multiplier})
        const validation = Rules.validateRound(gameType, currentScore, throws);

        if (!validation.valid) {
            return {
                success: false,
                valid: false,
                reason: validation.reason
            };
        }

        // Calculer les scores
        const scores = throws.map(Rules.calculateScore);
        const totalScore = scores.reduce((a, b) => a + b, 0);
        const newScore = currentScore - totalScore;
        const roundNumber = currentMatch.throws.filter(t => t.playerIndex === playerIndex).length + 1;

        const throwRecord = {
            id: Storage.generateId(),
            playerIndex,
            round: roundNumber,
            throw: throws,
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
            currentMatch.isDNF = false;

            // Sauvegarder le match
            Storage.addMatch(currentMatch);

            // Mettre à jour les stats seulement si ce n'est pas un self-play
            if (!currentMatch.isSelfPlay) {
                Players.updateAfterMatch(currentMatch.playerIds[playerIndex], true);
                Players.updateAfterMatch(currentMatch.playerIds[1 - playerIndex], false);

                // Recalculer les statistiques détaillées pour les deux joueurs
                Stats.updatePlayerStats(currentMatch.playerIds[playerIndex]);
                Stats.updatePlayerStats(currentMatch.playerIds[1 - playerIndex]);
            }

            return {
                success: true,
                valid: true,
                finished: true,
                winner: getCurrentPlayer()
            };
        }

        // Passer au joueur suivant et vérifier la limite de tours
        currentMatch.currentPlayerIndex = 1 - currentMatch.currentPlayerIndex;

        // Incrémenter le tour quand on revient au joueur 0 (après chaque volée du joueur 1)
        if (currentMatch.currentPlayerIndex === 0) {
            currentMatch.currentRound += 1;

            // Vérifier si on a atteint la limite
            if (currentMatch.roundLimit && currentMatch.currentRound > currentMatch.roundLimit) {
                // DNF - Did Not Finish
                currentMatch.endDate = Date.now();
                currentMatch.isDNF = true;
                currentMatch.winner = null;

                // Sauvegarder le match DNF
                Storage.addMatch(currentMatch);

                // Mettre à jour le comptage de DNF pour les joueurs seulement si ce n'est pas un self-play
                if (!currentMatch.isSelfPlay) {
                    Players.recordDNF(currentMatch.playerIds[0]);
                    Players.recordDNF(currentMatch.playerIds[1]);
                }

                return {
                    success: true,
                    valid: true,
                    finished: true,
                    isDNF: true,
                    winner: null
                };
            }
        }

        return {
            success: true,
            valid: true,
            finished: false,
            throwRecord
        };
    };

    /**
     * Ajoute une volée invalide (erreur du joueur)
     * Enregistre l'erreur sans modifier le score
     */
    const addInvalidThrow = (throws, reason) => {
        if (!currentMatch) {
            throw new Error('Aucun match en cours');
        }

        const playerIndex = currentMatch.currentPlayerIndex;
        const currentScore = currentMatch.scores[playerIndex];
        const roundNumber = currentMatch.throws.filter(t => t.playerIndex === playerIndex).length + 1;

        // Calculer les scores pour l'historique
        const scores = throws.map(Rules.calculateScore);
        const totalScore = scores.reduce((a, b) => a + b, 0);

        const throwRecord = {
            id: Storage.generateId(),
            playerIndex,
            round: roundNumber,
            throw: throws,
            scores,
            roundTotal: totalScore,
            runningTotal: currentScore,  // Score ne change pas
            isValid: false,
            reason: reason || 'Volée invalide',
            timestamp: Date.now()
        };

        // Ajouter à l'historique SANS modifier le score
        currentMatch.throws.push(throwRecord);

        // Passer au joueur suivant
        currentMatch.currentPlayerIndex = 1 - currentMatch.currentPlayerIndex;

        // Incrémenter le tour quand on revient au joueur 0 et vérifier la limite DNF
        if (currentMatch.currentPlayerIndex === 0) {
            currentMatch.currentRound += 1;

            // Vérifier si on a atteint la limite
            if (currentMatch.roundLimit && currentMatch.currentRound > currentMatch.roundLimit) {
                // DNF - Did Not Finish
                currentMatch.endDate = Date.now();
                currentMatch.isDNF = true;
                currentMatch.winner = null;

                // Sauvegarder le match DNF
                Storage.addMatch(currentMatch);

                // Mettre à jour le comptage de DNF pour les joueurs
                if (!currentMatch.isTraining) {
                    Players.recordDNF(currentMatch.playerIds[0]);
                    Players.recordDNF(currentMatch.playerIds[1]);
                } else {
                    Players.recordDNF(currentMatch.playerIds[0]);
                }

                return {
                    success: true,
                    valid: false,
                    finished: true,
                    isDNF: true,
                    winner: null
                };
            }
        }

        return {
            success: true,
            valid: false,
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
        addInvalidThrow,
        undoLastThrow,
        getMatchHistory,
        getMatchById,
        getPlayerThrows,
        getCurrentPlayerThrows
    };
})();
