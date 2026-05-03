/**
 * Stats Helpers Module
 * Fournit des fonctions utilitaires pour éviter la duplication dans stats.js
 * entre les fonctions de compétition et d'entraînement
 */

const StatsHelpers = (() => {
    /**
     * Filtre les matchs selon le contexte (compétition ou entraînement)
     * @param {Array} matches - Liste des matchs du joueur
     * @param {Object} options - Options de filtrage
     * @param {boolean} options.includeTraining - Inclure les matchs d'entraînement
     * @param {boolean} options.onlyTraining - Uniquement les matchs d'entraînement
     * @param {string|null} options.gameType - Filtrer par type de jeu
     * @param {boolean} options.excludeDNF - Exclure les DNF
     * @param {boolean} options.excludeDeleted - Exclure les matchs avec joueurs supprimés
     * @returns {Array} - Matchs filtrés
     */
    const filterMatches = (matches, options = {}) => {
        const {
            includeTraining = false,
            onlyTraining = false,
            gameType = null,
            excludeDNF = true,
            excludeDeleted = true
        } = options;

        return matches.filter(match => {
            // Exclure les matchs avec joueurs supprimés
            if (excludeDeleted && hasDeletedPlayer(match)) {
                return false;
            }

            // Filtrer par type de match (compétition vs entraînement)
            if (onlyTraining && !match.isSelfPlay) {
                return false;
            }
            if (!includeTraining && !onlyTraining && match.isSelfPlay) {
                return false;
            }

            // Exclure les DNF
            if (excludeDNF && match.isDNF) {
                return false;
            }

            // Filtrer par type de jeu
            if (gameType && match.gameType !== gameType) {
                return false;
            }

            return true;
        });
    };

    /**
     * Vérifie si un match contient un joueur supprimé
     */
    const hasDeletedPlayer = (match) => {
        return match.playerIds.includes('deleted_player') || match.winner === 'deleted_player';
    };

    /**
     * Vérifie si un match est un DNF (Did Not Finish)
     */
    const isDNF = (match) => {
        return match.isDNF === true;
    };

    /**
     * Vérifie si un match est un self-play
     */
    const isSelfPlayMatch = (match) => {
        return match.isSelfPlay === true;
    };

    /**
     * Crée une fonction de calcul de moyenne par volée
     * @param {Object} options - Options de filtrage
     * @returns {Function} - Fonction de calcul
     */
    const createAverageRoundScoreCalculator = (options) => {
        return (playerId, gameType = null) => {
            let matches = Storage.getPlayerMatches(playerId);
            matches = filterMatches(matches, { ...options, gameType });

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
    };

    /**
     * Crée une fonction de calcul du taux de réussite au double
     * @param {Object} options - Options de filtrage
     * @returns {Function} - Fonction de calcul
     */
    const createFinishDoubleSuccessRateCalculator = (options) => {
        return (playerId, gameType = null) => {
            let matches = Storage.getPlayerMatches(playerId);
            matches = filterMatches(matches, { ...options, gameType, excludeDNF: false });

            const wonMatches = matches.filter(m => m.winner === playerId);

            if (wonMatches.length === 0) return 0;

            let finishDoubleCount = 0;

            wonMatches.forEach(match => {
                const playerIndex = match.playerIds.indexOf(playerId);
                const lastThrows = match.throws
                    .filter(t => t.playerIndex === playerIndex)
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

            return wonMatches.length > 0 ? (finishDoubleCount / wonMatches.length) * 100 : 0;
        };
    };

    /**
     * Crée une fonction de collecte des fléchettes
     * @param {Object} options - Options de filtrage
     * @returns {Function} - Fonction de collecte
     */
    const createThrowsCollector = (options) => {
        return (playerId, gameType = null) => {
            let matches = Storage.getPlayerMatches(playerId);
            matches = filterMatches(matches, { ...options, gameType, excludeDNF: false });

            const throwsMap = new Map();

            matches.forEach(match => {
                const playerIndex = match.playerIds.indexOf(playerId);

                match.throws.forEach(throwRecord => {
                    if (throwRecord.playerIndex === playerIndex && throwRecord.throw) {
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
    };

    /**
     * Crée une fonction de calcul du meilleur score de finish
     * @param {Object} options - Options de filtrage
     * @returns {Function} - Fonction de calcul
     */
    const createBestFinishingScoreCalculator = (options) => {
        return (playerId, gameType = null) => {
            let matches = Storage.getPlayerMatches(playerId);
            matches = filterMatches(matches, { ...options, gameType });

            const wonMatches = matches.filter(m => m.winner === playerId);

            if (wonMatches.length === 0) return 0;

            let bestScore = 0;

            wonMatches.forEach(match => {
                const playerIndex = match.playerIds.indexOf(playerId);
                const playerThrows = match.throws.filter(t => t.playerIndex === playerIndex);

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
    };

    /**
     * Crée une fonction de collecte des doubles de finition
     * @param {Object} options - Options de filtrage
     * @returns {Function} - Fonction de collecte
     */
    const createFinishingDoublesCollector = (options) => {
        return (playerId, gameType = null) => {
            let matches = Storage.getPlayerMatches(playerId);
            matches = filterMatches(matches, { ...options, gameType, excludeDNF: false });

            const wonMatches = matches.filter(m => m.winner === playerId);
            const doublesMap = new Map();

            wonMatches.forEach(match => {
                const playerIndex = match.playerIds.indexOf(playerId);
                const playerThrows = match.throws.filter(t => t.playerIndex === playerIndex);

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
    };

    /**
     * Crée une fonction de calcul du double préféré
     * @param {Object} options - Options de filtrage
     * @returns {Function} - Fonction de calcul
     */
    const createPreferredFinishingDoubleCalculator = (options) => {
        const collectFinishingDoubles = createFinishingDoublesCollector(options);
        
        return (playerId, gameType = null) => {
            const doublesMap = collectFinishingDoubles(playerId, gameType);

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
    };

    /**
     * Crée une fonction de calcul des top fléchettes
     * @param {Object} options - Options de filtrage
     * @returns {Function} - Fonction de calcul
     */
    const createTopThrowsCalculator = (options) => {
        const collectThrows = createThrowsCollector(options);
        
        return (playerId, gameType = null) => {
            const throwsMap = collectThrows(playerId, gameType);
            let matches = Storage.getPlayerMatches(playerId);
            matches = filterMatches(matches, { ...options, gameType, excludeDNF: true });

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

            return Array.from(throwsMap.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
                .map(throw_ => ({
                    segment: throw_.segment,
                    multiplier: throw_.multiplier,
                    count: throw_.count,
                    percentage: (throw_.count / totalDarts) * 100
                }));
        };
    };

    return {
        filterMatches,
        hasDeletedPlayer,
        isDNF,
        isSelfPlayMatch,
        createAverageRoundScoreCalculator,
        createFinishDoubleSuccessRateCalculator,
        createThrowsCollector,
        createBestFinishingScoreCalculator,
        createFinishingDoublesCollector,
        createPreferredFinishingDoubleCalculator,
        createTopThrowsCalculator
    };
})();
