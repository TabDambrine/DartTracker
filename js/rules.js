/**
 * Rules Module
 * Valide les règles des différents jeux de fléchettes
 */

const Rules = (() => {
    // Segments valides du dartboard
    // -1 = MISS (fléchette hors cible, 0 points)
    // 0 = BULL's eye (50 points)
    // 1-20 = segments standards
    // 25 = BULL outer (25 points)
    const SEGMENTS = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];

    // Multiplicateurs
    const MULTIPLIERS = {
        SINGLE: 1,
        DOUBLE: 2,
        TRIPLE: 3,
        BULL_25: 25,  // Inner bull (25 points)
        BULL_50: 50   // Outer bull (50 points, compte comme double)
    };

    /**
     * Valide une fléchette avec segment et multiplicateur
     */
    const validateThrow = (throw_) => {
        if (!throw_ || typeof throw_ !== 'object') {
            return { valid: false, reason: 'Format invalide' };
        }

        const { segment, multiplier } = throw_;

        // Valider le segment
        if (!SEGMENTS.includes(segment)) {
            return { valid: false, reason: 'Segment invalide' };
        }

        // Cas spécial du MISS
        if (segment === -1) {
            // MISS ne peut avoir que le multiplicateur SINGLE
            if (multiplier !== MULTIPLIERS.SINGLE) {
                return { valid: false, reason: 'MISS ne peut que avoir un multiplicateur' };
            }
            return { valid: true };
        }

        // Valider le multiplicateur
        if (![MULTIPLIERS.SINGLE, MULTIPLIERS.DOUBLE, MULTIPLIERS.TRIPLE].includes(multiplier)) {
            return { valid: false, reason: 'Multiplicateur invalide' };
        }

        // BULL ne peut pas avoir de multiplicateur (c'est spécial)
        if ((segment === 25 || segment === 0) && multiplier !== MULTIPLIERS.SINGLE) {
            return { valid: false, reason: 'BULL ne peut pas avoir de multiplicateur' };
        }

        return { valid: true };
    };

    /**
     * Valide les 3 fléchettes d'une volée
     */
    const validateThrows = (throws) => {
        if (!Array.isArray(throws) || throws.length !== 3) {
            return { valid: false, reason: 'Exactement 3 fléchettes requises' };
        }

        for (let throw_ of throws) {
            const validation = validateThrow(throw_);
            if (!validation.valid) {
                return validation;
            }
        }

        return { valid: true };
    };

    /**
     * Calcule le score d'une fléchette
     */
    const calculateScore = (throw_) => {
        const { segment, multiplier } = throw_;

        // Cas du MISS (hors cible)
        if (segment === -1) {
            return 0;  // Miss = 0 points
        }

        // Cas du BULL's eye
        if (segment === 0) {
            return 50;  // Bull's eye = 50 points (compte comme double)
        }

        // Cas du BULL outer
        if (segment === 25) {
            return 25;  // Inner bull = 25 points
        }

        // Autre segments avec multiplicateurs
        return segment * multiplier;
    };

    /**
     * Vérifie si une fléchette est un double
     */
    const isDouble = (throw_) => {
        if (!throw_) return false;

        // MISS n'est pas un double
        if (throw_.segment === -1) return false;

        // Bull's eye (segment 0) compte comme double
        if (throw_.segment === 0) return true;

        // Double multiplicateur
        if (throw_.multiplier === MULTIPLIERS.DOUBLE) return true;

        return false;
    };

    /**
     * Vérifie si une fléchette est un triple
     */
    const isTriple = (throw_) => {
        if (!throw_) return false;
        return throw_.multiplier === MULTIPLIERS.TRIPLE;
    };

    /**
     * Valide une volée et retourne les raisons d'invalidité
     * Accepte 1-3 fléchettes (supporte les finishes partiels et volées complètes)
     * Retourne toujours un résultat même si invalide
     */
    const validateRoundDetailed = (gameType, currentScore, throws) => {
        // Valider le nombre et le format des fléchettes
        if (!Array.isArray(throws) || throws.length === 0 || throws.length > 3) {
            return {
                valid: false,
                finished: false,
                reason: 'Entre 1 et 3 fléchettes requises'
            };
        }

        // Valider chaque fléchette individuellement
        for (let throw_ of throws) {
            const validation = validateThrow(throw_);
            if (!validation.valid) {
                return {
                    valid: false,
                    finished: false,
                    reason: validation.reason
                };
            }
        }

        // Calculer le total
        const scores = throws.map(calculateScore);
        const total = scores.reduce((a, b) => a + b, 0);
        const newScore = currentScore - total;

        // Ne pas dépasser 0
        if (newScore < 0) {
            return {
                valid: false,
                finished: false,
                reason: 'Dépassement : score négatif non autorisé'
            };
        }

        // Score restant de 1 = impossible à finir (minimum finissable = 2 pour double 1)
        if (newScore === 1) {
            return {
                valid: false,
                finished: false,
                reason: 'Score 1 impossible à finir (minimum finissable = 2 pour Double 1)'
            };
        }

        // Si le score devient exactement 0
        if (newScore === 0) {
            // Doit terminer avec un double
            const lastThrow = throws[throws.length - 1];
            if (!isDouble(lastThrow)) {
                return {
                    valid: false,
                    finished: false,
                    reason: 'Score 0 atteint, mais la dernière fléchette n\'est pas un double'
                };
            }
            return { valid: true, finished: true, reason: null };
        }

        // Score valide mais pas zéro
        return { valid: true, finished: false, reason: null };
    };

    /**
     * Formate l'affichage d'une fléchette
     */
    const formatThrow = (throw_) => {
        const { segment, multiplier } = throw_;
        const score = calculateScore(throw_);

        // Cas du MISS
        if (segment === -1) {
            return `MISS (0)`;
        }

        if (segment === 0) {
            return `BULL (${score})`;
        }
        if (segment === 25) {
            return `25`;
        }

        const multiplierName = {
            1: 'Simple',
            2: 'Double',
            3: 'Triple'
        }[multiplier];

        return `${multiplierName} ${segment} (${score})`;
    };

    /**
     * Obtient les segments valides
     */
    const getValidSegments = () => {
        return SEGMENTS;
    };

    /**
     * Valide un finish partial (moins de 3 fléchettes)
     * Utile pour vérifier si on peut finir avant la 3e fléchette
     * Par exemple: 61 = Triple 17 (51) + Double 5 (10) = finish
     */
    const validatePartialFinish = (gameType, currentScore, throws) => {
        // throws peut avoir 1, 2, ou 3 éléments
        if (!Array.isArray(throws) || throws.length === 0 || throws.length > 3) {
            return { valid: false, finished: false };
        }

        // Valider les fléchettes qui ont été lancées
        for (let throwObj of throws) {
            const validation = validateThrow(throwObj);
            if (!validation.valid) {
                return { valid: false, finished: false };
            }
        }

        // Calculer le score
        const scores = throws.map(calculateScore);
        const total = scores.reduce((a, b) => a + b, 0);
        const newScore = currentScore - total;

        // Dépassement
        if (newScore < 0) {
            return { valid: false, finished: false };
        }

        // Score de 1 = impossible
        if (newScore === 1) {
            return { valid: false, finished: false };
        }

        // Finish exactement à 0
        if (newScore === 0) {
            // La dernière fléchette lancée doit être un double
            const lastThrow = throws[throws.length - 1];
            if (!isDouble(lastThrow)) {
                return { valid: false, finished: false };
            }
            return { valid: true, finished: true };
        }

        // Valide mais pas terminé
        return { valid: true, finished: false };
    };

    /**
     * Obtient les multiplicateurs valides
     */
    const getValidMultipliers = () => {
        return [MULTIPLIERS.SINGLE, MULTIPLIERS.DOUBLE, MULTIPLIERS.TRIPLE];
    };

    return {
        validateThrow,
        validateThrows,
        validateRound: validateRoundDetailed,
        validatePartialFinish,
        isDouble,
        isTriple,
        calculateScore,
        formatThrow,
        getValidSegments,
        getValidMultipliers,
        SEGMENTS,
        MULTIPLIERS
    };
})();
