/**
 * Finishes Module
 * Calcule les volées possibles pour finir un match au-delà d'un score <= 170
 * Suggestions intelligentes basées sur le double fétiche du joueur
 */

const Finishes = (() => {
    /**
     * Tous les doubles disponibles sur un dartboard
     * Format: {segment, multiplier, points}
     */
    const getAllDoubles = () => {
        const doubles = [];
        // Doubles normaux (1-20)
        for (let i = 1; i <= 20; i++) {
            doubles.push({ segment: i, multiplier: 2, points: i * 2 });
        }
        // Bull's eye (compte comme double, 50 points)
        doubles.push({ segment: 0, multiplier: 1, points: 50 });
        return doubles;
    };

    /**
     * Tous les segments valides avec leurs multiplicateurs
     */
    const getAllThrows = () => {
        const throws = [];
        const segments = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];
        
        segments.forEach(segment => {
            if (segment === 0) {
                // Bull's eye = 50 points uniquement
                throws.push({ segment: 0, multiplier: 1, points: 50 });
            } else if (segment === 25) {
                // Bull 25 = 25 points uniquement
                throws.push({ segment: 25, multiplier: 1, points: 25 });
            } else {
                // Autres segments: simple, double, triple
                throws.push({ segment, multiplier: 1, points: segment * 1 });
                throws.push({ segment, multiplier: 2, points: segment * 2 });
                throws.push({ segment, multiplier: 3, points: segment * 3 });
            }
        });
        
        return throws;
    };

    /**
     * Formate un throw pour l'affichage
     */
    const formatThrow = (throw_) => {
        const { segment, multiplier, points } = throw_;
        
        if (segment === 0) {
            return `BULL (${points})`;
        }
        if (segment === 25) {
            return `25 (${points})`;
        }
        
        const multiplierName = {
            1: 'Single',
            2: 'Double',
            3: 'Triple'
        }[multiplier] || 'Single';
        
        return `${multiplierName} ${segment} (${points})`;
    };

    /**
     * Calcule les combinaisons pour finir un score
     * Retourne un tableau de solutions, chacune étant un array de throws
     * Solutions sont triées par:
     * 1. Nombre minimal de fléchettes
     * 2. Plus haut score d'attaque (score avant le dernier double)
     */
    const calculateFinishes = (score) => {
        if (score < 2 || score > 170) {
            return [];
        }

        const solutions = [];
        const allThrows = getAllThrows();
        const doubles = getAllDoubles();

        // Cas 1: Finish avec 1 fléchette (double uniquement)
        doubles.forEach(double => {
            if (double.points === score) {
                solutions.push([double]);
            }
        });

        // Cas 2: Finish avec 2 fléchettes (un throw non-double + un double)
        allThrows.forEach(first => {
            // S'assurer que la première fléchette n'est pas un double
            if (first.multiplier === 2) {
                return; // Skip doubles pour les fléchettes d'attaque
            }
            doubles.forEach(second => {
                if (first.points + second.points === score) {
                    solutions.push([first, second]);
                }
            });
        });

        // Cas 3: Finish avec 3 fléchettes (deux throws non-doubles + un double)
        allThrows.forEach(first => {
            // S'assurer que la première fléchette n'est pas un double
            if (first.multiplier === 2) {
                return; // Skip doubles pour les fléchettes d'attaque
            }
            allThrows.forEach(second => {
                // S'assurer que la deuxième fléchette n'est pas un double
                if (second.multiplier === 2) {
                    return; // Skip doubles pour les fléchettes d'attaque
                }
                doubles.forEach(third => {
                    if (first.points + second.points + third.points === score) {
                        solutions.push([first, second, third]);
                    }
                });
            });
        });

        return solutions;
    };

    /**
     * Sélectionne la meilleure finition basée sur:
     * 1. Préférence du double fétiche du joueur (si disponible)
     * 2. Sinon, minimiser le nombre de fléchettes
     * 3. Puis maximiser le score d'attaque (avant le double final)
     */
    const selectBestFinish = (score, playerPreferredDouble) => {
        const finishes = calculateFinishes(score);

        if (finishes.length === 0) {
            return null;
        }

        // Filtrer les finitions qui utilisent le double préféré du joueur
        let selectedFinish = null;

        if (playerPreferredDouble) {
            const preferredSegment = playerPreferredDouble.segment;
            
            // Chercher une finition qui utilise le double préféré
            for (const finish of finishes) {
                const lastThrow = finish[finish.length - 1];
                if (lastThrow.segment === preferredSegment) {
                    // Parmi les finitions avec le double préféré, prendre celle avec moins de fléchettes
                    if (!selectedFinish || finish.length < selectedFinish.length) {
                        selectedFinish = finish;
                    } else if (finish.length === selectedFinish.length) {
                        // Même nombre de fléchettes, calculer le score d'attaque
                        const attackScore = finish.slice(0, -1).reduce((sum, t) => sum + t.points, 0);
                        const selectedAttackScore = selectedFinish.slice(0, -1).reduce((sum, t) => sum + t.points, 0);
                        if (attackScore > selectedAttackScore) {
                            selectedFinish = finish;
                        }
                    }
                }
            }
        }

        // Si pas de finition avec le double préféré, prendre la meilleure
        if (!selectedFinish) {
            // Trier par nombre de fléchettes (asc), puis par score d'attaque (desc)
            finishes.sort((a, b) => {
                if (a.length !== b.length) {
                    return a.length - b.length;
                }
                // Même nombre de fléchettes, comparer le score d'attaque
                const aAttack = a.slice(0, -1).reduce((sum, t) => sum + t.points, 0);
                const bAttack = b.slice(0, -1).reduce((sum, t) => sum + t.points, 0);
                return bAttack - aAttack;
            });
            selectedFinish = finishes[0];
        }

        return selectedFinish;
    };

    /**
     * Obtient la suggestion de finition à afficher pour le joueur courant
     * Retourne un objet avec:
     * - finish: array de throws
     * - formatted: string formaté pour l'affichage
     * - attackScore: score avant le double final
     * - finishingDouble: le double utilisé
     */
    const getFinishSuggestion = (score, playerId) => {
        // Score > 170 ne peut pas être fini en une volée
        if (score > 170 || score < 2) {
            return null;
        }

        // Récupérer le double préféré du joueur
        const player = Players.getById(playerId);
        const preferredDouble = player && player.stats ? player.stats.preferredFinishingDouble : null;

        // Sélectionner la meilleure finition
        const finish = selectBestFinish(score, preferredDouble);

        if (!finish) {
            return null;
        }

        // Formater pour l'affichage
        const formatted = finish.map(t => formatThrow(t)).join(' + ');
        const attackScore = finish.slice(0, -1).reduce((sum, t) => sum + t.points, 0);
        const finishingDouble = finish[finish.length - 1];

        return {
            finish,
            formatted,
            attackScore,
            finishingDouble: {
                segment: finishingDouble.segment,
                points: finishingDouble.points
            },
            usedPreferredDouble: preferredDouble && preferredDouble.segment === finishingDouble.segment
        };
    };

    return {
        calculateFinishes,
        selectBestFinish,
        getFinishSuggestion,
        formatThrow
    };
})();
