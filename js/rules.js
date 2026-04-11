/**
 * Rules Module
 * Valide les règles des différents jeux de fléchettes
 */

const Rules = (() => {
    // Valeurs valides pour une fléchette (0-20 + 25, avec multiplicateurs 1x, 2x, 3x)
    const VALID_SCORES = [
        // Simples (1x)
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25,
        // Doubles (2x)
        2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
        32, 34, 36, 38, 40, 50,
        // Triples (3x)
        3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45,
        48, 51, 54, 57, 60, 75
    ];

    /**
     * Valide les scores des 3 fléchettes d'une volée
     */
    const validateThrows = (scores) => {
        if (!Array.isArray(scores) || scores.length !== 3) {
            return { valid: false, reason: 'Format invalide' };
        }

        for (let score of scores) {
            if (typeof score !== 'number' || score < 0 || score > 60) {
                return { valid: false, reason: 'Score entre 0 et 60 requis' };
            }
        }

        return { valid: true };
    };

    /**
     * Valide une volée en fonction des règles du jeu
     */
    const validateRound = (gameType, currentScore, scores, isLastThrow = false) => {
        // Valider les scores individuels
        const throwValidation = validateThrows(scores);
        if (!throwValidation.valid) {
            return throwValidation;
        }

        const total = scores.reduce((a, b) => a + b, 0);
        const newScore = currentScore - total;

        // Ne pas dépasser 0
        if (newScore < 0) {
            return { valid: false, reason: 'Dépassement : score négatif non autorisé' };
        }

        // Si le score devient exactement 0
        if (newScore === 0) {
            // Doit terminer avec un double
            const lastThrow = scores[2];
            if (!isDouble(lastThrow)) {
                return { valid: false, reason: 'Score 0 atteint, mais pas avec un double' };
            }
            return { valid: true, finished: true };
        }

        // Score valide mais pas zéro
        return { valid: true, finished: false };
    };

    /**
     * Vérifie si une fléchette est un double
     */
    const isDouble = (score) => {
        // Les doubles sont des nombres pairs: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50
        const validDoubles = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 50];
        return validDoubles.includes(score);
    };

    /**
     * Vérifie si une fléchette est un triple
     */
    const isTriple = (score) => {
        const validTriples = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60, 75];
        return validTriples.includes(score);
    };

    /**
     * Obtient les infos d'une fléchette
     */
    const getThrowInfo = (score) => {
        if (score === 0) return { value: 0, multiplier: 1, base: 0 };
        if (isDouble(score)) return { value: score, multiplier: 2, base: score / 2 };
        if (isTriple(score)) return { value: score, multiplier: 3, base: score / 3 };
        return { value: score, multiplier: 1, base: score };
    };

    return {
        validateThrows,
        validateRound,
        isDouble,
        isTriple,
        getThrowInfo,
        VALID_SCORES
    };
})();
