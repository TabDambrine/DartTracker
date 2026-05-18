/**
 * Games Module
 * Gere la logique des matchs.
 */

const Games = (() => {
    let currentMatch = null;

    const getPlayerCount = (match) => match?.playerIds?.length || 0;

    const isGhostId = (playerId) => playerId === 'ghost' || String(playerId || '').startsWith('ghost:');

    const getGhostId = (playerIndex) => `ghost:${playerIndex}`;

    const getGhostProfile = (match, playerIndex) => {
        if (!match) return null;

        if (match.ghostProfiles && match.ghostProfiles[playerIndex]) {
            return match.ghostProfiles[playerIndex];
        }

        if (match.playerIds[playerIndex] === 'ghost') {
            return {
                playerId: match.ghostProfilePlayerId,
                name: match.ghostProfileName,
                snapshot: match.ghostProfileSnapshot
            };
        }

        return null;
    };

    const getGhostDisplayName = (match, playerIndex) => {
        const profile = getGhostProfile(match, playerIndex);
        return profile?.name ? `Ghost de ${profile.name}` : 'Ghost';
    };

    const getDisplayPlayer = (match, playerIndex) => {
        const playerId = match.playerIds[playerIndex];
        if (isGhostId(playerId)) {
            return { id: playerId, name: getGhostDisplayName(match, playerIndex) };
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

    const normalizeParticipants = (player1Id, player2Id, options = {}) => {
        if (Array.isArray(options.participants)) {
            return options.participants.filter(p => p && p.playerId);
        }

        return [
            { playerId: player1Id, isGhost: false },
            { playerId: player2Id, isGhost: options.mode === 'ghost' }
        ];
    };

    const createMatch = (player1Id, player2Id, gameType, roundLimit = null, options = {}) => {
        const startScore = gameType === '501' ? 501 : 301;
        const participants = normalizeParticipants(player1Id, player2Id, options);
        const playerIds = [];
        const ghostProfiles = {};

        participants.forEach((participant, index) => {
            if (participant.isGhost) {
                const ghostProfilePlayer = Players.getById(participant.playerId);
                playerIds.push(getGhostId(index));
                ghostProfiles[index] = {
                    playerId: participant.playerId,
                    name: ghostProfilePlayer ? ghostProfilePlayer.name : null,
                    snapshot: createGhostSnapshot(ghostProfilePlayer)
                };
            } else {
                playerIds.push(participant.playerId);
            }
        });

        const ghostIndexes = playerIds
            .map((id, index) => isGhostId(id) ? index : -1)
            .filter(index => index !== -1);
        const humanIds = playerIds.filter(id => !isGhostId(id));
        const isGhost = ghostIndexes.length > 0;
        const isSelfPlay = humanIds.length === 2 && humanIds[0] === humanIds[1] && !isGhost;
        const mode = options.mode || (isGhost ? 'ghost' : (isSelfPlay ? 'training' : 'competition'));
        const isTraining = isSelfPlay || isGhost;
        const legacyGhostProfile = ghostIndexes.length === 1 ? ghostProfiles[ghostIndexes[0]] : null;

        const match = {
            id: Storage.generateId(),
            playerIds,
            participantCount: playerIds.length,
            mode,
            isSelfPlay,
            isTraining,
            isGhost,
            ghostIndexes,
            ghostProfiles,
            ghostProfilePlayerId: legacyGhostProfile ? legacyGhostProfile.playerId : null,
            ghostProfileName: legacyGhostProfile ? legacyGhostProfile.name : null,
            ghostProfileSnapshot: legacyGhostProfile ? legacyGhostProfile.snapshot : null,
            gameType,
            roundLimit,
            currentRound: 1,
            isDNF: false,
            startDate: Date.now(),
            endDate: null,
            winner: null,
            currentPlayerIndex: 0,
            scores: playerIds.map(() => startScore),
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
        return getDisplayPlayer(currentMatch, (currentMatch.currentPlayerIndex + 1) % getPlayerCount(currentMatch));
    };

    const getHumanPlayerIds = (match) => Array.from(new Set(
        match.playerIds.filter(id => !isGhostId(id) && id !== 'deleted_player')
    ));

    const updateStatsForHumanPlayers = (match) => {
        getHumanPlayerIds(match).forEach(playerId => {
            Stats.updatePlayerTrainingStats(playerId);
            Stats.updatePlayerStats(playerId);
        });
    };

    const updateStatsAfterFinishedMatch = (match, winnerIndex) => {
        if (match.isGhost || match.isSelfPlay) {
            updateStatsForHumanPlayers(match);
            return;
        }

        match.playerIds.forEach((playerId, index) => {
            if (isGhostId(playerId) || playerId === 'deleted_player') return;
            Players.updateAfterMatch(playerId, index === winnerIndex);
            Stats.updatePlayerStats(playerId);
        });
    };

    const updateStatsAfterDNF = (match) => {
        if (match.isGhost || match.isSelfPlay) {
            updateStatsForHumanPlayers(match);
            return;
        }

        match.playerIds.forEach(playerId => {
            if (isGhostId(playerId) || playerId === 'deleted_player') return;
            Players.recordDNF(playerId);
        });
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

    const advanceTurn = (valid) => {
        currentMatch.currentPlayerIndex = (currentMatch.currentPlayerIndex + 1) % getPlayerCount(currentMatch);

        if (currentMatch.currentPlayerIndex === 0) {
            currentMatch.currentRound += 1;
            const roundLimitResult = checkRoundLimit(valid);
            if (roundLimitResult) return roundLimitResult;
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

        const roundLimitResult = advanceTurn(true);
        if (roundLimitResult) return roundLimitResult;

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

        const roundLimitResult = advanceTurn(false);
        if (roundLimitResult) return roundLimitResult;

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
        getCurrentPlayerThrows,
        getPlayerCount,
        isGhostId,
        getGhostProfile,
        getGhostDisplayName
    };
})();
