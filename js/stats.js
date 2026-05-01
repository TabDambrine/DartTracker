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
        return match.isSelfPlay === true;
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
            .filter(match => !hasDeletedPlayer(match) && !isDNF(match));
        
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
     * Ignore les matchs où un joueur a été supprimé, en DNF, ou self-play
     * Optionnel: filtre par gameType. Si null, prend tous les matchs (y compris entraînement)
     */
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

        // Calculer les stats basiques (global)
        const wins = matches.filter(m => m.winner === playerId).length;
        const totalMatches = matches.length;
        const losses = totalMatches - wins;

        // Calculer les stats détaillées (global)
        const averageRoundScore = calculateAverageRoundScore(playerId);
        const finishDoubleSuccessRate = calculateFinishDoubleSuccessRate(playerId);
        const topThrows = calculateTopThrows(playerId);
        const bestFinishingScore = calculateBestFinishingScore(playerId);
        // Le double favori est global (tous types de matchs confondus)
        const preferredFinishingDouble = calculatePreferredFinishingDouble(playerId);

        // Calculer les stats par type de jeu
        const byGameType = {};
        ['301', '501'].forEach(gameType => {
            const gameMatches = matches.filter(m => m.gameType === gameType);
            const gameWins = gameMatches.filter(m => m.winner === playerId).length;
            const gameLosses = gameMatches.length - gameWins;

            byGameType[gameType] = {
                totalMatches: gameMatches.length,
                wins: gameWins,
                losses: gameLosses,
                averageRoundScore: parseFloat(calculateAverageRoundScore(playerId, gameType).toFixed(2)),
                finishDoubleSuccessRate: parseFloat(calculateFinishDoubleSuccessRate(playerId, gameType).toFixed(1)),
                bestFinishingScore: calculateBestFinishingScore(playerId, gameType),
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
            .filter(match => match.isSelfPlay === true && !hasDeletedPlayer(match));

        // Calculer les stats basiques (finished = winner !== null, unfinished = isDNF)
        const finished = matches.filter(m => m.winner !== null && !m.isDNF).length;
        const unfinished = matches.filter(m => m.isDNF === true).length;
        const totalMatches = matches.length;

        // Calculer les stats détaillées pour l'entraînement
        const averageRoundScore = calculateAverageRoundScoreTraining(playerId);
        const finishDoubleSuccessRate = calculateFinishDoubleSuccessRateTraining(playerId);
        const topThrows = calculateTopThrowsTraining(playerId);
        const bestFinishingScore = calculateBestFinishingScoreTraining(playerId);
        const preferredFinishingDouble = calculatePreferredFinishingDoubleTraining(playerId);

        // Calculer les stats par type de jeu pour l'entraînement
        const byGameType = {};
        ['301', '501'].forEach(gameType => {
            const gameMatches = matches.filter(m => m.gameType === gameType);
            const gameFinished = gameMatches.filter(m => m.winner !== null && !m.isDNF).length;
            const gameUnfinished = gameMatches.filter(m => m.isDNF === true).length;

            byGameType[gameType] = {
                totalMatches: gameMatches.length,
                finished: gameFinished,
                unfinished: gameUnfinished,
                dnf: gameUnfinished,
                averageRoundScore: parseFloat(calculateAverageRoundScoreTraining(playerId, gameType).toFixed(2)),
                finishDoubleSuccessRate: parseFloat(calculateFinishDoubleSuccessRateTraining(playerId, gameType).toFixed(1)),
                bestFinishingScore: calculateBestFinishingScoreTraining(playerId, gameType),
                topThrows: calculateTopThrowsTraining(playerId, gameType),
                preferredFinishingDouble: calculatePreferredFinishingDoubleTraining(playerId, gameType)
            };
        });

        // Mettre à jour les stats d'entraînement
        const updatedTrainingStats = {
            totalMatches,
            finished,
            unfinished,
            dnf: unfinished,
            averageRoundScore: parseFloat(averageRoundScore.toFixed(2)),
            finishDoubleSuccessRate: parseFloat(finishDoubleSuccessRate.toFixed(1)),
            bestFinishingScore,
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
            .filter(match => match.isSelfPlay === true && !hasDeletedPlayer(match) && !isDNF(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }

        let totalScore = 0;
        let validRoundsCount = 0;

        matches.forEach(match => {
            match.throws.forEach(throwRecord => {
                if (throwRecord.isValid) {
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
            .filter(match => match.isSelfPlay === true && !hasDeletedPlayer(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const finishedMatches = matches.filter(m => m.winner !== null && !m.isDNF);

        if (finishedMatches.length === 0) return 0;

        let finishDoubleCount = 0;

        finishedMatches.forEach(match => {
            const lastThrows = match.throws.sort((a, b) => b.timestamp - a.timestamp);
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
            .filter(match => match.isSelfPlay === true && !hasDeletedPlayer(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const throwsMap = new Map();

        matches.forEach(match => {
            match.throws.forEach(throwRecord => {
                if (throwRecord.throw) {
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
            .filter(match => match.isSelfPlay === true && !hasDeletedPlayer(match) && !isDNF(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }

        let totalDarts = 0;
        matches.forEach(match => {
            match.throws.forEach(throwRecord => {
                if (throwRecord.throw) {
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
            .filter(match => match.isSelfPlay === true && !hasDeletedPlayer(match) && !isDNF(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const finishedMatches = matches.filter(m => m.winner !== null);

        if (finishedMatches.length === 0) return 0;

        let bestScore = 0;

        finishedMatches.forEach(match => {
            const playerThrows = match.throws;

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
            .filter(match => match.isSelfPlay === true && !hasDeletedPlayer(match));
        
        // Filtrer par gameType si spécifié
        if (gameType) {
            matches = matches.filter(match => match.gameType === gameType);
        }
        
        const finishedMatches = matches.filter(m => m.winner !== null && !m.isDNF);
        const doublesMap = new Map();

        finishedMatches.forEach(match => {
            const playerThrows = match.throws;

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
