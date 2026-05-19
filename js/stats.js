/**
 * Stats Module
 * Calcule les statistiques détaillées des joueurs
 */

const Stats = (() => {
    /**
     * Vérifie si un match contient un joueur supprimé
     */
    const hasDeletedPlayer = (match) => {
        return match.playerIds.includes('deleted_player') || match.winner === 'deleted_player';
    };

    /**
     * Vérifie si un match est un DNF (Did Not Finish)
     * Les DNF ne comptent pas dans les statistiques
     */
    const isDNF = (match) => {
        return match.isDNF === true;
    };

    /**
     * Vérifie si un match est un self-play (même joueur contre lui-même)
     * Les self-play ne comptent pas dans les statistiques
     */
    const isSelfPlayMatch = (match) => {
        return match.isSelfPlay === true || isGhostMatch(match);
    };

    const isGhostMatch = (match) => {
        return match.isGhost === true || match.mode === 'ghost';
    };

    const isTrainingMatchForPlayer = (match, playerId) => {
        if (hasDeletedPlayer(match)) return false;
        if (match.isSelfPlay === true && match.playerIds.includes(playerId)) return true;
        return isGhostMatch(match) && match.playerIds.includes(playerId);
    };

    const getTrainingPlayerIndexes = (match, playerId) => {
        if (isGhostMatch(match)) {
            return match.playerIds
                .map((id, index) => id === playerId ? index : -1)
                .filter(index => index !== -1);
        }

        if (match.isSelfPlay === true && match.playerIds.includes(playerId)) {
            return [0, 1];
        }

        return [];
    };

    const isHumanTrainingThrow = (match, playerId, throwRecord) => {
        return throwRecord.isSimulated !== true &&
            getTrainingPlayerIndexes(match, playerId).includes(throwRecord.playerIndex);
    };

    const isTrainingFinishedByPlayer = (match, playerId) => {
        if (match.isDNF === true) return false;
        return match.winner === playerId;
    };

    const createEmptyHighScoreRounds = () => ({
        score100Plus: 0,
        score140Plus: 0,
        score160Plus: 0,
        score180: 0
    });

    const FINISH_ZONES = [
        { key: 'zone2To40', min: 2, max: 40, label: '2-40' },
        { key: 'zone41To80', min: 41, max: 80, label: '41-80' },
        { key: 'zone81To120', min: 81, max: 120, label: '81-120' },
        { key: 'zone121To170', min: 121, max: 170, label: '121-170' }
    ];

    const createEmptyFinishZoneBreakdown = () => ({
        zone2To40: 0,
        zone41To80: 0,
        zone81To120: 0,
        zone121To170: 0
    });

    const createEmptyFinishZoneRates = () => ({
        zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
        zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
        zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
        zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
    });

    const createEmptyThrowTypeBreakdown = () => ({
        singles: 0,
        doubles: 0,
        triples: 0,
        bulls: 0,
        totalDarts: 0
    });

    const createEmptyRegularity = () => ({
        standardDeviation: 0,
        roundsCount: 0,
        label: 'N/A'
    });

    const createEmptyCheckoutAverage = () => ({
        averageFinishScore: 0,
        finishesCount: 0
    });

    const createEmptyRecentTrend = (windowSize = 12) => ({
        points: [],
        windowSize,
        minScore: 0,
        maxScore: 0
    });

    const createEmptySegmentCounts = () => {
        const counts = {};

        for (let segment = 1; segment <= 20; segment += 1) {
            counts[segment] = 0;
        }

        return counts;
    };

    const createEmptyTargetHeatmap = () => ({
        singles: createEmptySegmentCounts(),
        doubles: createEmptySegmentCounts(),
        triples: createEmptySegmentCounts(),
        outerBull: 0,
        bullseye: 0,
        totalHits: 0,
        maxCount: 0
    });

    const filterMatchesByGameType = (matches, gameType = null) => {
        if (!gameType) return matches;
        return matches.filter(match => match.gameType === gameType);
    };

    const sortRoundRecordsByScore = (a, b) => {
        if (b.throwRecord.roundTotal !== a.throwRecord.roundTotal) {
            return b.throwRecord.roundTotal - a.throwRecord.roundTotal;
        }

        return b.throwRecord.timestamp - a.throwRecord.timestamp;
    };

    const mapRoundRecordToSummary = ({ match, throwRecord }) => ({
        matchId: match.id,
        gameType: match.gameType,
        round: throwRecord.round,
        roundTotal: throwRecord.roundTotal,
        throw: throwRecord.throw,
        timestamp: throwRecord.timestamp
    });

    const collectCompetitionRoundRecords = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match) && !isDNF(match) && !isSelfPlayMatch(match));

        matches = filterMatchesByGameType(matches, gameType);

        const roundRecords = [];

        matches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);

            match.throws.forEach(throwRecord => {
                if (throwRecord.playerIndex === playerIndex && throwRecord.isSimulated !== true) {
                    roundRecords.push({ match, throwRecord });
                }
            });
        });

        return roundRecords;
    };

    const collectTrainingRoundRecords = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId) && !isDNF(match));

        matches = filterMatchesByGameType(matches, gameType);

        const roundRecords = [];

        matches.forEach(match => {
            match.throws.forEach(throwRecord => {
                if (isHumanTrainingThrow(match, playerId, throwRecord)) {
                    roundRecords.push({ match, throwRecord });
                }
            });
        });

        return roundRecords;
    };

    const calculateBestRoundFromRecords = (roundRecords) => {
        const bestRoundRecord = roundRecords
            .filter(({ throwRecord }) => throwRecord.isValid)
            .sort(sortRoundRecordsByScore)[0];

        return bestRoundRecord ? mapRoundRecordToSummary(bestRoundRecord) : null;
    };

    const calculateTopRoundsFromRecords = (roundRecords, limit = 10) => {
        return roundRecords
            .filter(({ throwRecord }) => throwRecord.isValid)
            .sort(sortRoundRecordsByScore)
            .slice(0, limit)
            .map(mapRoundRecordToSummary);
    };

    const calculateHighScoreRoundsFromRecords = (roundRecords) => {
        const highScoreRounds = createEmptyHighScoreRounds();

        roundRecords.forEach(({ throwRecord }) => {
            if (!throwRecord.isValid) return;

            if (throwRecord.roundTotal >= 100) highScoreRounds.score100Plus += 1;
            if (throwRecord.roundTotal >= 140) highScoreRounds.score140Plus += 1;
            if (throwRecord.roundTotal >= 160) highScoreRounds.score160Plus += 1;
            if (throwRecord.roundTotal === 180) highScoreRounds.score180 += 1;
        });

        return highScoreRounds;
    };

    const calculateInvalidRoundStatsFromRecords = (roundRecords) => {
        const totalRoundsPlayed = roundRecords.length;
        const invalidRounds = roundRecords.filter(({ throwRecord }) => !throwRecord.isValid).length;

        return {
            totalRoundsPlayed,
            invalidRounds,
            invalidRoundRate: totalRoundsPlayed > 0 ? (invalidRounds / totalRoundsPlayed) * 100 : 0
        };
    };

    const calculateAverageFromRoundRecords = (roundRecords) => {
        const validRoundRecords = roundRecords.filter(({ throwRecord }) => throwRecord.isValid);

        if (validRoundRecords.length === 0) {
            return {
                averageRoundScore: 0,
                roundsCount: 0
            };
        }

        const totalScore = validRoundRecords.reduce((sum, { throwRecord }) => sum + throwRecord.roundTotal, 0);

        return {
            averageRoundScore: totalScore / validRoundRecords.length,
            roundsCount: validRoundRecords.length
        };
    };

    const calculateFirstNineAverageFromRecords = (roundRecords) => {
        const firstNineRounds = roundRecords.filter(({ throwRecord }) =>
            throwRecord.isValid && throwRecord.round <= 3
        );

        return calculateAverageFromRoundRecords(firstNineRounds);
    };

    const createEmptyRecentAverage = (windowSize = 10) => ({
        averageRoundScore: 0,
        roundsCount: 0,
        windowSize
    });

    const calculateRecentAverageFromRecords = (roundRecords, windowSize = 10) => {
        const recentValidRounds = roundRecords
            .filter(({ throwRecord }) => throwRecord.isValid)
            .sort((a, b) => b.throwRecord.timestamp - a.throwRecord.timestamp)
            .slice(0, windowSize);

        if (recentValidRounds.length === 0) {
            return createEmptyRecentAverage(windowSize);
        }

        const totalScore = recentValidRounds.reduce((sum, { throwRecord }) => sum + throwRecord.roundTotal, 0);

        return {
            averageRoundScore: totalScore / recentValidRounds.length,
            roundsCount: recentValidRounds.length,
            windowSize
        };
    };

    const calculateRecentTrendFromRecords = (roundRecords, windowSize = 12) => {
        const recentValidRounds = roundRecords
            .filter(({ throwRecord }) => throwRecord.isValid)
            .sort((a, b) => a.throwRecord.timestamp - b.throwRecord.timestamp)
            .slice(-windowSize);

        if (recentValidRounds.length === 0) {
            return createEmptyRecentTrend(windowSize);
        }

        const points = recentValidRounds.map(({ match, throwRecord }, index) => ({
            index: index + 1,
            label: `${match.gameType} - V${throwRecord.round}`,
            round: throwRecord.round,
            gameType: match.gameType,
            score: throwRecord.roundTotal
        }));

        const scores = points.map(point => point.score);

        return {
            points,
            windowSize,
            minScore: Math.min(...scores),
            maxScore: Math.max(...scores)
        };
    };

    const createEmptyOutcomeAverages = (primaryKey, secondaryKey) => ({
        [primaryKey]: { averageRoundScore: 0, roundsCount: 0 },
        [secondaryKey]: { averageRoundScore: 0, roundsCount: 0 }
    });

    const calculateOutcomeAveragesFromRecords = (roundRecords, primaryPredicate, primaryKey, secondaryKey) => {
        const primaryRounds = roundRecords.filter(primaryPredicate);
        const secondaryRounds = roundRecords.filter(record => !primaryPredicate(record));

        return {
            [primaryKey]: calculateAverageFromRoundRecords(primaryRounds),
            [secondaryKey]: calculateAverageFromRoundRecords(secondaryRounds)
        };
    };

    const mapFinishRecordToSummary = ({ match, throwRecord }) => ({
        matchId: match.id,
        gameType: match.gameType,
        round: throwRecord.round,
        finishScore: throwRecord.roundTotal,
        throw: throwRecord.throw,
        timestamp: throwRecord.timestamp
    });

    const sortFinishRecordsByScore = (a, b) => {
        if (b.throwRecord.roundTotal !== a.throwRecord.roundTotal) {
            return b.throwRecord.roundTotal - a.throwRecord.roundTotal;
        }

        return b.throwRecord.timestamp - a.throwRecord.timestamp;
    };

    const calculateTopFinishesFromRecords = (finishRecords, limit = 10) => {
        return finishRecords
            .sort(sortFinishRecordsByScore)
            .slice(0, limit)
            .map(mapFinishRecordToSummary);
    };

    const calculateCheckoutAverageFromFinishRecords = (finishRecords) => {
        if (finishRecords.length === 0) {
            return createEmptyCheckoutAverage();
        }

        const totalFinishScore = finishRecords.reduce((sum, { throwRecord }) => sum + throwRecord.roundTotal, 0);

        return {
            averageFinishScore: totalFinishScore / finishRecords.length,
            finishesCount: finishRecords.length
        };
    };

    const getFinishZoneKey = (score) => {
        const zone = FINISH_ZONES.find(item => score >= item.min && score <= item.max);
        return zone ? zone.key : null;
    };

    const calculateFinishZoneBreakdownFromFinishRecords = (finishRecords) => {
        const breakdown = createEmptyFinishZoneBreakdown();

        finishRecords.forEach(({ throwRecord }) => {
            const zoneKey = getFinishZoneKey(throwRecord.roundTotal);
            if (zoneKey) {
                breakdown[zoneKey] += 1;
            }
        });

        return breakdown;
    };

    const calculateThrowTypeBreakdownFromRecords = (roundRecords) => {
        const breakdown = createEmptyThrowTypeBreakdown();

        roundRecords.forEach(({ throwRecord }) => {
            if (!throwRecord.throw) return;

            throwRecord.throw.forEach(dart => {
                if (!dart || dart.segment === -1) return;

                if (dart.segment === 0 || dart.segment === 25 || dart.segment === 50) {
                    breakdown.bulls += 1;
                    breakdown.totalDarts += 1;
                    return;
                }

                if (dart.multiplier === 1) breakdown.singles += 1;
                if (dart.multiplier === 2) breakdown.doubles += 1;
                if (dart.multiplier === 3) breakdown.triples += 1;
                breakdown.totalDarts += 1;
            });
        });

        return breakdown;
    };

    const calculateTargetHeatmapFromRecords = (roundRecords) => {
        const heatmap = createEmptyTargetHeatmap();

        roundRecords.forEach(({ throwRecord }) => {
            if (!Array.isArray(throwRecord.throw)) return;

            throwRecord.throw.forEach(dart => {
                if (!dart || dart.segment === -1) return;

                if (dart.segment === 25) {
                    heatmap.outerBull += 1;
                    heatmap.totalHits += 1;
                    return;
                }

                if (dart.segment === 0 || dart.segment === 50) {
                    heatmap.bullseye += 1;
                    heatmap.totalHits += 1;
                    return;
                }

                if (dart.segment < 1 || dart.segment > 20) return;

                if (dart.multiplier === 2) {
                    heatmap.doubles[dart.segment] += 1;
                } else if (dart.multiplier === 3) {
                    heatmap.triples[dart.segment] += 1;
                } else {
                    heatmap.singles[dart.segment] += 1;
                }

                heatmap.totalHits += 1;
            });
        });

        const allCounts = [
            ...Object.values(heatmap.singles),
            ...Object.values(heatmap.doubles),
            ...Object.values(heatmap.triples),
            heatmap.outerBull,
            heatmap.bullseye
        ];

        heatmap.maxCount = Math.max(0, ...allCounts);

        return heatmap;
    };

    const getRegularityLabel = (standardDeviation) => {
        if (standardDeviation <= 15) return 'Tres stable';
        if (standardDeviation <= 25) return 'Stable';
        if (standardDeviation <= 35) return 'Variable';
        return 'Tres variable';
    };

    const calculateRegularityFromRecords = (roundRecords) => {
        const validScores = roundRecords
            .filter(({ throwRecord }) => throwRecord.isValid)
            .map(({ throwRecord }) => throwRecord.roundTotal);

        if (validScores.length === 0) {
            return createEmptyRegularity();
        }

        const mean = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
        const variance = validScores.reduce((sum, score) => sum + ((score - mean) ** 2), 0) / validScores.length;
        const standardDeviation = Math.sqrt(variance);

        return {
            standardDeviation,
            roundsCount: validScores.length,
            label: getRegularityLabel(standardDeviation)
        };
    };

    const getRoundStartingScore = (throwRecord) => {
        if (!throwRecord) return null;
        return throwRecord.isValid ? throwRecord.runningTotal + throwRecord.roundTotal : throwRecord.runningTotal;
    };

    const calculateFinishZoneBustRatesFromRecords = (roundRecords) => {
        const zoneRates = createEmptyFinishZoneRates();

        roundRecords.forEach(({ throwRecord }) => {
            const startingScore = getRoundStartingScore(throwRecord);
            const zoneKey = getFinishZoneKey(startingScore);

            if (!zoneKey) return;

            zoneRates[zoneKey].attempts += 1;
            if (!throwRecord.isValid) {
                zoneRates[zoneKey].invalidRounds += 1;
            }
        });

        Object.values(zoneRates).forEach(zone => {
            zone.invalidRoundRate = zone.attempts > 0 ? (zone.invalidRounds / zone.attempts) * 100 : 0;
        });

        return zoneRates;
    };

    const collectCompetitionFinishRecords = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match) && !isDNF(match) && !isSelfPlayMatch(match) && match.winner === playerId);

        matches = filterMatchesByGameType(matches, gameType);

        const finishRecords = [];

        matches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);
            const finishingThrow = match.throws
                .filter(throwRecord =>
                    throwRecord.playerIndex === playerIndex &&
                    throwRecord.isSimulated !== true &&
                    throwRecord.isValid &&
                    throwRecord.runningTotal === 0
                )
                .sort((a, b) => b.timestamp - a.timestamp)[0];

            if (finishingThrow) {
                finishRecords.push({ match, throwRecord: finishingThrow });
            }
        });

        return finishRecords;
    };

    const collectTrainingFinishRecords = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId) && !isDNF(match) && isTrainingFinishedByPlayer(match, playerId));

        matches = filterMatchesByGameType(matches, gameType);

        const finishRecords = [];

        matches.forEach(match => {
            const finishingThrow = match.throws
                .filter(throwRecord =>
                    isHumanTrainingThrow(match, playerId, throwRecord) &&
                    throwRecord.isValid &&
                    throwRecord.runningTotal === 0
                )
                .sort((a, b) => b.timestamp - a.timestamp)[0];

            if (finishingThrow) {
                finishRecords.push({ match, throwRecord: finishingThrow });
            }
        });

        return finishRecords;
    };

    /**
     * Calcule la moyenne des scores par volée (averageRoundScore)
     * Basé sur tous les matchs du joueur, volées valides uniquement
     * Ignore les matchs où un joueur a été supprimé ou en DNF
     * Optionnel: filtre par gameType
     */
    const calculateAverageRoundScore = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match) && !isDNF(match) && !isSelfPlayMatch(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }

        let totalScore = 0;
        let validRoundsCount = 0;

        matches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);

            match.throws.forEach(throwRecord => {
                if (throwRecord.playerIndex === playerIndex && throwRecord.isValid) {
                    totalScore += throwRecord.roundTotal;
                    validRoundsCount += 1;
                }
            });
        });

        return validRoundsCount > 0 ? totalScore / validRoundsCount : 0;
    };

    /**
     * Calcule le taux de réussite au double (finishDoubleSuccessRate)
     * % de matchs où le joueur finit sur la première fléchette avec un double
     * Ignore les matchs où un joueur a été supprimé
     * Optionnel: filtre par gameType
     */
    const calculateFinishDoubleSuccessRate = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match) && !isSelfPlayMatch(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const wonMatches = matches.filter(m => m.winner === playerId);

        if (wonMatches.length === 0) return 0;

        let finishDoubleCount = 0;

        wonMatches.forEach(match => {
            // Trouver la dernière volée du gagnant
            const playerIndex = match.playerIds.indexOf(playerId);
            const lastThrows = match.throws
                .filter(t => t.playerIndex === playerIndex)
                .sort((a, b) => b.timestamp - a.timestamp);

            if (lastThrows.length > 0) {
                const lastThrow = lastThrows[0];
                // Vérifier si la première fléchette est un double
                if (lastThrow.throw && lastThrow.throw[0]) {
                    const firstDart = lastThrow.throw[0];
                    if (firstDart.multiplier === 2) {
                        finishDoubleCount += 1;
                    }
                }
            }
        });

        return wonMatches.length > 0 ? (finishDoubleCount / wonMatches.length) * 100 : 0;
    };

    /**
     * Collecte toutes les fléchettes lancées et compte les occurrences
     * Filtre les MISS (segment = 0 ou -1)
     * Ignore les matchs où un joueur a été supprimé
     * Optionnel: filtre par gameType
     */
    const collectAllThrows = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match) && !isSelfPlayMatch(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const throwsMap = new Map(); // key: "segment-multiplier", value: {segment, multiplier, count}

        matches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);

            match.throws.forEach(throwRecord => {
                if (throwRecord.playerIndex === playerIndex && throwRecord.throw) {
                    throwRecord.throw.forEach(dart => {
                        // Ignorer les MISS (segment 0 ou -1)
                        if (dart.segment && dart.segment !== 0 && dart.segment !== -1) {
                            const key = `${dart.segment}-${dart.multiplier}`;

                            if (!throwsMap.has(key)) {
                                throwsMap.set(key, {
                                    segment: dart.segment,
                                    multiplier: dart.multiplier,
                                    count: 0
                                });
                            }

                            const entry = throwsMap.get(key);
                            entry.count += 1;
                        }
                    });
                }
            });
        });

        return throwsMap;
    };

    /**
     * Calcule les top 10 des fléchettes préférées (topThrows)
     * Inclut le pourcentage d'utilisation
     * Ignore les matchs où un joueur a été supprimé ou en DNF
     * Optionnel: filtre par gameType
     */
    const calculateTopThrows = (playerId, gameType = null) => {
        const throwsMap = collectAllThrows(playerId, gameType);
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match) && !isDNF(match) && !isSelfPlayMatch(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }

        // Compter le total de fléchettes lancées
        let totalDarts = 0;
        matches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);
            match.throws.forEach(throwRecord => {
                if (throwRecord.playerIndex === playerIndex && throwRecord.throw) {
                    totalDarts += throwRecord.throw.filter(d => d.segment && d.segment !== 0 && d.segment !== -1).length;
                }
            });
        });

        if (totalDarts === 0) return [];

        // Convertir la map en array, trier et limiter à 10
        const topThrows = Array.from(throwsMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(throw_ => ({
                segment: throw_.segment,
                multiplier: throw_.multiplier,
                count: throw_.count,
                percentage: (throw_.count / totalDarts) * 100
            }));

        return topThrows;
    };

    /**
     * Calcule le meilleur score de finish (bestFinishingScore)
     * Le score le plus élevé de la volée finale avec laquelle le joueur a remporté une partie
     * Par exemple: si joueur gagne en finissant avec une volée de 80 points, c'est un finish de 80
     * Ignore les matchs où un joueur a été supprimé ou en DNF
     * Optionnel: filtre par gameType
     */
    const calculateBestFinishingScore = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match) && !isDNF(match) && !isSelfPlayMatch(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const wonMatches = matches.filter(m => m.winner === playerId);

        if (wonMatches.length === 0) return 0;

        let bestScore = 0;

        wonMatches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);
            const playerThrows = match.throws.filter(t =>
                t.playerIndex === playerIndex && t.isSimulated !== true
            );

            // Trouver la volée finale (celle où runningTotal === 0)
            if (playerThrows.length > 0) {
                for (let i = playerThrows.length - 1; i >= 0; i--) {
                    const throwRecord = playerThrows[i];
                    if (throwRecord.runningTotal === 0 && throwRecord.isValid) {
                        // C'est la volée qui a fini le match
                        if (throwRecord.roundTotal > bestScore) {
                            bestScore = throwRecord.roundTotal;
                        }
                        break;
                    }
                }
            }
        });

        return bestScore;
    };

    /**
     * Collecte les doubles utilisés pour finir les matchs gagnés
     * Ignore les matchs où un joueur a été supprimé, en DNF, ou self-play
     * Optionnel: filtre par gameType. Si null, prend tous les matchs (y compris entraînement)
     */
    const collectLastDoubleFromThrow = (throwRecord) => {
        if (!throwRecord || !throwRecord.throw) return null;

        for (let i = throwRecord.throw.length - 1; i >= 0; i--) {
            const dart = throwRecord.throw[i];
            if (Rules.isDouble(dart) && dart.segment !== -1) {
                return dart;
            }
        }

        return null;
    };

    const collectFinishingDoubles = (playerId, gameType = null, includeTraining = false) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match));
        
        // Si on veut inclure l'entraînement, on ne filtre pas les self-play
        // Sinon, on filtre les self-play
        if (!includeTraining) {
            matches = matches.filter(match => !isSelfPlayMatch(match));
        }
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const wonMatches = matches.filter(m => m.winner === playerId);
        const doublesMap = new Map(); // key: "segment", value: {segment, multiplier: 2, count}

        wonMatches.forEach(match => {
            if (match.isSelfPlay === true || isGhostMatch(match)) {
                const trainingIndexes = getTrainingPlayerIndexes(match, playerId);
                const humanThrows = match.throws.filter(t =>
                    t.isSimulated !== true && trainingIndexes.includes(t.playerIndex)
                );
                const lastThrow = humanThrows.length > 0 ? humanThrows[humanThrows.length - 1] : null;
                const dart = collectLastDoubleFromThrow(lastThrow);

                if (!dart) return;

                const key = dart.segment === 0 ? 'BULL' : `${dart.segment}`;

                if (!doublesMap.has(key)) {
                    doublesMap.set(key, {
                        segment: dart.segment,
                        multiplier: dart.segment === 0 ? 50 : 2,  // BULL = 50, autres = 2
                        count: 0
                    });
                }

                const entry = doublesMap.get(key);
                entry.count += 1;
                return;
            }

            const playerIndex = match.playerIds.indexOf(playerId);
            const playerThrows = match.throws.filter(t => t.playerIndex === playerIndex);

            // Trouver la dernière volée
            if (playerThrows.length > 0) {
                const lastThrow = playerThrows[playerThrows.length - 1];
                if (lastThrow.throw) {
                    // Trouver la dernière fléchette qui est un double
                    for (let i = lastThrow.throw.length - 1; i >= 0; i--) {
                        const dart = lastThrow.throw[i];
                        // Utiliser Rules.isDouble() pour inclure BULL 50 et doubles normaux
                        if (Rules.isDouble(dart) && dart.segment !== -1) {
                            const key = dart.segment === 0 ? 'BULL' : `${dart.segment}`;

                            if (!doublesMap.has(key)) {
                                doublesMap.set(key, {
                                    segment: dart.segment,
                                    multiplier: dart.segment === 0 ? 50 : 2,  // BULL = 50, autres = 2
                                    count: 0
                                });
                            }

                            const entry = doublesMap.get(key);
                            entry.count += 1;
                            break; // On prend seulement le dernier double de la volée
                        }
                    }
                }
            }
        });

        return doublesMap;
    };

    /**
     * Calcule le double préféré pour finish (preferredFinishingDouble)
     * Par défaut, prend tous les matchs (compétition + entraînement) pour le double global
     * Optionnel: filtre par gameType
     */
    const calculatePreferredFinishingDouble = (playerId, gameType = null) => {
        // Pour le double favori global, on inclut tous les matchs (y compris entraînement)
        const includeTraining = true;
        const doublesMap = collectFinishingDoubles(playerId, gameType, includeTraining);
        
        if (doublesMap.size === 0) return null;

        // Compter le total de finishs
        let totalFinishs = 0;
        doublesMap.forEach(double => {
            totalFinishs += double.count;
        });

        // Trouver le double avec le count le plus élevé
        let preferredDouble = null;
        let maxCount = 0;

        doublesMap.forEach(double => {
            if (double.count > maxCount) {
                maxCount = double.count;
                preferredDouble = {
                    segment: double.segment,
                    multiplier: 2,
                    count: double.count,
                    percentage: (double.count / totalFinishs) * 100
                };
            }
        });

        return preferredDouble;
    };

    /**
     * Recalcule TOUTES les statistiques d'un joueur
     * Doit être appelée après chaque match
     */
    const updatePlayerStats = (playerId) => {
        const player = Storage.getPlayerById(playerId);
        if (!player) return false;

        const matches = Storage.getPlayerMatches(playerId)
            .filter(match => !hasDeletedPlayer(match) && !isSelfPlayMatch(match));
        const roundRecords = collectCompetitionRoundRecords(playerId);
        const finishRecords = collectCompetitionFinishRecords(playerId);
        const highScoreRounds = calculateHighScoreRoundsFromRecords(roundRecords);
        const invalidRoundStats = calculateInvalidRoundStatsFromRecords(roundRecords);
        const firstNineAverage = calculateFirstNineAverageFromRecords(roundRecords);
        const recentAverage = calculateRecentAverageFromRecords(roundRecords);
        const recentTrend = calculateRecentTrendFromRecords(roundRecords);
        const outcomeAverages = calculateOutcomeAveragesFromRecords(
            roundRecords,
            ({ match }) => match.winner === playerId,
            'wins',
            'losses'
        );
        const checkoutAverage = calculateCheckoutAverageFromFinishRecords(finishRecords);
        const finishZoneBreakdown = calculateFinishZoneBreakdownFromFinishRecords(finishRecords);
        const throwTypeBreakdown = calculateThrowTypeBreakdownFromRecords(roundRecords);
        const targetHeatmap = calculateTargetHeatmapFromRecords(roundRecords);
        const regularity = calculateRegularityFromRecords(roundRecords);
        const finishZoneBustRates = calculateFinishZoneBustRatesFromRecords(roundRecords);

        // Calculer les stats basiques (global)
        const wins = matches.filter(m => m.winner === playerId).length;
        const totalMatches = matches.length;
        const losses = totalMatches - wins;

        // Calculer les stats détaillées (global)
        const averageRoundScore = calculateAverageRoundScore(playerId);
        const finishDoubleSuccessRate = calculateFinishDoubleSuccessRate(playerId);
        const topThrows = calculateTopThrows(playerId);
        const bestFinishingScore = calculateBestFinishingScore(playerId);
        const bestRound = calculateBestRoundFromRecords(roundRecords);
        const topRounds = calculateTopRoundsFromRecords(roundRecords);
        const topFinishes = calculateTopFinishesFromRecords(finishRecords);
        // Le double favori est global (tous types de matchs confondus)
        const preferredFinishingDouble = calculatePreferredFinishingDouble(playerId);

        // Calculer les stats par type de jeu
        const byGameType = {};
        ['301', '501'].forEach(gameType => {
            const gameMatches = matches.filter(m => m.gameType === gameType);
            const gameWins = gameMatches.filter(m => m.winner === playerId).length;
            const gameLosses = gameMatches.length - gameWins;
            const gameRoundRecords = collectCompetitionRoundRecords(playerId, gameType);
            const gameFinishRecords = collectCompetitionFinishRecords(playerId, gameType);
            const gameHighScoreRounds = calculateHighScoreRoundsFromRecords(gameRoundRecords);
            const gameInvalidRoundStats = calculateInvalidRoundStatsFromRecords(gameRoundRecords);
            const gameFirstNineAverage = calculateFirstNineAverageFromRecords(gameRoundRecords);
            const gameRecentAverage = calculateRecentAverageFromRecords(gameRoundRecords);
            const gameRecentTrend = calculateRecentTrendFromRecords(gameRoundRecords);
            const gameOutcomeAverages = calculateOutcomeAveragesFromRecords(
                gameRoundRecords,
                ({ match }) => match.winner === playerId,
                'wins',
                'losses'
            );
            const gameCheckoutAverage = calculateCheckoutAverageFromFinishRecords(gameFinishRecords);
            const gameFinishZoneBreakdown = calculateFinishZoneBreakdownFromFinishRecords(gameFinishRecords);
            const gameThrowTypeBreakdown = calculateThrowTypeBreakdownFromRecords(gameRoundRecords);
            const gameTargetHeatmap = calculateTargetHeatmapFromRecords(gameRoundRecords);
            const gameRegularity = calculateRegularityFromRecords(gameRoundRecords);
            const gameFinishZoneBustRates = calculateFinishZoneBustRatesFromRecords(gameRoundRecords);

            byGameType[gameType] = {
                totalMatches: gameMatches.length,
                wins: gameWins,
                losses: gameLosses,
                averageRoundScore: parseFloat(calculateAverageRoundScore(playerId, gameType).toFixed(2)),
                finishDoubleSuccessRate: parseFloat(calculateFinishDoubleSuccessRate(playerId, gameType).toFixed(1)),
                bestFinishingScore: calculateBestFinishingScore(playerId, gameType),
                firstNineAverage: {
                    averageRoundScore: parseFloat(gameFirstNineAverage.averageRoundScore.toFixed(2)),
                    roundsCount: gameFirstNineAverage.roundsCount
                },
                bestRound: calculateBestRoundFromRecords(gameRoundRecords),
                topRounds: calculateTopRoundsFromRecords(gameRoundRecords),
                topFinishes: calculateTopFinishesFromRecords(gameFinishRecords),
                checkoutAverage: {
                    averageFinishScore: parseFloat(gameCheckoutAverage.averageFinishScore.toFixed(2)),
                    finishesCount: gameCheckoutAverage.finishesCount
                },
                finishZoneBreakdown: gameFinishZoneBreakdown,
                recentAverage: {
                    averageRoundScore: parseFloat(gameRecentAverage.averageRoundScore.toFixed(2)),
                    roundsCount: gameRecentAverage.roundsCount,
                    windowSize: gameRecentAverage.windowSize
                },
                recentTrend: gameRecentTrend,
                outcomeAverages: {
                    wins: {
                        averageRoundScore: parseFloat(gameOutcomeAverages.wins.averageRoundScore.toFixed(2)),
                        roundsCount: gameOutcomeAverages.wins.roundsCount
                    },
                    losses: {
                        averageRoundScore: parseFloat(gameOutcomeAverages.losses.averageRoundScore.toFixed(2)),
                        roundsCount: gameOutcomeAverages.losses.roundsCount
                    }
                },
                throwTypeBreakdown: gameThrowTypeBreakdown,
                targetHeatmap: gameTargetHeatmap,
                regularity: {
                    standardDeviation: parseFloat(gameRegularity.standardDeviation.toFixed(2)),
                    roundsCount: gameRegularity.roundsCount,
                    label: gameRegularity.label
                },
                finishZoneBustRates: {
                    zone2To40: {
                        attempts: gameFinishZoneBustRates.zone2To40.attempts,
                        invalidRounds: gameFinishZoneBustRates.zone2To40.invalidRounds,
                        invalidRoundRate: parseFloat(gameFinishZoneBustRates.zone2To40.invalidRoundRate.toFixed(1))
                    },
                    zone41To80: {
                        attempts: gameFinishZoneBustRates.zone41To80.attempts,
                        invalidRounds: gameFinishZoneBustRates.zone41To80.invalidRounds,
                        invalidRoundRate: parseFloat(gameFinishZoneBustRates.zone41To80.invalidRoundRate.toFixed(1))
                    },
                    zone81To120: {
                        attempts: gameFinishZoneBustRates.zone81To120.attempts,
                        invalidRounds: gameFinishZoneBustRates.zone81To120.invalidRounds,
                        invalidRoundRate: parseFloat(gameFinishZoneBustRates.zone81To120.invalidRoundRate.toFixed(1))
                    },
                    zone121To170: {
                        attempts: gameFinishZoneBustRates.zone121To170.attempts,
                        invalidRounds: gameFinishZoneBustRates.zone121To170.invalidRounds,
                        invalidRoundRate: parseFloat(gameFinishZoneBustRates.zone121To170.invalidRoundRate.toFixed(1))
                    }
                },
                highScoreRounds: gameHighScoreRounds,
                total180s: gameHighScoreRounds.score180,
                invalidRounds: gameInvalidRoundStats.invalidRounds,
                totalRoundsPlayed: gameInvalidRoundStats.totalRoundsPlayed,
                invalidRoundRate: parseFloat(gameInvalidRoundStats.invalidRoundRate.toFixed(1)),
                topThrows: calculateTopThrows(playerId, gameType),
                // Pour le double favori par type de jeu, on filtre par gameType mais on inclut tous les matchs
                preferredFinishingDouble: calculatePreferredFinishingDouble(playerId, gameType)
            };
        });

        // Mettre à jour le joueur
        const updatedStats = {
            totalMatches,
            wins,
            losses,
            averageRoundScore: parseFloat(averageRoundScore.toFixed(2)),
            finishDoubleSuccessRate: parseFloat(finishDoubleSuccessRate.toFixed(1)),
            bestFinishingScore,
            firstNineAverage: {
                averageRoundScore: parseFloat(firstNineAverage.averageRoundScore.toFixed(2)),
                roundsCount: firstNineAverage.roundsCount
            },
            bestRound,
            topRounds,
            topFinishes,
            checkoutAverage: {
                averageFinishScore: parseFloat(checkoutAverage.averageFinishScore.toFixed(2)),
                finishesCount: checkoutAverage.finishesCount
            },
            finishZoneBreakdown,
            recentAverage: {
                averageRoundScore: parseFloat(recentAverage.averageRoundScore.toFixed(2)),
                roundsCount: recentAverage.roundsCount,
                windowSize: recentAverage.windowSize
            },
            recentTrend,
            outcomeAverages: {
                wins: {
                    averageRoundScore: parseFloat(outcomeAverages.wins.averageRoundScore.toFixed(2)),
                    roundsCount: outcomeAverages.wins.roundsCount
                },
                losses: {
                    averageRoundScore: parseFloat(outcomeAverages.losses.averageRoundScore.toFixed(2)),
                    roundsCount: outcomeAverages.losses.roundsCount
                }
            },
            throwTypeBreakdown,
            targetHeatmap,
            regularity: {
                standardDeviation: parseFloat(regularity.standardDeviation.toFixed(2)),
                roundsCount: regularity.roundsCount,
                label: regularity.label
            },
            finishZoneBustRates: {
                zone2To40: {
                    attempts: finishZoneBustRates.zone2To40.attempts,
                    invalidRounds: finishZoneBustRates.zone2To40.invalidRounds,
                    invalidRoundRate: parseFloat(finishZoneBustRates.zone2To40.invalidRoundRate.toFixed(1))
                },
                zone41To80: {
                    attempts: finishZoneBustRates.zone41To80.attempts,
                    invalidRounds: finishZoneBustRates.zone41To80.invalidRounds,
                    invalidRoundRate: parseFloat(finishZoneBustRates.zone41To80.invalidRoundRate.toFixed(1))
                },
                zone81To120: {
                    attempts: finishZoneBustRates.zone81To120.attempts,
                    invalidRounds: finishZoneBustRates.zone81To120.invalidRounds,
                    invalidRoundRate: parseFloat(finishZoneBustRates.zone81To120.invalidRoundRate.toFixed(1))
                },
                zone121To170: {
                    attempts: finishZoneBustRates.zone121To170.attempts,
                    invalidRounds: finishZoneBustRates.zone121To170.invalidRounds,
                    invalidRoundRate: parseFloat(finishZoneBustRates.zone121To170.invalidRoundRate.toFixed(1))
                }
            },
            highScoreRounds,
            total180s: highScoreRounds.score180,
            invalidRounds: invalidRoundStats.invalidRounds,
            totalRoundsPlayed: invalidRoundStats.totalRoundsPlayed,
            invalidRoundRate: parseFloat(invalidRoundStats.invalidRoundRate.toFixed(1)),
            topThrows,
            preferredFinishingDouble,
            byGameType
        };

        return Storage.updatePlayerStats(playerId, updatedStats);
    };

    /**
     * Recalcule TOUTES les statistiques d'entraînement d'un joueur
     * Basées uniquement sur les matchs self-play
     */
    const updatePlayerTrainingStats = (playerId) => {
        const player = Storage.getPlayerById(playerId);
        if (!player) return false;

        const matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId));
        const roundRecords = collectTrainingRoundRecords(playerId);
        const finishRecords = collectTrainingFinishRecords(playerId);
        const highScoreRounds = calculateHighScoreRoundsFromRecords(roundRecords);
        const invalidRoundStats = calculateInvalidRoundStatsFromRecords(roundRecords);
        const firstNineAverage = calculateFirstNineAverageFromRecords(roundRecords);
        const recentAverage = calculateRecentAverageFromRecords(roundRecords);
        const recentTrend = calculateRecentTrendFromRecords(roundRecords);
        const outcomeAverages = calculateOutcomeAveragesFromRecords(
            roundRecords,
            ({ match }) => isTrainingFinishedByPlayer(match, playerId),
            'finished',
            'unfinished'
        );
        const checkoutAverage = calculateCheckoutAverageFromFinishRecords(finishRecords);
        const finishZoneBreakdown = calculateFinishZoneBreakdownFromFinishRecords(finishRecords);
        const throwTypeBreakdown = calculateThrowTypeBreakdownFromRecords(roundRecords);
        const targetHeatmap = calculateTargetHeatmapFromRecords(roundRecords);
        const regularity = calculateRegularityFromRecords(roundRecords);
        const finishZoneBustRates = calculateFinishZoneBustRatesFromRecords(roundRecords);

        // Calculer les stats basiques (finished = winner !== null, unfinished = isDNF)
        const finished = matches.filter(m => isTrainingFinishedByPlayer(m, playerId)).length;
        const unfinished = matches.filter(m => !isTrainingFinishedByPlayer(m, playerId)).length;
        const dnf = matches.filter(m => m.isDNF === true).length;
        const totalMatches = matches.length;

        // Calculer les stats détaillées pour l'entraînement
        const averageRoundScore = calculateAverageRoundScoreTraining(playerId);
        const finishDoubleSuccessRate = calculateFinishDoubleSuccessRateTraining(playerId);
        const topThrows = calculateTopThrowsTraining(playerId);
        const bestFinishingScore = calculateBestFinishingScoreTraining(playerId);
        const bestRound = calculateBestRoundFromRecords(roundRecords);
        const topRounds = calculateTopRoundsFromRecords(roundRecords);
        const topFinishes = calculateTopFinishesFromRecords(finishRecords);
        const preferredFinishingDouble = calculatePreferredFinishingDoubleTraining(playerId);

        // Calculer les stats par type de jeu pour l'entraînement
        const byGameType = {};
        ['301', '501'].forEach(gameType => {
            const gameMatches = matches.filter(m => m.gameType === gameType);
            const gameFinished = gameMatches.filter(m => isTrainingFinishedByPlayer(m, playerId)).length;
            const gameUnfinished = gameMatches.filter(m => !isTrainingFinishedByPlayer(m, playerId)).length;
            const gameDnf = gameMatches.filter(m => m.isDNF === true).length;
            const gameRoundRecords = collectTrainingRoundRecords(playerId, gameType);
            const gameFinishRecords = collectTrainingFinishRecords(playerId, gameType);
            const gameHighScoreRounds = calculateHighScoreRoundsFromRecords(gameRoundRecords);
            const gameInvalidRoundStats = calculateInvalidRoundStatsFromRecords(gameRoundRecords);
            const gameFirstNineAverage = calculateFirstNineAverageFromRecords(gameRoundRecords);
            const gameRecentAverage = calculateRecentAverageFromRecords(gameRoundRecords);
            const gameRecentTrend = calculateRecentTrendFromRecords(gameRoundRecords);
            const gameOutcomeAverages = calculateOutcomeAveragesFromRecords(
                gameRoundRecords,
                ({ match }) => isTrainingFinishedByPlayer(match, playerId),
                'finished',
                'unfinished'
            );
            const gameCheckoutAverage = calculateCheckoutAverageFromFinishRecords(gameFinishRecords);
            const gameFinishZoneBreakdown = calculateFinishZoneBreakdownFromFinishRecords(gameFinishRecords);
            const gameThrowTypeBreakdown = calculateThrowTypeBreakdownFromRecords(gameRoundRecords);
            const gameTargetHeatmap = calculateTargetHeatmapFromRecords(gameRoundRecords);
            const gameRegularity = calculateRegularityFromRecords(gameRoundRecords);
            const gameFinishZoneBustRates = calculateFinishZoneBustRatesFromRecords(gameRoundRecords);

            byGameType[gameType] = {
                totalMatches: gameMatches.length,
                finished: gameFinished,
                unfinished: gameUnfinished,
                dnf: gameDnf,
                averageRoundScore: parseFloat(calculateAverageRoundScoreTraining(playerId, gameType).toFixed(2)),
                finishDoubleSuccessRate: parseFloat(calculateFinishDoubleSuccessRateTraining(playerId, gameType).toFixed(1)),
                bestFinishingScore: calculateBestFinishingScoreTraining(playerId, gameType),
                firstNineAverage: {
                    averageRoundScore: parseFloat(gameFirstNineAverage.averageRoundScore.toFixed(2)),
                    roundsCount: gameFirstNineAverage.roundsCount
                },
                bestRound: calculateBestRoundFromRecords(gameRoundRecords),
                topRounds: calculateTopRoundsFromRecords(gameRoundRecords),
                topFinishes: calculateTopFinishesFromRecords(gameFinishRecords),
                checkoutAverage: {
                    averageFinishScore: parseFloat(gameCheckoutAverage.averageFinishScore.toFixed(2)),
                    finishesCount: gameCheckoutAverage.finishesCount
                },
                finishZoneBreakdown: gameFinishZoneBreakdown,
                recentAverage: {
                    averageRoundScore: parseFloat(gameRecentAverage.averageRoundScore.toFixed(2)),
                    roundsCount: gameRecentAverage.roundsCount,
                    windowSize: gameRecentAverage.windowSize
                },
                recentTrend: gameRecentTrend,
                outcomeAverages: {
                    finished: {
                        averageRoundScore: parseFloat(gameOutcomeAverages.finished.averageRoundScore.toFixed(2)),
                        roundsCount: gameOutcomeAverages.finished.roundsCount
                    },
                    unfinished: {
                        averageRoundScore: parseFloat(gameOutcomeAverages.unfinished.averageRoundScore.toFixed(2)),
                        roundsCount: gameOutcomeAverages.unfinished.roundsCount
                    }
                },
                throwTypeBreakdown: gameThrowTypeBreakdown,
                targetHeatmap: gameTargetHeatmap,
                regularity: {
                    standardDeviation: parseFloat(gameRegularity.standardDeviation.toFixed(2)),
                    roundsCount: gameRegularity.roundsCount,
                    label: gameRegularity.label
                },
                finishZoneBustRates: {
                    zone2To40: {
                        attempts: gameFinishZoneBustRates.zone2To40.attempts,
                        invalidRounds: gameFinishZoneBustRates.zone2To40.invalidRounds,
                        invalidRoundRate: parseFloat(gameFinishZoneBustRates.zone2To40.invalidRoundRate.toFixed(1))
                    },
                    zone41To80: {
                        attempts: gameFinishZoneBustRates.zone41To80.attempts,
                        invalidRounds: gameFinishZoneBustRates.zone41To80.invalidRounds,
                        invalidRoundRate: parseFloat(gameFinishZoneBustRates.zone41To80.invalidRoundRate.toFixed(1))
                    },
                    zone81To120: {
                        attempts: gameFinishZoneBustRates.zone81To120.attempts,
                        invalidRounds: gameFinishZoneBustRates.zone81To120.invalidRounds,
                        invalidRoundRate: parseFloat(gameFinishZoneBustRates.zone81To120.invalidRoundRate.toFixed(1))
                    },
                    zone121To170: {
                        attempts: gameFinishZoneBustRates.zone121To170.attempts,
                        invalidRounds: gameFinishZoneBustRates.zone121To170.invalidRounds,
                        invalidRoundRate: parseFloat(gameFinishZoneBustRates.zone121To170.invalidRoundRate.toFixed(1))
                    }
                },
                highScoreRounds: gameHighScoreRounds,
                total180s: gameHighScoreRounds.score180,
                invalidRounds: gameInvalidRoundStats.invalidRounds,
                totalRoundsPlayed: gameInvalidRoundStats.totalRoundsPlayed,
                invalidRoundRate: parseFloat(gameInvalidRoundStats.invalidRoundRate.toFixed(1)),
                topThrows: calculateTopThrowsTraining(playerId, gameType),
                preferredFinishingDouble: calculatePreferredFinishingDoubleTraining(playerId, gameType)
            };
        });

        // Mettre à jour les stats d'entraînement
        const updatedTrainingStats = {
            totalMatches,
            finished,
            unfinished,
            dnf,
            averageRoundScore: parseFloat(averageRoundScore.toFixed(2)),
            finishDoubleSuccessRate: parseFloat(finishDoubleSuccessRate.toFixed(1)),
            bestFinishingScore,
            firstNineAverage: {
                averageRoundScore: parseFloat(firstNineAverage.averageRoundScore.toFixed(2)),
                roundsCount: firstNineAverage.roundsCount
            },
            bestRound,
            topRounds,
            topFinishes,
            checkoutAverage: {
                averageFinishScore: parseFloat(checkoutAverage.averageFinishScore.toFixed(2)),
                finishesCount: checkoutAverage.finishesCount
            },
            finishZoneBreakdown,
            recentAverage: {
                averageRoundScore: parseFloat(recentAverage.averageRoundScore.toFixed(2)),
                roundsCount: recentAverage.roundsCount,
                windowSize: recentAverage.windowSize
            },
            recentTrend,
            outcomeAverages: {
                finished: {
                    averageRoundScore: parseFloat(outcomeAverages.finished.averageRoundScore.toFixed(2)),
                    roundsCount: outcomeAverages.finished.roundsCount
                },
                unfinished: {
                    averageRoundScore: parseFloat(outcomeAverages.unfinished.averageRoundScore.toFixed(2)),
                    roundsCount: outcomeAverages.unfinished.roundsCount
                }
            },
            throwTypeBreakdown,
            targetHeatmap,
            regularity: {
                standardDeviation: parseFloat(regularity.standardDeviation.toFixed(2)),
                roundsCount: regularity.roundsCount,
                label: regularity.label
            },
            finishZoneBustRates: {
                zone2To40: {
                    attempts: finishZoneBustRates.zone2To40.attempts,
                    invalidRounds: finishZoneBustRates.zone2To40.invalidRounds,
                    invalidRoundRate: parseFloat(finishZoneBustRates.zone2To40.invalidRoundRate.toFixed(1))
                },
                zone41To80: {
                    attempts: finishZoneBustRates.zone41To80.attempts,
                    invalidRounds: finishZoneBustRates.zone41To80.invalidRounds,
                    invalidRoundRate: parseFloat(finishZoneBustRates.zone41To80.invalidRoundRate.toFixed(1))
                },
                zone81To120: {
                    attempts: finishZoneBustRates.zone81To120.attempts,
                    invalidRounds: finishZoneBustRates.zone81To120.invalidRounds,
                    invalidRoundRate: parseFloat(finishZoneBustRates.zone81To120.invalidRoundRate.toFixed(1))
                },
                zone121To170: {
                    attempts: finishZoneBustRates.zone121To170.attempts,
                    invalidRounds: finishZoneBustRates.zone121To170.invalidRounds,
                    invalidRoundRate: parseFloat(finishZoneBustRates.zone121To170.invalidRoundRate.toFixed(1))
                }
            },
            highScoreRounds,
            total180s: highScoreRounds.score180,
            invalidRounds: invalidRoundStats.invalidRounds,
            totalRoundsPlayed: invalidRoundStats.totalRoundsPlayed,
            invalidRoundRate: parseFloat(invalidRoundStats.invalidRoundRate.toFixed(1)),
            topThrows,
            preferredFinishingDouble,
            byGameType
        };

        return Storage.updatePlayerTrainingStats(playerId, updatedTrainingStats);
    };

    /**
     * Calcule la moyenne des scores par volée pour l'entraînement
     * Optionnel: filtre par gameType
     */
    const calculateAverageRoundScoreTraining = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId) && !isDNF(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }

        let totalScore = 0;
        let validRoundsCount = 0;

        matches.forEach(match => {
            match.throws.forEach(throwRecord => {
                if (throwRecord.isValid && isHumanTrainingThrow(match, playerId, throwRecord)) {
                    totalScore += throwRecord.roundTotal;
                    validRoundsCount += 1;
                }
            });
        });

        return validRoundsCount > 0 ? totalScore / validRoundsCount : 0;
    };

    /**
     * Calcule le taux de réussite au double pour l'entraînement
     * Optionnel: filtre par gameType
     */
    const calculateFinishDoubleSuccessRateTraining = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const finishedMatches = matches.filter(m => isTrainingFinishedByPlayer(m, playerId));

        if (finishedMatches.length === 0) return 0;

        let finishDoubleCount = 0;

        finishedMatches.forEach(match => {
            const lastThrows = match.throws
                .filter(t => isHumanTrainingThrow(match, playerId, t))
                .sort((a, b) => b.timestamp - a.timestamp);
            if (lastThrows.length > 0) {
                const lastThrow = lastThrows[0];
                if (lastThrow.throw && lastThrow.throw[0]) {
                    const firstDart = lastThrow.throw[0];
                    if (firstDart.multiplier === 2) {
                        finishDoubleCount += 1;
                    }
                }
            }
        });

        return finishedMatches.length > 0 ? (finishDoubleCount / finishedMatches.length) * 100 : 0;
    };

    /**
     * Collecte les fléchettes pour l'entraînement
     * Optionnel: filtre par gameType
     */
    const collectAllThrowsTraining = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const throwsMap = new Map();

        matches.forEach(match => {
            match.throws.forEach(throwRecord => {
                if (throwRecord.throw && isHumanTrainingThrow(match, playerId, throwRecord)) {
                    throwRecord.throw.forEach(dart => {
                        if (dart.segment && dart.segment !== 0 && dart.segment !== -1) {
                            const key = `${dart.segment}-${dart.multiplier}`;

                            if (!throwsMap.has(key)) {
                                throwsMap.set(key, {
                                    segment: dart.segment,
                                    multiplier: dart.multiplier,
                                    count: 0
                                });
                            }

                            const entry = throwsMap.get(key);
                            entry.count += 1;
                        }
                    });
                }
            });
        });

        return throwsMap;
    };

    /**
     * Calcule les top 10 des fléchettes préférées pour l'entraînement
     * Optionnel: filtre par gameType
     */
    const calculateTopThrowsTraining = (playerId, gameType = null) => {
        const throwsMap = collectAllThrowsTraining(playerId, gameType);
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId) && !isDNF(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }

        let totalDarts = 0;
        matches.forEach(match => {
            match.throws.forEach(throwRecord => {
                if (throwRecord.throw && isHumanTrainingThrow(match, playerId, throwRecord)) {
                    totalDarts += throwRecord.throw.filter(d => d.segment && d.segment !== 0 && d.segment !== -1).length;
                }
            });
        });

        if (totalDarts === 0) return [];

        const topThrows = Array.from(throwsMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(throw_ => ({
                segment: throw_.segment,
                multiplier: throw_.multiplier,
                count: throw_.count,
                percentage: (throw_.count / totalDarts) * 100
            }));

        return topThrows;
    };

    /**
     * Calcule le meilleur score de finish pour l'entraînement
     * Optionnel: filtre par gameType
     */
    const calculateBestFinishingScoreTraining = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId) && !isDNF(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const finishedMatches = matches.filter(m => isTrainingFinishedByPlayer(m, playerId));

        if (finishedMatches.length === 0) return 0;

        let bestScore = 0;

        finishedMatches.forEach(match => {
            const playerThrows = match.throws.filter(t => isHumanTrainingThrow(match, playerId, t));

            if (playerThrows.length > 0) {
                for (let i = playerThrows.length - 1; i >= 0; i--) {
                    const throwRecord = playerThrows[i];
                    if (throwRecord.runningTotal === 0 && throwRecord.isValid) {
                        if (throwRecord.roundTotal > bestScore) {
                            bestScore = throwRecord.roundTotal;
                        }
                        break;
                    }
                }
            }
        });

        return bestScore;
    };

    /**
     * Collecte les doubles de finition pour l'entraînement
     * Optionnel: filtre par gameType
     */
    const collectFinishingDoublesTraining = (playerId, gameType = null) => {
        let matches = Storage.getPlayerMatches(playerId)
            .filter(match => isTrainingMatchForPlayer(match, playerId));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const finishedMatches = matches.filter(m => isTrainingFinishedByPlayer(m, playerId));
        const doublesMap = new Map();

        finishedMatches.forEach(match => {
            const playerThrows = match.throws.filter(t => isHumanTrainingThrow(match, playerId, t));

            if (playerThrows.length > 0) {
                const lastThrow = playerThrows[playerThrows.length - 1];
                if (lastThrow.throw) {
                    for (let i = lastThrow.throw.length - 1; i >= 0; i--) {
                        const dart = lastThrow.throw[i];
                        if (Rules.isDouble(dart) && dart.segment !== -1) {
                            const key = dart.segment === 0 ? 'BULL' : `${dart.segment}`;

                            if (!doublesMap.has(key)) {
                                doublesMap.set(key, {
                                    segment: dart.segment,
                                    multiplier: dart.segment === 0 ? 50 : 2,
                                    count: 0
                                });
                            }

                            const entry = doublesMap.get(key);
                            entry.count += 1;
                            break;
                        }
                    }
                }
            }
        });

        return doublesMap;
    };

    /**
     * Calcule le double préféré pour l'entraînement
     * Optionnel: filtre par gameType
     */
    const calculatePreferredFinishingDoubleTraining = (playerId, gameType = null) => {
        const doublesMap = collectFinishingDoublesTraining(playerId, gameType);

        if (doublesMap.size === 0) return null;

        let totalFinishs = 0;
        doublesMap.forEach(double => {
            totalFinishs += double.count;
        });

        let preferredDouble = null;
        let maxCount = 0;

        doublesMap.forEach(double => {
            if (double.count > maxCount) {
                maxCount = double.count;
                preferredDouble = {
                    segment: double.segment,
                    multiplier: 2,
                    count: double.count,
                    percentage: (double.count / totalFinishs) * 100
                };
            }
        });

        return preferredDouble;
    };

    /**
     * Obtient les statistiques formatées pour l'affichage
     */
    const getFormattedStats = (playerId) => {
        const player = Storage.getPlayerById(playerId);
        if (!player) return null;

        // Stats globales
        const globalStats = {
            matchesInfo: `${player.stats.totalMatches} (${player.stats.wins} wins, ${player.stats.losses} losses)`,
            winRate: player.stats.totalMatches > 0 ? ((player.stats.wins / player.stats.totalMatches) * 100).toFixed(1) : '0',
            averageRoundScore: (player.stats.averageRoundScore || 0).toFixed(1),
            finishDoubleSuccessRate: (player.stats.finishDoubleSuccessRate || 0).toFixed(1),
            bestFinishingScore: player.stats.bestFinishingScore || 'N/A',
            firstNineAverage: {
                averageRoundScore: ((player.stats.firstNineAverage?.averageRoundScore) || 0).toFixed(1),
                roundsCount: player.stats.firstNineAverage?.roundsCount || 0
            },
            bestRound: player.stats.bestRound || null,
            topRounds: player.stats.topRounds || [],
            topFinishes: player.stats.topFinishes || [],
            checkoutAverage: {
                averageFinishScore: ((player.stats.checkoutAverage?.averageFinishScore) || 0).toFixed(1),
                finishesCount: player.stats.checkoutAverage?.finishesCount || 0
            },
            finishZoneBreakdown: player.stats.finishZoneBreakdown || createEmptyFinishZoneBreakdown(),
            recentAverage: {
                averageRoundScore: ((player.stats.recentAverage?.averageRoundScore) || 0).toFixed(1),
                roundsCount: player.stats.recentAverage?.roundsCount || 0,
                windowSize: player.stats.recentAverage?.windowSize || 10
            },
            recentTrend: player.stats.recentTrend || createEmptyRecentTrend(),
            outcomeAverages: player.stats.outcomeAverages || createEmptyOutcomeAverages('wins', 'losses'),
            throwTypeBreakdown: player.stats.throwTypeBreakdown || createEmptyThrowTypeBreakdown(),
            targetHeatmap: player.stats.targetHeatmap || createEmptyTargetHeatmap(),
            regularity: {
                standardDeviation: ((player.stats.regularity?.standardDeviation) || 0).toFixed(1),
                roundsCount: player.stats.regularity?.roundsCount || 0,
                label: player.stats.regularity?.label || 'N/A'
            },
            finishZoneBustRates: player.stats.finishZoneBustRates || createEmptyFinishZoneRates(),
            highScoreRounds: player.stats.highScoreRounds || createEmptyHighScoreRounds(),
            total180s: player.stats.total180s || 0,
            invalidRounds: player.stats.invalidRounds || 0,
            totalRoundsPlayed: player.stats.totalRoundsPlayed || 0,
            invalidRoundRate: (player.stats.invalidRoundRate || 0).toFixed(1),
            topThrows: player.stats.topThrows || [],
            preferredFinishingDouble: player.stats.preferredFinishingDouble || null
        };

        // Stats par type de jeu
        const byGameType = {};
        if (player.stats.byGameType) {
            ['301', '501'].forEach(gameType => {
                const gameStats = player.stats.byGameType[gameType];
                if (gameStats) {
                    byGameType[gameType] = {
                        matchesInfo: `${gameStats.totalMatches} (${gameStats.wins} wins, ${gameStats.losses} losses)`,
                        winRate: gameStats.totalMatches > 0 ? ((gameStats.wins / gameStats.totalMatches) * 100).toFixed(1) : '0',
                        averageRoundScore: (gameStats.averageRoundScore || 0).toFixed(1),
                        finishDoubleSuccessRate: (gameStats.finishDoubleSuccessRate || 0).toFixed(1),
                        bestFinishingScore: gameStats.bestFinishingScore || 'N/A',
                        firstNineAverage: {
                            averageRoundScore: ((gameStats.firstNineAverage?.averageRoundScore) || 0).toFixed(1),
                            roundsCount: gameStats.firstNineAverage?.roundsCount || 0
                        },
                        bestRound: gameStats.bestRound || null,
                        topRounds: gameStats.topRounds || [],
                        topFinishes: gameStats.topFinishes || [],
                        checkoutAverage: {
                            averageFinishScore: ((gameStats.checkoutAverage?.averageFinishScore) || 0).toFixed(1),
                            finishesCount: gameStats.checkoutAverage?.finishesCount || 0
                        },
                        finishZoneBreakdown: gameStats.finishZoneBreakdown || createEmptyFinishZoneBreakdown(),
                        recentAverage: {
                            averageRoundScore: ((gameStats.recentAverage?.averageRoundScore) || 0).toFixed(1),
                            roundsCount: gameStats.recentAverage?.roundsCount || 0,
                            windowSize: gameStats.recentAverage?.windowSize || 10
                        },
                        recentTrend: gameStats.recentTrend || createEmptyRecentTrend(),
                        outcomeAverages: gameStats.outcomeAverages || createEmptyOutcomeAverages('wins', 'losses'),
                        throwTypeBreakdown: gameStats.throwTypeBreakdown || createEmptyThrowTypeBreakdown(),
                        targetHeatmap: gameStats.targetHeatmap || createEmptyTargetHeatmap(),
                        regularity: {
                            standardDeviation: ((gameStats.regularity?.standardDeviation) || 0).toFixed(1),
                            roundsCount: gameStats.regularity?.roundsCount || 0,
                            label: gameStats.regularity?.label || 'N/A'
                        },
                        finishZoneBustRates: gameStats.finishZoneBustRates || createEmptyFinishZoneRates(),
                        highScoreRounds: gameStats.highScoreRounds || createEmptyHighScoreRounds(),
                        total180s: gameStats.total180s || 0,
                        invalidRounds: gameStats.invalidRounds || 0,
                        totalRoundsPlayed: gameStats.totalRoundsPlayed || 0,
                        invalidRoundRate: (gameStats.invalidRoundRate || 0).toFixed(1),
                        topThrows: gameStats.topThrows || [],
                        preferredFinishingDouble: gameStats.preferredFinishingDouble || null
                    };
                }
            });
        }

        return {
            player,
            stats: player.stats,
            displayStats: globalStats,
            byGameType: byGameType
        };
    };

    /**
     * Obtient les statistiques d'entraînement formatées pour l'affichage
     */
    const getFormattedTrainingStats = (playerId) => {
        const player = Storage.getPlayerById(playerId);
        if (!player) return null;

        const trainingStats = player.trainingStats || {
            totalMatches: 0,
            finished: 0,
            unfinished: 0,
            dnf: 0,
            averageRoundScore: 0,
            finishDoubleSuccessRate: 0,
            bestFinishingScore: 0,
            firstNineAverage: { averageRoundScore: 0, roundsCount: 0 },
            checkoutAverage: { averageFinishScore: 0, finishesCount: 0 },
            finishZoneBreakdown: createEmptyFinishZoneBreakdown(),
            recentTrend: createEmptyRecentTrend(),
            throwTypeBreakdown: createEmptyThrowTypeBreakdown(),
            targetHeatmap: createEmptyTargetHeatmap(),
            regularity: createEmptyRegularity(),
            finishZoneBustRates: createEmptyFinishZoneRates(),
            topThrows: [],
            preferredFinishingDouble: null,
            byGameType: {
                '301': {},
                '501': {}
            }
        };

        // Stats globales d'entraînement
        const globalTrainingStats = {
            matchesInfo: `${trainingStats.totalMatches} (${trainingStats.finished} finished, ${trainingStats.unfinished} unfinished)`,
            finishRate: trainingStats.totalMatches > 0 ? ((trainingStats.finished / trainingStats.totalMatches) * 100).toFixed(1) : '0',
            averageRoundScore: (trainingStats.averageRoundScore || 0).toFixed(1),
            finishDoubleSuccessRate: (trainingStats.finishDoubleSuccessRate || 0).toFixed(1),
            bestFinishingScore: trainingStats.bestFinishingScore || 'N/A',
            firstNineAverage: {
                averageRoundScore: ((trainingStats.firstNineAverage?.averageRoundScore) || 0).toFixed(1),
                roundsCount: trainingStats.firstNineAverage?.roundsCount || 0
            },
            bestRound: trainingStats.bestRound || null,
            topRounds: trainingStats.topRounds || [],
            topFinishes: trainingStats.topFinishes || [],
            checkoutAverage: {
                averageFinishScore: ((trainingStats.checkoutAverage?.averageFinishScore) || 0).toFixed(1),
                finishesCount: trainingStats.checkoutAverage?.finishesCount || 0
            },
            finishZoneBreakdown: trainingStats.finishZoneBreakdown || createEmptyFinishZoneBreakdown(),
            recentAverage: {
                averageRoundScore: ((trainingStats.recentAverage?.averageRoundScore) || 0).toFixed(1),
                roundsCount: trainingStats.recentAverage?.roundsCount || 0,
                windowSize: trainingStats.recentAverage?.windowSize || 10
            },
            recentTrend: trainingStats.recentTrend || createEmptyRecentTrend(),
            outcomeAverages: trainingStats.outcomeAverages || createEmptyOutcomeAverages('finished', 'unfinished'),
            throwTypeBreakdown: trainingStats.throwTypeBreakdown || createEmptyThrowTypeBreakdown(),
            targetHeatmap: trainingStats.targetHeatmap || createEmptyTargetHeatmap(),
            regularity: {
                standardDeviation: ((trainingStats.regularity?.standardDeviation) || 0).toFixed(1),
                roundsCount: trainingStats.regularity?.roundsCount || 0,
                label: trainingStats.regularity?.label || 'N/A'
            },
            finishZoneBustRates: trainingStats.finishZoneBustRates || createEmptyFinishZoneRates(),
            highScoreRounds: trainingStats.highScoreRounds || createEmptyHighScoreRounds(),
            total180s: trainingStats.total180s || 0,
            invalidRounds: trainingStats.invalidRounds || 0,
            totalRoundsPlayed: trainingStats.totalRoundsPlayed || 0,
            invalidRoundRate: (trainingStats.invalidRoundRate || 0).toFixed(1),
            topThrows: trainingStats.topThrows || [],
            preferredFinishingDouble: trainingStats.preferredFinishingDouble || null
        };

        // Stats par type de jeu pour l'entraînement
        const byGameType = {};
        if (trainingStats.byGameType) {
            ['301', '501'].forEach(gameType => {
                const gameStats = trainingStats.byGameType[gameType];
                if (gameStats) {
                    byGameType[gameType] = {
                        matchesInfo: `${gameStats.totalMatches} (${gameStats.finished} finished, ${gameStats.unfinished} unfinished)`,
                        finishRate: gameStats.totalMatches > 0 ? ((gameStats.finished / gameStats.totalMatches) * 100).toFixed(1) : '0',
                        averageRoundScore: (gameStats.averageRoundScore || 0).toFixed(1),
                        finishDoubleSuccessRate: (gameStats.finishDoubleSuccessRate || 0).toFixed(1),
                        bestFinishingScore: gameStats.bestFinishingScore || 'N/A',
                        firstNineAverage: {
                            averageRoundScore: ((gameStats.firstNineAverage?.averageRoundScore) || 0).toFixed(1),
                            roundsCount: gameStats.firstNineAverage?.roundsCount || 0
                        },
                        bestRound: gameStats.bestRound || null,
                        topRounds: gameStats.topRounds || [],
                        topFinishes: gameStats.topFinishes || [],
                        checkoutAverage: {
                            averageFinishScore: ((gameStats.checkoutAverage?.averageFinishScore) || 0).toFixed(1),
                            finishesCount: gameStats.checkoutAverage?.finishesCount || 0
                        },
                        finishZoneBreakdown: gameStats.finishZoneBreakdown || createEmptyFinishZoneBreakdown(),
                        recentAverage: {
                            averageRoundScore: ((gameStats.recentAverage?.averageRoundScore) || 0).toFixed(1),
                            roundsCount: gameStats.recentAverage?.roundsCount || 0,
                            windowSize: gameStats.recentAverage?.windowSize || 10
                        },
                        recentTrend: gameStats.recentTrend || createEmptyRecentTrend(),
                        outcomeAverages: gameStats.outcomeAverages || createEmptyOutcomeAverages('finished', 'unfinished'),
                        throwTypeBreakdown: gameStats.throwTypeBreakdown || createEmptyThrowTypeBreakdown(),
                        targetHeatmap: gameStats.targetHeatmap || createEmptyTargetHeatmap(),
                        regularity: {
                            standardDeviation: ((gameStats.regularity?.standardDeviation) || 0).toFixed(1),
                            roundsCount: gameStats.regularity?.roundsCount || 0,
                            label: gameStats.regularity?.label || 'N/A'
                        },
                        finishZoneBustRates: gameStats.finishZoneBustRates || createEmptyFinishZoneRates(),
                        highScoreRounds: gameStats.highScoreRounds || createEmptyHighScoreRounds(),
                        total180s: gameStats.total180s || 0,
                        invalidRounds: gameStats.invalidRounds || 0,
                        totalRoundsPlayed: gameStats.totalRoundsPlayed || 0,
                        invalidRoundRate: (gameStats.invalidRoundRate || 0).toFixed(1),
                        topThrows: gameStats.topThrows || [],
                        preferredFinishingDouble: gameStats.preferredFinishingDouble || null
                    };
                }
            });
        }

        return {
            player,
            trainingStats: trainingStats,
            displayStats: globalTrainingStats,
            byGameType: byGameType
        };
    };

    /**
     * Recalcule TOUTES les statistiques (compétition et entraînement) pour tous les joueurs
     * Utile pour les migrations ou réinitialisation des stats
     */
    const recalculateAllStats = () => {
        const players = Storage.getPlayers();
        let updatedCount = 0;

        players.forEach(player => {
            if (!player.id.includes('deleted')) {
                updatePlayerStats(player.id);
                updatePlayerTrainingStats(player.id);
                updatedCount += 1;
            }
        });

        return updatedCount;
    };

    return {
        calculateAverageRoundScore,
        calculateFinishDoubleSuccessRate,
        calculateTopThrows,
        calculateBestFinishingScore,
        calculatePreferredFinishingDouble,
        updatePlayerStats,
        getFormattedStats,
        updatePlayerTrainingStats,
        calculateAverageRoundScoreTraining,
        calculateFinishDoubleSuccessRateTraining,
        calculateTopThrowsTraining,
        calculateBestFinishingScoreTraining,
        calculatePreferredFinishingDoubleTraining,
        getFormattedTrainingStats,
        recalculateAllStats
    };
})();
