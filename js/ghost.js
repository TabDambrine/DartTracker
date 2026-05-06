/**
 * Ghost Module
 * Simule les volées d'un adversaire à partir des statistiques d'un joueur.
 */

const Ghost = (() => {
    const MISS = { segment: -1, multiplier: 1 };
    const ALL_DARTS = (() => {
        const darts = [MISS, { segment: 25, multiplier: 1 }, { segment: 50, multiplier: 1 }];
        for (let segment = 1; segment <= 20; segment++) {
            darts.push({ segment, multiplier: 1 });
            darts.push({ segment, multiplier: 2 });
            darts.push({ segment, multiplier: 3 });
        }
        return darts;
    })();

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const randomNormal = (mean, deviation) => {
        const u = Math.max(Math.random(), Number.EPSILON);
        const v = Math.max(Math.random(), Number.EPSILON);
        const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        return mean + z * deviation;
    };

    const getStatsForGameType = (player, gameType) => {
        const competitionStats = player.stats?.byGameType?.[gameType];
        if (competitionStats && competitionStats.averageRoundScore > 0) {
            return competitionStats;
        }

        if (player.stats && player.stats.averageRoundScore > 0) {
            return player.stats;
        }

        const trainingStats = player.trainingStats?.byGameType?.[gameType];
        if (trainingStats && trainingStats.averageRoundScore > 0) {
            return trainingStats;
        }

        if (player.trainingStats && player.trainingStats.averageRoundScore > 0) {
            return player.trainingStats;
        }

        return null;
    };

    const buildProfile = (playerId, gameType) => {
        const player = Players.getById(playerId);
        const stats = player ? getStatsForGameType(player, gameType) : null;

        return {
            playerId,
            name: player ? player.name : 'Ghost',
            averageRoundScore: stats?.averageRoundScore || 45,
            finishDoubleSuccessRate: stats?.finishDoubleSuccessRate || 12,
            bestFinishingScore: stats?.bestFinishingScore || 60,
            preferredFinishingDouble: stats?.preferredFinishingDouble || player?.stats?.preferredFinishingDouble || null,
            topThrows: stats?.topThrows || []
        };
    };

    const toRulesThrow = (throw_) => ({
        segment: throw_.segment === 0 ? 50 : throw_.segment,
        multiplier: throw_.segment === 0 || throw_.segment === 25 || throw_.segment === 50 || throw_.segment === -1
            ? 1
            : throw_.multiplier
    });

    const findDartsForTotal = (total, maxDarts = 3) => {
        if (total <= 0) {
            return [MISS, MISS, MISS].slice(0, maxDarts);
        }

        const scoredDarts = ALL_DARTS
            .filter(dart => Rules.calculateScore(toRulesThrow(dart)) > 0)
            .sort((a, b) => Rules.calculateScore(toRulesThrow(b)) - Rules.calculateScore(toRulesThrow(a)));

        for (const first of scoredDarts) {
            const firstScore = Rules.calculateScore(toRulesThrow(first));
            if (firstScore === total && maxDarts >= 1) return [toRulesThrow(first)];

            if (maxDarts >= 2) {
                for (const second of scoredDarts) {
                    const secondScore = Rules.calculateScore(toRulesThrow(second));
                    if (firstScore + secondScore === total) {
                        return [toRulesThrow(first), toRulesThrow(second)];
                    }

                    if (maxDarts >= 3) {
                        for (const third of scoredDarts) {
                            const thirdScore = Rules.calculateScore(toRulesThrow(third));
                            if (firstScore + secondScore + thirdScore === total) {
                                return [toRulesThrow(first), toRulesThrow(second), toRulesThrow(third)];
                            }
                        }
                    }
                }
            }
        }

        return null;
    };

    const padToRound = (throws) => {
        const padded = [...throws];
        while (padded.length < 3) {
            padded.push({ ...MISS });
        }
        return padded.slice(0, 3);
    };

    const generateSafeScoringTurn = (profile, currentScore) => {
        const maxScore = Math.min(180, currentScore - 2);
        if (maxScore <= 0) return [{ ...MISS }, { ...MISS }, { ...MISS }];

        const deviation = clamp(profile.averageRoundScore * 0.35, 8, 35);
        const target = clamp(Math.round(randomNormal(profile.averageRoundScore, deviation)), 0, maxScore);

        for (let score = target; score >= 0; score--) {
            const remaining = currentScore - score;
            if (remaining === 1 || remaining < 0) continue;

            const darts = findDartsForTotal(score, 3);
            if (darts) {
                return padToRound(darts);
            }
        }

        return [{ ...MISS }, { ...MISS }, { ...MISS }];
    };

    const shouldAttemptFinish = (profile, currentScore) => {
        if (currentScore < 2 || currentScore > 170) return false;
        if (currentScore <= profile.bestFinishingScore) return true;
        return profile.averageRoundScore >= 60 && Math.random() < 0.35;
    };

    const generateFinishAttempt = (profile, currentScore) => {
        const finish = Finishes.selectBestFinish(currentScore, profile.preferredFinishingDouble);
        if (!finish) return null;

        const successRate = clamp(profile.finishDoubleSuccessRate / 100, 0.05, 0.7);
        if (Math.random() <= successRate) {
            return finish.map(toRulesThrow);
        }

        return generateSafeScoringTurn(profile, currentScore);
    };

    const generateTurn = (profile, currentScore) => {
        if (shouldAttemptFinish(profile, currentScore)) {
            const finishAttempt = generateFinishAttempt(profile, currentScore);
            if (finishAttempt) return finishAttempt;
        }

        return generateSafeScoringTurn(profile, currentScore);
    };

    const playTurn = (match) => {
        const profile = buildProfile(match.ghostProfilePlayerId, match.gameType);
        const currentScore = match.scores[1];
        const throws = generateTurn(profile, currentScore);
        return Games.addSimulatedThrow(throws, {
            profileName: profile.name
        });
    };

    return {
        buildProfile,
        generateTurn,
        playTurn
    };
})();
