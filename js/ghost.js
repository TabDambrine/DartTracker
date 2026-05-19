/**
 * Ghost Module
 * Simule les volees d'un adversaire a partir des statistiques d'un joueur.
 *
 * Le ghost ne tire pas seulement un total: il vise des cibles. En scoring il
 * vise principalement T20, ce qui produit naturellement S20, S1, S5, T20 et
 * des misses. En zone de finish, il suit une route de finish puis simule les
 * doubles rates de facon plausible.
 */

const Ghost = (() => {
    const MISS = { segment: -1, multiplier: 1 };
    const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const addWeight = (weights, dart, weight) => {
        if (!dart || weight <= 0) return;
        const key = `${dart.segment}-${dart.multiplier}`;
        weights.set(key, (weights.get(key) || 0) + weight);
    };

    const parseWeightedDart = (key) => {
        const [segment, multiplier] = key.split('-').map(Number);
        return { segment, multiplier };
    };

    const weightedPick = (weights) => {
        let total = 0;
        weights.forEach(weight => {
            total += weight;
        });

        if (total <= 0) return { ...MISS };

        let cursor = Math.random() * total;
        for (const [key, weight] of weights.entries()) {
            cursor -= weight;
            if (cursor <= 0) return parseWeightedDart(key);
        }

        return parseWeightedDart(Array.from(weights.keys()).pop());
    };

    const getNeighbors = (segment) => {
        const index = BOARD_ORDER.indexOf(segment);
        if (index === -1) return [];

        return [
            BOARD_ORDER[(index - 1 + BOARD_ORDER.length) % BOARD_ORDER.length],
            BOARD_ORDER[(index + 1) % BOARD_ORDER.length]
        ];
    };

    const normalizeThrow = (throw_) => ({
        segment: throw_.segment === 0 ? 50 : throw_.segment,
        multiplier: throw_.segment === 0 || throw_.segment === 25 || throw_.segment === 50 || throw_.segment === -1
            ? 1
            : throw_.multiplier
    });

    const scoreOf = (throw_) => Rules.calculateScore(normalizeThrow(throw_));

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

    const collectHistoricalProfile = (playerId, gameType) => {
        const scoringWeights = new Map();
        let scoringDarts = 0;

        Storage.getPlayerMatches(playerId)
            .filter(match => !gameType || match.gameType === gameType)
            .forEach(match => {
                const indexes = [];

                match.playerIds.forEach((id, index) => {
                    if (id === playerId) indexes.push(index);
                });

                match.throws.forEach(throwRecord => {
                    if (throwRecord.isSimulated === true || throwRecord.isValid !== true) return;
                    if (!indexes.includes(throwRecord.playerIndex)) return;

                    const scoreBeforeThrow = throwRecord.runningTotal + throwRecord.roundTotal;
                    if (scoreBeforeThrow <= 170 || !throwRecord.throw) return;

                    throwRecord.throw.forEach(dart => {
                        const normalized = normalizeThrow(dart);
                        addWeight(scoringWeights, normalized, 1);
                        scoringDarts += 1;
                    });
                });
            });

        return {
            scoringWeights,
            scoringDarts
        };
    };

    const buildProfile = (playerId, gameType) => {
        const player = Players.getById(playerId);
        const stats = player ? getStatsForGameType(player, gameType) : null;
        const history = player ? collectHistoricalProfile(playerId, gameType) : {
            scoringWeights: new Map(),
            scoringDarts: 0
        };

        return {
            playerId,
            name: player ? player.name : 'Ghost',
            averageRoundScore: stats?.averageRoundScore || 45,
            finishDoubleSuccessRate: stats?.finishDoubleSuccessRate || 12,
            bestFinishingScore: stats?.bestFinishingScore || 60,
            preferredFinishingDouble: stats?.preferredFinishingDouble || player?.stats?.preferredFinishingDouble || null,
            topThrows: stats?.topThrows || [],
            historicalScoringWeights: history.scoringWeights,
            historicalScoringDarts: history.scoringDarts
        };
    };

    const getSkill = (profile) => {
        return clamp((profile.averageRoundScore - 30) / 90, 0, 1);
    };

    const getDefaultT20Weights = (profile) => {
        const skill = getSkill(profile);
        const weights = new Map();

        addWeight(weights, { segment: 20, multiplier: 3 }, 4 + skill * 24);
        addWeight(weights, { segment: 20, multiplier: 1 }, 31 - skill * 4);
        addWeight(weights, { segment: 1, multiplier: 1 }, 20 - skill * 5);
        addWeight(weights, { segment: 5, multiplier: 1 }, 20 - skill * 5);
        addWeight(weights, { segment: -1, multiplier: 1 }, 16 - skill * 7);
        addWeight(weights, { segment: 20, multiplier: 2 }, 1 + skill * 2);
        addWeight(weights, { segment: 1, multiplier: 3 }, 2);
        addWeight(weights, { segment: 5, multiplier: 3 }, 2);
        addWeight(weights, { segment: 18, multiplier: 1 }, 2);
        addWeight(weights, { segment: 12, multiplier: 1 }, 2);

        return weights;
    };

    const getScoringWeights = (profile) => {
        const weights = getDefaultT20Weights(profile);

        if (profile.historicalScoringDarts >= 45) {
            profile.historicalScoringWeights.forEach((weight, key) => {
                weights.set(key, (weights.get(key) || 0) + weight);
            });
        }

        return weights;
    };

    const isSafeDart = (currentScore, currentTurnTotal, dart) => {
        const remaining = currentScore - currentTurnTotal - scoreOf(dart);
        if (remaining < 0 || remaining === 1) return false;
        if (remaining === 0 && !Rules.isDouble(normalizeThrow(dart))) return false;
        return true;
    };

    const pickSafeDart = (currentScore, currentTurnTotal, picker) => {
        for (let attempt = 0; attempt < 12; attempt++) {
            const dart = normalizeThrow(picker());
            if (isSafeDart(currentScore, currentTurnTotal, dart)) {
                return dart;
            }
        }

        return { ...MISS };
    };

    const simulateTripleTarget = (profile, segment) => {
        const skill = getSkill(profile);
        const [left, right] = getNeighbors(segment);
        const weights = new Map();

        addWeight(weights, { segment, multiplier: 3 }, 6 + skill * 28);
        addWeight(weights, { segment, multiplier: 1 }, 40 - skill * 7);
        addWeight(weights, { segment: left, multiplier: 1 }, 18 - skill * 4);
        addWeight(weights, { segment: right, multiplier: 1 }, 18 - skill * 4);
        addWeight(weights, { segment: -1, multiplier: 1 }, 12 - skill * 5);
        addWeight(weights, { segment, multiplier: 2 }, 1 + skill * 2);
        addWeight(weights, { segment: left, multiplier: 3 }, 2);
        addWeight(weights, { segment: right, multiplier: 3 }, 2);

        return weightedPick(weights);
    };

    const simulateDoubleTarget = (profile, segment) => {
        const skill = getSkill(profile);
        const [left, right] = getNeighbors(segment);
        const weights = new Map();
        const finishRate = clamp(profile.finishDoubleSuccessRate / 100, 0.06, 0.55);
        const doubleHit = clamp((finishRate * 0.65) + skill * 0.08, 0.04, 0.45);

        addWeight(weights, { segment, multiplier: 2 }, doubleHit * 100);
        addWeight(weights, { segment, multiplier: 1 }, (0.42 - skill * 0.06) * 100);
        addWeight(weights, { segment: left, multiplier: 1 }, (0.16 - skill * 0.03) * 100);
        addWeight(weights, { segment: right, multiplier: 1 }, (0.16 - skill * 0.03) * 100);
        addWeight(weights, { segment: -1, multiplier: 1 }, (0.20 - skill * 0.08) * 100);
        addWeight(weights, { segment: left, multiplier: 2 }, 3);
        addWeight(weights, { segment: right, multiplier: 2 }, 3);

        return weightedPick(weights);
    };

    const simulateSingleTarget = (profile, segment) => {
        const skill = getSkill(profile);
        const [left, right] = getNeighbors(segment);
        const weights = new Map();

        addWeight(weights, { segment, multiplier: 1 }, 58 + skill * 18);
        addWeight(weights, { segment: left, multiplier: 1 }, 13 - skill * 4);
        addWeight(weights, { segment: right, multiplier: 1 }, 13 - skill * 4);
        addWeight(weights, { segment, multiplier: 3 }, 4 + skill * 5);
        addWeight(weights, { segment, multiplier: 2 }, 3);
        addWeight(weights, { segment: -1, multiplier: 1 }, 9 - skill * 5);

        return weightedPick(weights);
    };

    const simulateBullTarget = (profile, target) => {
        const skill = getSkill(profile);
        const weights = new Map();

        if (target.segment === 50 || target.segment === 0) {
            addWeight(weights, { segment: 50, multiplier: 1 }, 10 + skill * 18);
            addWeight(weights, { segment: 25, multiplier: 1 }, 36 + skill * 6);
        } else {
            addWeight(weights, { segment: 25, multiplier: 1 }, 45 + skill * 18);
            addWeight(weights, { segment: 50, multiplier: 1 }, 6 + skill * 6);
        }

        addWeight(weights, { segment: 20, multiplier: 1 }, 12);
        addWeight(weights, { segment: 3, multiplier: 1 }, 8);
        addWeight(weights, { segment: -1, multiplier: 1 }, 18 - skill * 8);

        return weightedPick(weights);
    };

    const simulateTarget = (profile, target) => {
        const normalized = normalizeThrow(target);

        if (normalized.segment === 25 || normalized.segment === 50 || normalized.segment === 0) {
            return normalizeThrow(simulateBullTarget(profile, normalized));
        }

        if (normalized.multiplier === 3) {
            return normalizeThrow(simulateTripleTarget(profile, normalized.segment));
        }

        if (normalized.multiplier === 2) {
            return normalizeThrow(simulateDoubleTarget(profile, normalized.segment));
        }

        return normalizeThrow(simulateSingleTarget(profile, normalized.segment));
    };

    const generateScoringTurn = (profile, currentScore) => {
        const weights = getScoringWeights(profile);
        const throws = [];
        let turnTotal = 0;

        for (let i = 0; i < 3; i++) {
            const dart = pickSafeDart(currentScore, turnTotal, () => weightedPick(weights));
            throws.push(dart);
            turnTotal += scoreOf(dart);
        }

        return throws;
    };

    const shouldAttemptFinish = (profile, currentScore) => {
        if (currentScore < 2 || currentScore > 170) return false;
        if (currentScore <= 40) return true;
        if (currentScore <= profile.bestFinishingScore) return Math.random() < 0.85;
        if (currentScore <= 80) return Math.random() < 0.55;
        return profile.averageRoundScore >= 60 && Math.random() < 0.25;
    };

    const getSetupTarget = (currentScore, currentTurnTotal) => {
        const remaining = currentScore - currentTurnTotal;
        const preferredDouble = 40;

        if (remaining > 100) return { segment: 20, multiplier: 3 };
        if (remaining - preferredDouble >= 2 && remaining - preferredDouble <= 60) {
            const setupScore = remaining - preferredDouble;
            if (setupScore <= 20) return { segment: setupScore, multiplier: 1 };
            if (setupScore % 3 === 0 && setupScore / 3 <= 20) return { segment: setupScore / 3, multiplier: 3 };
            if (setupScore % 2 === 0 && setupScore / 2 <= 20) return { segment: setupScore / 2, multiplier: 2 };
        }

        return { segment: 20, multiplier: 1 };
    };

    const generateFinishOrSetupTurn = (profile, currentScore) => {
        const throws = [];
        let turnTotal = 0;

        for (let i = 0; i < 3; i++) {
            const remaining = currentScore - turnTotal;
            if (remaining === 0) break;

            const dartsLeft = 3 - i;
            const finish = Finishes.selectBestFinish(remaining, profile.preferredFinishingDouble);
            const canUseFinishRoute = finish && finish.length <= dartsLeft && shouldAttemptFinish(profile, remaining);
            const target = canUseFinishRoute ? finish[0] : getSetupTarget(currentScore, turnTotal);

            const dart = pickSafeDart(currentScore, turnTotal, () => simulateTarget(profile, target));
            throws.push(dart);
            turnTotal += scoreOf(dart);

            if (currentScore - turnTotal === 0) break;
        }

        return throws.length < 3 ? throws : throws.slice(0, 3);
    };

    const generateTurn = (profile, currentScore) => {
        if (currentScore <= 170) {
            return generateFinishOrSetupTurn(profile, currentScore);
        }

        if (currentScore <= 230) {
            return generateFinishOrSetupTurn(profile, currentScore);
        }

        return generateScoringTurn(profile, currentScore);
    };

    const playTurn = (match) => {
        const playerIndex = match.currentPlayerIndex;
        const ghostProfile = Games.getGhostProfile(match, playerIndex);
        const profile = buildProfile(ghostProfile?.playerId || match.ghostProfilePlayerId, match.gameType);
        const currentScore = match.scores[playerIndex];
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
