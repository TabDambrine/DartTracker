/**
 * Games Module
 * Gere la logique des matchs.
 */

const Games = (() => {
    let currentMatch = null;

    const getGhostDisplayName = (match) => {
        return match.ghostProfileName ? `Ghost de ${match.ghostProfileName}` : 'Ghost';
    };

    const getDisplayPlayer = (match, playerIndex) => {
        const playerId = match.playerIds[playerIndex];
        if (playerId === 'ghost') {
            return { id: 'ghost', name: getGhostDisplayName(match) };
        }
        return Players.getById(playerId);
    };

    const createGhostSnapshot = (player) => {
        if (!player) return null;
        return {
            id: player.id,
            name: player.name,
            stats: JSON.parse(JSON.stringify(player.stats || {})),
            trainingStats: JSON.parse(JSON.stringify(player.trainingStats || {}))
        };
    };

    const createMatch = (player1Id, player2Id, gameType, roundLimit = null, options = {}) => {
        const startScore = gameType === '501' ? 501 : 301;
        const isSelfPlay = player1Id === player2Id;
        const mode = options.mode || (isSelfPlay ? 'training' : 'competition');
        const isGhost = mode === 'ghost';
        const ghostProfilePlayer = isGhost ? Players.getById(player2Id) : null;

        const match = {
            id: Storage.generateId(),
            playerIds: [player1Id, isGhost ? 'ghost' : player2Id],
            mode,
            isSelfPlay,
            isTraining: isSelfPlay || isGhost,
            isGhost,
            ghostProfilePlayerId: isGhost ? player2Id : null,
            ghostProfileName: ghostProfilePlayer ? ghostProfilePlayer.name : null,
            ghostProfileSnapshot: createGhostSnapshot(ghostProfilePlayer),
            gameType,
            roundLimit,
            currentRound: 1,
            isDNF: false,
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

    const getCurrentMatch = () => currentMatch;

    const setCurrentMatch = (match) => {
        currentMatch = match;
    };

    const clearCurrentMatch = () => {
        currentMatch = null;
    };

    const getCurrentPlayer = () => {
        if (!currentMatch) return null;
        return getDisplayPlayer(currentMatch, currentMatch.currentPlayerIndex);
    };

    const getOtherPlayer = () => {
        if (!currentMatch) return null;
        return getDisplayPlayer(currentMatch, 1 - currentMatch.currentPlayerIndex);
    };

    const updateStatsAfterFinishedMatch = (match, winnerIndex) => {
        if (match.isGhost) {
            Stats.updatePlayerTrainingStats(match.playerIds[0]);
            Stats.updatePlayerStats(match.playerIds[0]);
            return;
        }

        if (match.isSelfPlay) {
            Stats.updatePlayerTrainingStats(match.playerIds[winnerIndex]);
            Stats.updatePlayerStats(match.playerIds[winnerIndex]);
            return;
        }

        Players.updateAfterMatch(match.playerIds[winnerIndex], true);
        Players.updateAfterMatch(match.playerIds[1 - winnerIndex], false);
        Stats.updatePlayerStats(match.playerIds[winnerIndex]);
        Stats.updatePlayerStats(match.playerIds[1 - winnerIndex]);
    };

    const updateStatsAfterDNF = (match) => {
        if (match.isGhost) {
            Stats.updatePlayerTrainingStats(match.playerIds[0]);
            Stats.updatePlayerStats(match.playerIds[0]);
            return;
        }

        if (match.isSelfPlay) {
            Stats.updatePlayerTrainingStats(match.playerIds[0]);
            return;
        }

        Players.recordDNF(match.playerIds[0]);
        Players.recordDNF(match.playerIds[1]);
    };

    const finishAsDNF = (valid) => {
        currentMatch.endDate = Date.now();
        currentMatch.isDNF = true;
        currentMatch.winner = null;

        Storage.addMatch(currentMatch);
        updateStatsAfterDNF(currentMatch);

        return {
            success: true,
            valid,
            finished: true,
            isDNF: true,
            winner: null
        };
    };

    const checkRoundLimit = (valid) => {
        if (currentMatch.roundLimit && currentMatch.currentRound > currentMatch.roundLimit) {
            return finishAsDNF(valid);
        }
        return null;
    };

    const addThrowWithOptions = (throws, options = {}) => {
        if (!currentMatch) {
            throw new Error('Aucun match en cours');
        }

        const playerIndex = currentMatch.currentPlayerIndex;
        const currentScore = currentMatch.scores[playerIndex];
        const validation = Rules.validateRound(currentMatch.gameType, currentScore, throws);

        if (!validation.valid) {
            return {
                success: false,
                valid: false,
                reason: validation.reason
            };
        }

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
            isSimulated: options.isSimulated === true,
            source: options.isSimulated === true ? 'ghost' : 'human',
            timestamp: Date.now()
        };

        currentMatch.throws.push(throwRecord);
        currentMatch.scores[playerIndex] = newScore;

        if (validation.finished) {
            currentMatch.endDate = Date.now();
            currentMatch.winner = currentMatch.playerIds[playerIndex];
            currentMatch.isDNF = false;

            Storage.addMatch(currentMatch);
            updateStatsAfterFinishedMatch(currentMatch, playerIndex);

            return {
                success: true,
                valid: true,
                finished: true,
                winner: getDisplayPlayer(currentMatch, playerIndex)
            };
        }

        currentMatch.currentPlayerIndex = 1 - currentMatch.currentPlayerIndex;

        if (currentMatch.currentPlayerIndex === 0) {
            currentMatch.currentRound += 1;
            const roundLimitResult = checkRoundLimit(true);
            if (roundLimitResult) return roundLimitResult;
        }

        return {
            success: true,
            valid: true,
            finished: false,
            throwRecord
        };
    };

    const addThrow = (throws) => {
        return addThrowWithOptions(throws, { isSimulated: false });
    };

    const addSimulatedThrow = (throws) => {
        return addThrowWithOptions(throws, { isSimulated: true });
    };

    const addInvalidThrow = (throws, reason) => {
        if (!currentMatch) {
            throw new Error('Aucun match en cours');
        }

        const playerIndex = currentMatch.currentPlayerIndex;
        const currentScore = currentMatch.scores[playerIndex];
        const roundNumber = currentMatch.throws.filter(t => t.playerIndex === playerIndex).length + 1;
        const scores = throws.map(Rules.calculateScore);
        const totalScore = scores.reduce((a, b) => a + b, 0);

        const throwRecord = {
            id: Storage.generateId(),
            playerIndex,
            round: roundNumber,
            throw: throws,
            scores,
            roundTotal: totalScore,
            runningTotal: currentScore,
            isValid: false,
            isSimulated: false,
            source: 'human',
            reason: reason || 'Volee invalide',
            timestamp: Date.now()
        };

        currentMatch.throws.push(throwRecord);
        currentMatch.currentPlayerIndex = 1 - currentMatch.currentPlayerIndex;

        if (currentMatch.currentPlayerIndex === 0) {
            currentMatch.currentRound += 1;
            const roundLimitResult = checkRoundLimit(false);
            if (roundLimitResult) return roundLimitResult;
        }

        return {
            success: true,
            valid: false,
            finished: false,
            throwRecord
        };
    };

    const undoLastThrow = () => {
        if (!currentMatch || currentMatch.throws.length === 0) {
            return false;
        }

        const playerIndex = currentMatch.currentPlayerIndex;
        const lastThrowIndex = currentMatch.throws.findLastIndex(t => t.playerIndex === playerIndex);

        if (lastThrowIndex === -1) {
            return false;
        }

        const lastThrow = currentMatch.throws[lastThrowIndex];
        currentMatch.scores[playerIndex] = lastThrow.runningTotal + lastThrow.roundTotal;
        currentMatch.throws.splice(lastThrowIndex, 1);

        return true;
    };

    const getMatchHistory = () => Storage.getMatches();

    const getMatchById = (id) => Storage.getMatchById(id);

    const getPlayerThrows = (playerIndex) => {
        if (!currentMatch) return [];
        return currentMatch.throws.filter(t => t.playerIndex === playerIndex);
    };

    const getCurrentPlayerThrows = () => {
        if (!currentMatch) return [];
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
        addSimulatedThrow,
        addInvalidThrow,
        undoLastThrow,
        getMatchHistory,
        getMatchById,
        getPlayerThrows,
        getCurrentPlayerThrows
    };
})();
