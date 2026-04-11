/**
 * Stats Module
 * Calcule les statistiques détaillées des joueurs
 */

const Stats = (() => {
    /**
     * Calcule la moyenne des scores par volée (averageRoundScore)
     * Basé sur tous les matchs du joueur, volées valides uniquement
     */
    const calculateAverageRoundScore = (playerId) => {
        const matches = Storage.getPlayerMatches(playerId);

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
     */
    const calculateFinishDoubleSuccessRate = (playerId) => {
        const matches = Storage.getPlayerMatches(playerId);
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
     */
    const collectAllThrows = (playerId) => {
        const matches = Storage.getPlayerMatches(playerId);
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
     */
    const calculateTopThrows = (playerId) => {
        const throwsMap = collectAllThrows(playerId);
        const matches = Storage.getPlayerMatches(playerId);
        
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
     */
    const calculateBestFinishingScore = (playerId) => {
        const matches = Storage.getPlayerMatches(playerId);
        const wonMatches = matches.filter(m => m.winner === playerId);

        if (wonMatches.length === 0) return 0;

        let bestScore = 0;

        wonMatches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);
            const playerThrows = match.throws.filter(t => t.playerIndex === playerIndex);

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
     */
    const collectFinishingDoubles = (playerId) => {
        const matches = Storage.getPlayerMatches(playerId);
        const wonMatches = matches.filter(m => m.winner === playerId);
        const doublesMap = new Map(); // key: "segment", value: {segment, multiplier: 2, count}

        wonMatches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);
            const playerThrows = match.throws.filter(t => t.playerIndex === playerIndex);

            // Trouver la dernière volée
            if (playerThrows.length > 0) {
                const lastThrow = playerThrows[playerThrows.length - 1];
                if (lastThrow.throw) {
                    // Trouver la dernière fléchette qui est un double
                    for (let i = lastThrow.throw.length - 1; i >= 0; i--) {
                        const dart = lastThrow.throw[i];
                        if (dart.multiplier === 2 && dart.segment && dart.segment !== 0 && dart.segment !== -1) {
                            const key = `${dart.segment}`;
                            
                            if (!doublesMap.has(key)) {
                                doublesMap.set(key, {
                                    segment: dart.segment,
                                    multiplier: 2,
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
     */
    const calculatePreferredFinishingDouble = (playerId) => {
        const doublesMap = collectFinishingDoubles(playerId);
        
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

        const matches = Storage.getPlayerMatches(playerId);

        // Calculer les stats basiques
        const wins = matches.filter(m => m.winner === playerId).length;
        const totalMatches = matches.length;
        const losses = totalMatches - wins;

        // Calculer les stats détaillées
        const averageRoundScore = calculateAverageRoundScore(playerId);
        const finishDoubleSuccessRate = calculateFinishDoubleSuccessRate(playerId);
        const topThrows = calculateTopThrows(playerId);
        const bestFinishingScore = calculateBestFinishingScore(playerId);
        const preferredFinishingDouble = calculatePreferredFinishingDouble(playerId);

        // Mettre à jour le joueur
        const updatedStats = {
            totalMatches,
            wins,
            losses,
            averageRoundScore: parseFloat(averageRoundScore.toFixed(2)),
            finishDoubleSuccessRate: parseFloat(finishDoubleSuccessRate.toFixed(1)),
            bestFinishingScore,
            topThrows,
            preferredFinishingDouble
        };

        return Storage.updatePlayerStats(playerId, updatedStats);
    };

    /**
     * Obtient les statistiques formatées pour l'affichage
     */
    const getFormattedStats = (playerId) => {
        const player = Storage.getPlayerById(playerId);
        if (!player) return null;

        return {
            player,
            stats: player.stats,
            displayStats: {
                matchesInfo: `${player.stats.totalMatches} (${player.stats.wins} wins, ${player.stats.losses} losses)`,
                winRate: player.stats.totalMatches > 0 ? ((player.stats.wins / player.stats.totalMatches) * 100).toFixed(1) : '0',
                averageRoundScore: (player.stats.averageRoundScore || 0).toFixed(1),
                finishDoubleSuccessRate: (player.stats.finishDoubleSuccessRate || 0).toFixed(1),
                bestFinishingScore: player.stats.bestFinishingScore || 'N/A',
                topThrows: player.stats.topThrows || [],
                preferredFinishingDouble: player.stats.preferredFinishingDouble || null
            }
        };
    };

    return {
        calculateAverageRoundScore,
        calculateFinishDoubleSuccessRate,
        calculateTopThrows,
        calculateBestFinishingScore,
        calculatePreferredFinishingDouble,
        updatePlayerStats,
        getFormattedStats
    };
})();
