/**
 * Storage Module
 * Gère la persistance des données via localStorage
 */

const Storage = (() => {
    const KEYS = {
        PLAYERS: 'players',
        MATCHES: 'matches',
        APP_VERSION: 'appVersion'
    };

    const VERSION = '1.0.0';

    /**
     * Initialise le stockage et effectue les migrations si nécessaire
     */
    const init = () => {
        if (!get(KEYS.APP_VERSION)) {
            set(KEYS.APP_VERSION, VERSION);
            set(KEYS.PLAYERS, []);
            set(KEYS.MATCHES, []);
        } else {
            // Effectuer les migrations si nécessaire
            migrateIfNeeded();
        }
    };

    /**
     * Effectue les migrations de schéma si nécessaire
     * Ajoute trainingStats aux joueurs existants
     */
    const migrateIfNeeded = () => {
        const players = getPlayers();
        let needsUpdate = false;

        players.forEach(player => {
            if (!player.trainingStats) {
                player.trainingStats = {
                    totalMatches: 0,
                    finished: 0,
                    unfinished: 0,
                    dnf: 0,
                    averageRoundScore: 0,
                    finishDoubleSuccessRate: 0,
                    bestFinishingScore: 0,
                    topThrows: [],
                    preferredFinishingDouble: null
                };
                needsUpdate = true;
            }
            
            // Migration pour byGameType
            if (!player.stats.byGameType) {
                player.stats.byGameType = {
                    '301': {
                        totalMatches: 0,
                        wins: 0,
                        losses: 0,
                        averageRoundScore: 0,
                        finishDoubleSuccessRate: 0,
                        bestFinishingScore: 0,
                        bestRound: null,
                        topRounds: [],
                        topFinishes: [],
                        firstNineAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0
                        },
                        checkoutAverage: {
                            averageFinishScore: 0,
                            finishesCount: 0
                        },
                        finishZoneBreakdown: {
                            zone2To40: 0,
                            zone41To80: 0,
                            zone81To120: 0,
                            zone121To170: 0
                        },
                        recentAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0,
                            windowSize: 10
                        },
                        outcomeAverages: {
                            wins: { averageRoundScore: 0, roundsCount: 0 },
                            losses: { averageRoundScore: 0, roundsCount: 0 }
                        },
                        throwTypeBreakdown: {
                            singles: 0,
                            doubles: 0,
                            triples: 0,
                            bulls: 0,
                            totalDarts: 0
                        },
                        regularity: {
                            standardDeviation: 0,
                            roundsCount: 0,
                            label: 'N/A'
                        },
                        finishZoneBustRates: {
                            zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                        },
                        highScoreRounds: {
                            score100Plus: 0,
                            score140Plus: 0,
                            score160Plus: 0,
                            score180: 0
                        },
                        total180s: 0,
                        invalidRounds: 0,
                        totalRoundsPlayed: 0,
                        invalidRoundRate: 0,
                        topThrows: [],
                        preferredFinishingDouble: null
                    },
                    '501': {
                        totalMatches: 0,
                        wins: 0,
                        losses: 0,
                        averageRoundScore: 0,
                        finishDoubleSuccessRate: 0,
                        bestFinishingScore: 0,
                        bestRound: null,
                        topRounds: [],
                        topFinishes: [],
                        firstNineAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0
                        },
                        checkoutAverage: {
                            averageFinishScore: 0,
                            finishesCount: 0
                        },
                        finishZoneBreakdown: {
                            zone2To40: 0,
                            zone41To80: 0,
                            zone81To120: 0,
                            zone121To170: 0
                        },
                        recentAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0,
                            windowSize: 10
                        },
                        outcomeAverages: {
                            wins: { averageRoundScore: 0, roundsCount: 0 },
                            losses: { averageRoundScore: 0, roundsCount: 0 }
                        },
                        throwTypeBreakdown: {
                            singles: 0,
                            doubles: 0,
                            triples: 0,
                            bulls: 0,
                            totalDarts: 0
                        },
                        regularity: {
                            standardDeviation: 0,
                            roundsCount: 0,
                            label: 'N/A'
                        },
                        finishZoneBustRates: {
                            zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                        },
                        highScoreRounds: {
                            score100Plus: 0,
                            score140Plus: 0,
                            score160Plus: 0,
                            score180: 0
                        },
                        total180s: 0,
                        invalidRounds: 0,
                        totalRoundsPlayed: 0,
                        invalidRoundRate: 0,
                        topThrows: [],
                        preferredFinishingDouble: null
                    }
                };
                needsUpdate = true;
            }
            
            if (!player.trainingStats.byGameType) {
                player.trainingStats.byGameType = {
                    '301': {
                        totalMatches: 0,
                        finished: 0,
                        unfinished: 0,
                        averageRoundScore: 0,
                        finishDoubleSuccessRate: 0,
                        bestFinishingScore: 0,
                        bestRound: null,
                        topRounds: [],
                        topFinishes: [],
                        firstNineAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0
                        },
                        checkoutAverage: {
                            averageFinishScore: 0,
                            finishesCount: 0
                        },
                        finishZoneBreakdown: {
                            zone2To40: 0,
                            zone41To80: 0,
                            zone81To120: 0,
                            zone121To170: 0
                        },
                        recentAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0,
                            windowSize: 10
                        },
                        outcomeAverages: {
                            finished: { averageRoundScore: 0, roundsCount: 0 },
                            unfinished: { averageRoundScore: 0, roundsCount: 0 }
                        },
                        throwTypeBreakdown: {
                            singles: 0,
                            doubles: 0,
                            triples: 0,
                            bulls: 0,
                            totalDarts: 0
                        },
                        regularity: {
                            standardDeviation: 0,
                            roundsCount: 0,
                            label: 'N/A'
                        },
                        finishZoneBustRates: {
                            zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                        },
                        highScoreRounds: {
                            score100Plus: 0,
                            score140Plus: 0,
                            score160Plus: 0,
                            score180: 0
                        },
                        total180s: 0,
                        invalidRounds: 0,
                        totalRoundsPlayed: 0,
                        invalidRoundRate: 0,
                        topThrows: [],
                        preferredFinishingDouble: null
                    },
                    '501': {
                        totalMatches: 0,
                        finished: 0,
                        unfinished: 0,
                        averageRoundScore: 0,
                        finishDoubleSuccessRate: 0,
                        bestFinishingScore: 0,
                        bestRound: null,
                        topRounds: [],
                        topFinishes: [],
                        firstNineAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0
                        },
                        checkoutAverage: {
                            averageFinishScore: 0,
                            finishesCount: 0
                        },
                        finishZoneBreakdown: {
                            zone2To40: 0,
                            zone41To80: 0,
                            zone81To120: 0,
                            zone121To170: 0
                        },
                        recentAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0,
                            windowSize: 10
                        },
                        outcomeAverages: {
                            finished: { averageRoundScore: 0, roundsCount: 0 },
                            unfinished: { averageRoundScore: 0, roundsCount: 0 }
                        },
                        throwTypeBreakdown: {
                            singles: 0,
                            doubles: 0,
                            triples: 0,
                            bulls: 0,
                            totalDarts: 0
                        },
                        regularity: {
                            standardDeviation: 0,
                            roundsCount: 0,
                            label: 'N/A'
                        },
                        finishZoneBustRates: {
                            zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                        },
                        highScoreRounds: {
                            score100Plus: 0,
                            score140Plus: 0,
                            score160Plus: 0,
                            score180: 0
                        },
                        total180s: 0,
                        invalidRounds: 0,
                        totalRoundsPlayed: 0,
                        invalidRoundRate: 0,
                        topThrows: [],
                        preferredFinishingDouble: null
                    }
                };
                needsUpdate = true;
            }

            if (player.stats.bestRound === undefined || player.stats.highScoreRounds === undefined ||
                player.stats.total180s === undefined || player.stats.invalidRoundRate === undefined ||
                player.stats.topFinishes === undefined || player.stats.recentAverage === undefined ||
                player.stats.outcomeAverages === undefined || player.stats.firstNineAverage === undefined ||
                player.stats.checkoutAverage === undefined || player.stats.finishZoneBreakdown === undefined ||
                player.stats.throwTypeBreakdown === undefined || player.stats.regularity === undefined ||
                player.stats.finishZoneBustRates === undefined) {
                player.stats.bestRound = player.stats.bestRound || null;
                player.stats.topRounds = player.stats.topRounds || [];
                player.stats.topFinishes = player.stats.topFinishes || [];
                player.stats.firstNineAverage = player.stats.firstNineAverage || {
                    averageRoundScore: 0,
                    roundsCount: 0
                };
                player.stats.checkoutAverage = player.stats.checkoutAverage || {
                    averageFinishScore: 0,
                    finishesCount: 0
                };
                player.stats.finishZoneBreakdown = player.stats.finishZoneBreakdown || {
                    zone2To40: 0,
                    zone41To80: 0,
                    zone81To120: 0,
                    zone121To170: 0
                };
                player.stats.recentAverage = player.stats.recentAverage || {
                    averageRoundScore: 0,
                    roundsCount: 0,
                    windowSize: 10
                };
                player.stats.outcomeAverages = player.stats.outcomeAverages || {
                    wins: { averageRoundScore: 0, roundsCount: 0 },
                    losses: { averageRoundScore: 0, roundsCount: 0 }
                };
                player.stats.throwTypeBreakdown = player.stats.throwTypeBreakdown || {
                    singles: 0,
                    doubles: 0,
                    triples: 0,
                    bulls: 0,
                    totalDarts: 0
                };
                player.stats.regularity = player.stats.regularity || {
                    standardDeviation: 0,
                    roundsCount: 0,
                    label: 'N/A'
                };
                player.stats.finishZoneBustRates = player.stats.finishZoneBustRates || {
                    zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                };
                player.stats.highScoreRounds = player.stats.highScoreRounds || {
                    score100Plus: 0,
                    score140Plus: 0,
                    score160Plus: 0,
                    score180: 0
                };
                player.stats.total180s = player.stats.total180s || 0;
                player.stats.invalidRounds = player.stats.invalidRounds || 0;
                player.stats.totalRoundsPlayed = player.stats.totalRoundsPlayed || 0;
                player.stats.invalidRoundRate = player.stats.invalidRoundRate || 0;
                needsUpdate = true;
            }

            ['301', '501'].forEach(gameType => {
                const gameStats = player.stats.byGameType[gameType];
                if (!gameStats) return;

                if (gameStats.bestRound === undefined || gameStats.highScoreRounds === undefined ||
                    gameStats.total180s === undefined || gameStats.invalidRoundRate === undefined ||
                    gameStats.topFinishes === undefined || gameStats.recentAverage === undefined ||
                    gameStats.outcomeAverages === undefined || gameStats.firstNineAverage === undefined ||
                    gameStats.checkoutAverage === undefined || gameStats.finishZoneBreakdown === undefined ||
                    gameStats.throwTypeBreakdown === undefined || gameStats.regularity === undefined ||
                    gameStats.finishZoneBustRates === undefined) {
                    gameStats.bestRound = gameStats.bestRound || null;
                    gameStats.topRounds = gameStats.topRounds || [];
                    gameStats.topFinishes = gameStats.topFinishes || [];
                    gameStats.firstNineAverage = gameStats.firstNineAverage || {
                        averageRoundScore: 0,
                        roundsCount: 0
                    };
                    gameStats.checkoutAverage = gameStats.checkoutAverage || {
                        averageFinishScore: 0,
                        finishesCount: 0
                    };
                    gameStats.finishZoneBreakdown = gameStats.finishZoneBreakdown || {
                        zone2To40: 0,
                        zone41To80: 0,
                        zone81To120: 0,
                        zone121To170: 0
                    };
                    gameStats.recentAverage = gameStats.recentAverage || {
                        averageRoundScore: 0,
                        roundsCount: 0,
                        windowSize: 10
                    };
                    gameStats.outcomeAverages = gameStats.outcomeAverages || {
                        wins: { averageRoundScore: 0, roundsCount: 0 },
                        losses: { averageRoundScore: 0, roundsCount: 0 }
                    };
                    gameStats.throwTypeBreakdown = gameStats.throwTypeBreakdown || {
                        singles: 0,
                        doubles: 0,
                        triples: 0,
                        bulls: 0,
                        totalDarts: 0
                    };
                    gameStats.regularity = gameStats.regularity || {
                        standardDeviation: 0,
                        roundsCount: 0,
                        label: 'N/A'
                    };
                    gameStats.finishZoneBustRates = gameStats.finishZoneBustRates || {
                        zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                        zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                        zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                        zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                    };
                    gameStats.highScoreRounds = gameStats.highScoreRounds || {
                        score100Plus: 0,
                        score140Plus: 0,
                        score160Plus: 0,
                        score180: 0
                    };
                    gameStats.total180s = gameStats.total180s || 0;
                    gameStats.invalidRounds = gameStats.invalidRounds || 0;
                    gameStats.totalRoundsPlayed = gameStats.totalRoundsPlayed || 0;
                    gameStats.invalidRoundRate = gameStats.invalidRoundRate || 0;
                    needsUpdate = true;
                }
            });

            if (player.trainingStats.bestRound === undefined || player.trainingStats.highScoreRounds === undefined ||
                player.trainingStats.total180s === undefined || player.trainingStats.invalidRoundRate === undefined ||
                player.trainingStats.topFinishes === undefined || player.trainingStats.recentAverage === undefined ||
                player.trainingStats.outcomeAverages === undefined || player.trainingStats.firstNineAverage === undefined ||
                player.trainingStats.checkoutAverage === undefined || player.trainingStats.finishZoneBreakdown === undefined ||
                player.trainingStats.throwTypeBreakdown === undefined || player.trainingStats.regularity === undefined ||
                player.trainingStats.finishZoneBustRates === undefined) {
                player.trainingStats.bestRound = player.trainingStats.bestRound || null;
                player.trainingStats.topRounds = player.trainingStats.topRounds || [];
                player.trainingStats.topFinishes = player.trainingStats.topFinishes || [];
                player.trainingStats.firstNineAverage = player.trainingStats.firstNineAverage || {
                    averageRoundScore: 0,
                    roundsCount: 0
                };
                player.trainingStats.checkoutAverage = player.trainingStats.checkoutAverage || {
                    averageFinishScore: 0,
                    finishesCount: 0
                };
                player.trainingStats.finishZoneBreakdown = player.trainingStats.finishZoneBreakdown || {
                    zone2To40: 0,
                    zone41To80: 0,
                    zone81To120: 0,
                    zone121To170: 0
                };
                player.trainingStats.recentAverage = player.trainingStats.recentAverage || {
                    averageRoundScore: 0,
                    roundsCount: 0,
                    windowSize: 10
                };
                player.trainingStats.outcomeAverages = player.trainingStats.outcomeAverages || {
                    finished: { averageRoundScore: 0, roundsCount: 0 },
                    unfinished: { averageRoundScore: 0, roundsCount: 0 }
                };
                player.trainingStats.throwTypeBreakdown = player.trainingStats.throwTypeBreakdown || {
                    singles: 0,
                    doubles: 0,
                    triples: 0,
                    bulls: 0,
                    totalDarts: 0
                };
                player.trainingStats.regularity = player.trainingStats.regularity || {
                    standardDeviation: 0,
                    roundsCount: 0,
                    label: 'N/A'
                };
                player.trainingStats.finishZoneBustRates = player.trainingStats.finishZoneBustRates || {
                    zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                };
                player.trainingStats.highScoreRounds = player.trainingStats.highScoreRounds || {
                    score100Plus: 0,
                    score140Plus: 0,
                    score160Plus: 0,
                    score180: 0
                };
                player.trainingStats.total180s = player.trainingStats.total180s || 0;
                player.trainingStats.invalidRounds = player.trainingStats.invalidRounds || 0;
                player.trainingStats.totalRoundsPlayed = player.trainingStats.totalRoundsPlayed || 0;
                player.trainingStats.invalidRoundRate = player.trainingStats.invalidRoundRate || 0;
                needsUpdate = true;
            }

            ['301', '501'].forEach(gameType => {
                const gameStats = player.trainingStats.byGameType[gameType];
                if (!gameStats) return;

                if (gameStats.bestRound === undefined || gameStats.highScoreRounds === undefined ||
                    gameStats.total180s === undefined || gameStats.invalidRoundRate === undefined ||
                    gameStats.topFinishes === undefined || gameStats.recentAverage === undefined ||
                    gameStats.outcomeAverages === undefined || gameStats.firstNineAverage === undefined ||
                    gameStats.checkoutAverage === undefined || gameStats.finishZoneBreakdown === undefined ||
                    gameStats.throwTypeBreakdown === undefined || gameStats.regularity === undefined ||
                    gameStats.finishZoneBustRates === undefined) {
                    gameStats.bestRound = gameStats.bestRound || null;
                    gameStats.topRounds = gameStats.topRounds || [];
                    gameStats.topFinishes = gameStats.topFinishes || [];
                    gameStats.firstNineAverage = gameStats.firstNineAverage || {
                        averageRoundScore: 0,
                        roundsCount: 0
                    };
                    gameStats.checkoutAverage = gameStats.checkoutAverage || {
                        averageFinishScore: 0,
                        finishesCount: 0
                    };
                    gameStats.finishZoneBreakdown = gameStats.finishZoneBreakdown || {
                        zone2To40: 0,
                        zone41To80: 0,
                        zone81To120: 0,
                        zone121To170: 0
                    };
                    gameStats.recentAverage = gameStats.recentAverage || {
                        averageRoundScore: 0,
                        roundsCount: 0,
                        windowSize: 10
                    };
                    gameStats.outcomeAverages = gameStats.outcomeAverages || {
                        finished: { averageRoundScore: 0, roundsCount: 0 },
                        unfinished: { averageRoundScore: 0, roundsCount: 0 }
                    };
                    gameStats.throwTypeBreakdown = gameStats.throwTypeBreakdown || {
                        singles: 0,
                        doubles: 0,
                        triples: 0,
                        bulls: 0,
                        totalDarts: 0
                    };
                    gameStats.regularity = gameStats.regularity || {
                        standardDeviation: 0,
                        roundsCount: 0,
                        label: 'N/A'
                    };
                    gameStats.finishZoneBustRates = gameStats.finishZoneBustRates || {
                        zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                        zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                        zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                        zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                    };
                    gameStats.highScoreRounds = gameStats.highScoreRounds || {
                        score100Plus: 0,
                        score140Plus: 0,
                        score160Plus: 0,
                        score180: 0
                    };
                    gameStats.total180s = gameStats.total180s || 0;
                    gameStats.invalidRounds = gameStats.invalidRounds || 0;
                    gameStats.totalRoundsPlayed = gameStats.totalRoundsPlayed || 0;
                    gameStats.invalidRoundRate = gameStats.invalidRoundRate || 0;
                    needsUpdate = true;
                }
            });
        });

        if (needsUpdate) {
            set(KEYS.PLAYERS, players);
        }
    };

    /**
     * Récupère une valeur du localStorage
     */
    const get = (key) => {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error(`Erreur lecture localStorage [${key}]:`, e);
            return null;
        }
    };

    /**
     * Sauvegarde une valeur dans le localStorage
     */
    const set = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`Erreur écriture localStorage [${key}]:`, e);
            return false;
        }
    };

    /**
     * Récupère tous les joueurs
     */
    const getPlayers = () => {
        return get(KEYS.PLAYERS) || [];
    };

    /**
     * Ajoute un joueur
     */
    const addPlayer = (name) => {
        const players = getPlayers();
        const newPlayer = {
            id: generateId(),
            name: name.trim(),
            created: Date.now(),
            stats: {
                totalMatches: 0,
                wins: 0,
                losses: 0,
                dnf: 0,  // Compteur de DNF (Did Not Finish)
                averageRoundScore: 0,
                finishDoubleSuccessRate: 0,
                bestFinishingScore: 0,
                bestRound: null,
                topRounds: [],
                topFinishes: [],
                firstNineAverage: {
                    averageRoundScore: 0,
                    roundsCount: 0
                },
                checkoutAverage: {
                    averageFinishScore: 0,
                    finishesCount: 0
                },
                finishZoneBreakdown: {
                    zone2To40: 0,
                    zone41To80: 0,
                    zone81To120: 0,
                    zone121To170: 0
                },
                recentAverage: {
                    averageRoundScore: 0,
                    roundsCount: 0,
                    windowSize: 10
                },
                outcomeAverages: {
                    wins: { averageRoundScore: 0, roundsCount: 0 },
                    losses: { averageRoundScore: 0, roundsCount: 0 }
                },
                throwTypeBreakdown: {
                    singles: 0,
                    doubles: 0,
                    triples: 0,
                    bulls: 0,
                    totalDarts: 0
                },
                regularity: {
                    standardDeviation: 0,
                    roundsCount: 0,
                    label: 'N/A'
                },
                finishZoneBustRates: {
                    zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                },
                highScoreRounds: {
                    score100Plus: 0,
                    score140Plus: 0,
                    score160Plus: 0,
                    score180: 0
                },
                total180s: 0,
                invalidRounds: 0,
                totalRoundsPlayed: 0,
                invalidRoundRate: 0,
                topThrows: [],
                preferredFinishingDouble: null,
                byGameType: {
                    '301': {
                        totalMatches: 0,
                        wins: 0,
                        losses: 0,
                        averageRoundScore: 0,
                        finishDoubleSuccessRate: 0,
                        bestFinishingScore: 0,
                        bestRound: null,
                        topRounds: [],
                        topFinishes: [],
                        firstNineAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0
                        },
                        checkoutAverage: {
                            averageFinishScore: 0,
                            finishesCount: 0
                        },
                        finishZoneBreakdown: {
                            zone2To40: 0,
                            zone41To80: 0,
                            zone81To120: 0,
                            zone121To170: 0
                        },
                        recentAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0,
                            windowSize: 10
                        },
                        outcomeAverages: {
                            wins: { averageRoundScore: 0, roundsCount: 0 },
                            losses: { averageRoundScore: 0, roundsCount: 0 }
                        },
                        throwTypeBreakdown: {
                            singles: 0,
                            doubles: 0,
                            triples: 0,
                            bulls: 0,
                            totalDarts: 0
                        },
                        regularity: {
                            standardDeviation: 0,
                            roundsCount: 0,
                            label: 'N/A'
                        },
                        finishZoneBustRates: {
                            zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                        },
                        highScoreRounds: {
                            score100Plus: 0,
                            score140Plus: 0,
                            score160Plus: 0,
                            score180: 0
                        },
                        total180s: 0,
                        invalidRounds: 0,
                        totalRoundsPlayed: 0,
                        invalidRoundRate: 0,
                        topThrows: [],
                        preferredFinishingDouble: null
                    },
                    '501': {
                        totalMatches: 0,
                        wins: 0,
                        losses: 0,
                        averageRoundScore: 0,
                        finishDoubleSuccessRate: 0,
                        bestFinishingScore: 0,
                        bestRound: null,
                        topRounds: [],
                        topFinishes: [],
                        firstNineAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0
                        },
                        checkoutAverage: {
                            averageFinishScore: 0,
                            finishesCount: 0
                        },
                        finishZoneBreakdown: {
                            zone2To40: 0,
                            zone41To80: 0,
                            zone81To120: 0,
                            zone121To170: 0
                        },
                        recentAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0,
                            windowSize: 10
                        },
                        outcomeAverages: {
                            wins: { averageRoundScore: 0, roundsCount: 0 },
                            losses: { averageRoundScore: 0, roundsCount: 0 }
                        },
                        throwTypeBreakdown: {
                            singles: 0,
                            doubles: 0,
                            triples: 0,
                            bulls: 0,
                            totalDarts: 0
                        },
                        regularity: {
                            standardDeviation: 0,
                            roundsCount: 0,
                            label: 'N/A'
                        },
                        finishZoneBustRates: {
                            zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                        },
                        highScoreRounds: {
                            score100Plus: 0,
                            score140Plus: 0,
                            score160Plus: 0,
                            score180: 0
                        },
                        total180s: 0,
                        invalidRounds: 0,
                        totalRoundsPlayed: 0,
                        invalidRoundRate: 0,
                        topThrows: [],
                        preferredFinishingDouble: null
                    }
                }
            },
            trainingStats: {
                totalMatches: 0,
                finished: 0,
                unfinished: 0,
                dnf: 0,
                averageRoundScore: 0,
                finishDoubleSuccessRate: 0,
                bestFinishingScore: 0,
                bestRound: null,
                topRounds: [],
                topFinishes: [],
                firstNineAverage: {
                    averageRoundScore: 0,
                    roundsCount: 0
                },
                checkoutAverage: {
                    averageFinishScore: 0,
                    finishesCount: 0
                },
                finishZoneBreakdown: {
                    zone2To40: 0,
                    zone41To80: 0,
                    zone81To120: 0,
                    zone121To170: 0
                },
                recentAverage: {
                    averageRoundScore: 0,
                    roundsCount: 0,
                    windowSize: 10
                },
                outcomeAverages: {
                    finished: { averageRoundScore: 0, roundsCount: 0 },
                    unfinished: { averageRoundScore: 0, roundsCount: 0 }
                },
                throwTypeBreakdown: {
                    singles: 0,
                    doubles: 0,
                    triples: 0,
                    bulls: 0,
                    totalDarts: 0
                },
                regularity: {
                    standardDeviation: 0,
                    roundsCount: 0,
                    label: 'N/A'
                },
                finishZoneBustRates: {
                    zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                    zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                },
                highScoreRounds: {
                    score100Plus: 0,
                    score140Plus: 0,
                    score160Plus: 0,
                    score180: 0
                },
                total180s: 0,
                invalidRounds: 0,
                totalRoundsPlayed: 0,
                invalidRoundRate: 0,
                topThrows: [],
                preferredFinishingDouble: null,
                byGameType: {
                    '301': {
                        totalMatches: 0,
                        finished: 0,
                        unfinished: 0,
                        averageRoundScore: 0,
                        finishDoubleSuccessRate: 0,
                        bestFinishingScore: 0,
                        bestRound: null,
                        topRounds: [],
                        topFinishes: [],
                        firstNineAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0
                        },
                        checkoutAverage: {
                            averageFinishScore: 0,
                            finishesCount: 0
                        },
                        finishZoneBreakdown: {
                            zone2To40: 0,
                            zone41To80: 0,
                            zone81To120: 0,
                            zone121To170: 0
                        },
                        recentAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0,
                            windowSize: 10
                        },
                        outcomeAverages: {
                            finished: { averageRoundScore: 0, roundsCount: 0 },
                            unfinished: { averageRoundScore: 0, roundsCount: 0 }
                        },
                        throwTypeBreakdown: {
                            singles: 0,
                            doubles: 0,
                            triples: 0,
                            bulls: 0,
                            totalDarts: 0
                        },
                        regularity: {
                            standardDeviation: 0,
                            roundsCount: 0,
                            label: 'N/A'
                        },
                        finishZoneBustRates: {
                            zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                        },
                        highScoreRounds: {
                            score100Plus: 0,
                            score140Plus: 0,
                            score160Plus: 0,
                            score180: 0
                        },
                        total180s: 0,
                        invalidRounds: 0,
                        totalRoundsPlayed: 0,
                        invalidRoundRate: 0,
                        topThrows: [],
                        preferredFinishingDouble: null
                    },
                    '501': {
                        totalMatches: 0,
                        finished: 0,
                        unfinished: 0,
                        averageRoundScore: 0,
                        finishDoubleSuccessRate: 0,
                        bestFinishingScore: 0,
                        bestRound: null,
                        topRounds: [],
                        topFinishes: [],
                        firstNineAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0
                        },
                        checkoutAverage: {
                            averageFinishScore: 0,
                            finishesCount: 0
                        },
                        finishZoneBreakdown: {
                            zone2To40: 0,
                            zone41To80: 0,
                            zone81To120: 0,
                            zone121To170: 0
                        },
                        recentAverage: {
                            averageRoundScore: 0,
                            roundsCount: 0,
                            windowSize: 10
                        },
                        outcomeAverages: {
                            finished: { averageRoundScore: 0, roundsCount: 0 },
                            unfinished: { averageRoundScore: 0, roundsCount: 0 }
                        },
                        throwTypeBreakdown: {
                            singles: 0,
                            doubles: 0,
                            triples: 0,
                            bulls: 0,
                            totalDarts: 0
                        },
                        regularity: {
                            standardDeviation: 0,
                            roundsCount: 0,
                            label: 'N/A'
                        },
                        finishZoneBustRates: {
                            zone2To40: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone41To80: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone81To120: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 },
                            zone121To170: { attempts: 0, invalidRounds: 0, invalidRoundRate: 0 }
                        },
                        highScoreRounds: {
                            score100Plus: 0,
                            score140Plus: 0,
                            score160Plus: 0,
                            score180: 0
                        },
                        total180s: 0,
                        invalidRounds: 0,
                        totalRoundsPlayed: 0,
                        invalidRoundRate: 0,
                        topThrows: [],
                        preferredFinishingDouble: null
                    }
                }
            }
        };
        players.push(newPlayer);
        set(KEYS.PLAYERS, players);
        return newPlayer;
    };

    /**
     * Récupère un joueur par ID
     */
    const getPlayerById = (id) => {
        const players = getPlayers();
        return players.find(p => p.id === id);
    };

    /**
     * Supprime un joueur et remplace ses références dans les matchs
     */
    const deletePlayer = (id) => {
        let players = getPlayers();
        players = players.filter(p => p.id !== id);
        set(KEYS.PLAYERS, players);

        // Remplacer les références du joueur supprimé dans les matchs
        replacePlayerIdInMatches(id, 'deleted_player');

        return true;
    };

    /**
     * Remplace l'ID d'un joueur par un autre dans tous les matchs
     * Utile quand un joueur est supprimé (remplacer par "deleted_player")
     * Appelle ensuite cleanOrphanMatches() pour supprimer les matchs avec deux joueurs supprimés
     */
    const replacePlayerIdInMatches = (oldPlayerId, newPlayerId) => {
        const matches = getMatches();
        matches.forEach(match => {
            // Remplacer dans playerIds
            match.playerIds = match.playerIds.map(id => 
                id === oldPlayerId ? newPlayerId : id
            );
            // Remplacer dans winner si nécessaire
            if (match.winner === oldPlayerId) {
                match.winner = newPlayerId;
            }
            // Remplacer dans les throws (playerIds des lancers)
            match.throws.forEach(throwRecord => {
                // Note: playerIndex ne change pas, c'est un index numérique
            });
        });
        set(KEYS.MATCHES, matches);

        // Nettoyer les matchs orphelins après la suppression
        cleanOrphanMatches();
    };

    /**
     * Supprime les matchs où les deux joueurs ont été supprimés
     * Cela évite d'encombrer localStorage avec des données inutiles
     */
    const cleanOrphanMatches = () => {
        let matches = getMatches();
        const initialCount = matches.length;

        // Filtrer les matchs où les deux joueurs sont "deleted_player"
        matches = matches.filter(match => {
            const humanIds = match.playerIds.filter(id =>
                id !== 'ghost' && !String(id).startsWith('ghost:')
            );
            const allDeleted = humanIds.length > 0 && humanIds.every(id => id === 'deleted_player');
            return !allDeleted;
        });

        // Si des matchs ont été supprimés, mettre à jour
        if (matches.length < initialCount) {
            set(KEYS.MATCHES, matches);
            console.log(`Nettoyage: ${initialCount - matches.length} match(es) orphelin(s) supprimé(s)`);
        }

        return initialCount - matches.length;
    };

    /**
     * Met à jour les stats d'un joueur (stats de compétition)
     */
    const updatePlayerStats = (playerId, stats) => {
        const players = getPlayers();
        const player = players.find(p => p.id === playerId);
        if (player) {
            player.stats = { ...player.stats, ...stats };
            set(KEYS.PLAYERS, players);
            return true;
        }
        return false;
    };

    /**
     * Met à jour les stats d'entraînement d'un joueur
     */
    const updatePlayerTrainingStats = (playerId, trainingStats) => {
        const players = getPlayers();
        const player = players.find(p => p.id === playerId);
        if (player) {
            if (!player.trainingStats) {
                player.trainingStats = {};
            }
            player.trainingStats = { ...player.trainingStats, ...trainingStats };
            set(KEYS.PLAYERS, players);
            return true;
        }
        return false;
    };

    /**
     * Récupère tous les matchs
     */
    const getMatches = () => {
        return get(KEYS.MATCHES) || [];
    };

    /**
     * Ajoute un match
     */
    const addMatch = (match) => {
        const matches = getMatches();
        matches.push(match);
        set(KEYS.MATCHES, matches);
        return match;
    };

    /**
     * Met à jour un match
     */
    const updateMatch = (matchId, updatedMatch) => {
        const matches = getMatches();
        const index = matches.findIndex(m => m.id === matchId);
        if (index !== -1) {
            matches[index] = updatedMatch;
            set(KEYS.MATCHES, matches);
            return true;
        }
        return false;
    };

    /**
     * Récupère un match par ID
     */
    const getMatchById = (id) => {
        const matches = getMatches();
        return matches.find(m => m.id === id);
    };

    /**
     * Récupère les matchs d'un joueur
     */
    const getPlayerMatches = (playerId) => {
        const matches = getMatches();
        return matches.filter(m => m.playerIds.includes(playerId));
    };

    /**
     * Supprime tout (pour tests/reset)
     */
    const clearAll = () => {
        localStorage.clear();
        init();
    };

    /**
     * Génère un ID unique
     */
    const generateId = () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    // Initialisation au chargement
    init();

    return {
        get,
        set,
        getPlayers,
        addPlayer,
        getPlayerById,
        deletePlayer,
        updatePlayerStats,
        getMatches,
        addMatch,
        updateMatch,
        getMatchById,
        getPlayerMatches,
        replacePlayerIdInMatches,
        cleanOrphanMatches,
        clearAll,
        generateId,
        migrateIfNeeded,
        updatePlayerTrainingStats,
        KEYS
    };
})();
