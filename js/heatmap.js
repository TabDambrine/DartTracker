/**
 * Heatmap Module
 * Génère une heatmap des lancers sur une cible de fléchettes
 */

const Heatmap = (() => {
    // Constantes pour la cible - ordre standard d'une cible de fléchettes
    // En partant du haut et dans le sens horaire : 20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5
    const DARTBOARD = {
        segments: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5],
        bull25: 25,
        bull50: [0, 50], // Segment 0 ou 50 = BULL 50
        multipliers: {
            SINGLE: 1,
            DOUBLE: 2,
            TRIPLE: 3
        }
    };

    // Échelle de couleurs : dégradé de violet vers blanc (mobile-first, compatible avec les couleurs de la cible)
    // Les couleurs sont choisies pour être visibles sur fond sombre et clair
    const COLOR_SCALE = [
        { min: 0, max: 0, color: '#f0f0f0' },       // Blanc (aucune fléchette)
        { min: 1, max: 5, color: '#e6e6fa' },       // Violet très clair
        { min: 6, max: 15, color: '#d8bfd8' },      // Violet clair
        { min: 16, max: 30, color: '#c9a0dc' },     // Violet moyen
        { min: 31, max: 50, color: '#b189d6' },     // Violet
        { min: 51, max: 100, color: '#9966cc' },    // Violet foncé
        { min: 101, max: Infinity, color: '#800080' } // Violet très foncé
    ];

    /**
     * Collecte toutes les fléchettes d'un joueur
     * @param {string} playerId - ID du joueur
     * @param {Object} filters - Filtres (matchType: 'competition'|'training'|'all', gameType: '501'|'301'|'all', validity: 'all'|'valid'|'invalid', finishOnly: boolean)
     * @returns {Array<{segment: number, multiplier: number, isFinish: boolean}>} - Liste de toutes les fléchettes
     */
    const collectAllDarts = (playerId, filters = {}) => {
        const {
            matchType = 'all',  // 'competition' | 'training' | 'all'
            gameType = 'all',    // '501' | '301' | 'all'
            validity = 'all',     // 'all' | 'valid' | 'invalid'
            finishOnly = false    // true pour n'afficher que les lancers de finition
        } = filters;

        const matches = Storage.getPlayerMatches(playerId)
            .filter(match => !match.playerIds.includes('deleted_player'));

        // Filtrer par type de match
        let filteredMatches = matches.filter(match => {
            if (matchType === 'competition') {
                return !match.isSelfPlay && !match.isGhost;
            } else if (matchType === 'training') {
                return match.isSelfPlay || match.isGhost;
            }
            return true; // 'all'
        });

        // Filtrer par type de jeu
        if (gameType !== 'all') {
            filteredMatches = filteredMatches.filter(match => match.gameType === gameType);
        }

        const darts = [];

        filteredMatches.forEach(match => {
            const playerIndex = match.playerIds.indexOf(playerId);
            if (playerIndex === -1) return;

            match.throws.forEach(throwRecord => {
                // Ignorer les lancers du Ghost
                if (throwRecord.isSimulated || throwRecord.source === 'ghost') return;

                // Filtrer par validité
                if (validity === 'valid' && !throwRecord.isValid) return;
                if (validity === 'invalid' && throwRecord.isValid) return;

                // Si finishOnly, ne garder que les lancers de la volée de finition
                if (finishOnly) {
                    // Trouver si cette volée est la volée de finition (runningTotal === 0)
                    if (throwRecord.runningTotal !== 0) return;
                }

                // Ajouter chaque fléchette
                if (throwRecord.throw) {
                    throwRecord.throw.forEach(dart => {
                        // Ignorer les MISS (segment = -1) ou les fléchettes sans segment
                        if (dart.segment === -1 || dart.segment === undefined) return;
                        
                        // Déterminer si c'est un lancer de finition
                        const isFinish = throwRecord.runningTotal === 0 && throwRecord.isValid;
                        
                        darts.push({
                            segment: dart.segment,
                            multiplier: dart.multiplier,
                            isValid: throwRecord.isValid,
                            isFinish: isFinish,
                            timestamp: throwRecord.timestamp
                        });
                    });
                }
            });
        });

        return darts;
    };

    /**
     * Compte les occurrences par (segment, multiplier)
     * @param {Array<{segment: number, multiplier: number}>} darts - Liste des fléchettes
     * @returns {Map<string, {segment: number, multiplier: number, count: number}>} - Map avec clé "segment-multiplier"
     */
    const countDartsByZone = (darts) => {
        const counts = new Map();

        darts.forEach(dart => {
            const key = `${dart.segment}-${dart.multiplier}`;
            if (!counts.has(key)) {
                counts.set(key, {
                    segment: dart.segment,
                    multiplier: dart.multiplier,
                    count: 0
                });
            }
            counts.get(key).count += 1;
        });

        return counts;
    };

    /**
     * Obtient la couleur pour un nombre de lancers donné
     * @param {number} count - Nombre de lancers
     * @returns {string} - Code couleur hexadécimal
     */
    const getColorForCount = (count) => {
        for (const range of COLOR_SCALE) {
            if (count >= range.min && count <= range.max) {
                return range.color;
            }
        }
        return '#f0f0f0'; // Default: blanc
    };

    /**
     * Génère le SVG de la cible avec la heatmap
     * @param {Map<string, {segment: number, multiplier: number, count: number}>} dartCounts - Compte des lancers par zone
     * @param {number} maxCount - Nombre maximum de lancers (pour normaliser)
     * @returns {string} - HTML SVG de la cible
     */
    const generateDartboardSVG = (dartCounts, maxCount = 1) => {
        const size = 400; // Taille du SVG (400x400) - adaptée mobile
        const centerX = size / 2;
        const centerY = size / 2;
        
        // Ordre des zones : Simple (centre), Triple (milieu), Double (extérieur)
        // Avec des marges pour bien distinguer les zones
        const singleRadius = size * 0.20;   // Simple au centre (20%)
        const tripleInnerRadius = size * 0.25; // Début de la zone Triple
        const tripleOuterRadius = size * 0.35; // Fin de la zone Triple
        const doubleInnerRadius = size * 0.40; // Début de la zone Double
        const doubleOuterRadius = size * 0.48; // Fin de la zone Double
        const bull25Radius = size * 0.10;   // Rayon BULL 25
        const bull50Radius = size * 0.05;   // Rayon BULL 50

        // Calculer l'angle entre chaque segment (20 segments = 18° chacun)
        const segmentAngle = (2 * Math.PI) / 20;
        // Décalage de -90° (-π/2) pour que le premier segment (20) soit en haut
        const startOffset = -Math.PI / 2;

        let svg = `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <!-- Fond -->
                <rect width="${size}" height="${size}" fill="#1a1a2e" />

                <!-- Cercle extérieur (background) -->
                <circle cx="${centerX}" cy="${centerY}" r="${doubleOuterRadius}" fill="#0f0f1a" />
        `;

        // Dessiner les segments pour Simple, Triple, Double (dans cet ordre : centre vers extérieur)
        DARTBOARD.segments.forEach((segment, index) => {
            const startAngle = startOffset + index * segmentAngle;
            const endAngle = startOffset + (index + 1) * segmentAngle;

            // Couleur par défaut (blanc cassé)
            let singleColor = '#f0f0f0';
            let tripleColor = '#f0f0f0';
            let doubleColor = '#f0f0f0';

            // Récupérer les comptes pour ce segment
            const singleKey = `${segment}-1`;
            const tripleKey = `${segment}-3`;
            const doubleKey = `${segment}-2`;

            const singleCount = dartCounts.has(singleKey) ? dartCounts.get(singleKey).count : 0;
            const tripleCount = dartCounts.has(tripleKey) ? dartCounts.get(tripleKey).count : 0;
            const doubleCount = dartCounts.has(doubleKey) ? dartCounts.get(doubleKey).count : 0;

            // Appliquer la heatmap
            singleColor = getColorForCount(singleCount);
            tripleColor = getColorForCount(tripleCount);
            doubleColor = getColorForCount(doubleCount);

            // Dessiner la zone Simple (centre) - cercle complet
            svg += `
                <path d="M ${centerX},${centerY}
                         L ${centerX + singleRadius * Math.cos(startAngle)},${centerY + singleRadius * Math.sin(startAngle)}
                         A ${singleRadius},${singleRadius} 0 0 1 ${centerX + singleRadius * Math.cos(endAngle)},${centerY + singleRadius * Math.sin(endAngle)}
                         Z"
                      fill="${singleColor}"
                      stroke="#000" stroke-width="1"
                      data-segment="${segment}" data-multiplier="1" />
            `;

            // Dessiner la zone Triple (milieu) - entre singleRadius et tripleOuterRadius
            svg += `
                <path d="M ${centerX + tripleInnerRadius * Math.cos(startAngle)},${centerY + tripleInnerRadius * Math.sin(startAngle)}
                         L ${centerX + tripleOuterRadius * Math.cos(startAngle)},${centerY + tripleOuterRadius * Math.sin(startAngle)}
                         A ${tripleOuterRadius},${tripleOuterRadius} 0 0 1 ${centerX + tripleOuterRadius * Math.cos(endAngle)},${centerY + tripleOuterRadius * Math.sin(endAngle)}
                         L ${centerX + tripleInnerRadius * Math.cos(endAngle)},${centerY + tripleInnerRadius * Math.sin(endAngle)}
                         A ${tripleInnerRadius},${tripleInnerRadius} 0 0 0 ${centerX + tripleInnerRadius * Math.cos(startAngle)},${centerY + tripleInnerRadius * Math.sin(startAngle)}
                         Z"
                      fill="${tripleColor}"
                      stroke="#000" stroke-width="1"
                      data-segment="${segment}" data-multiplier="3" />
            `;

            // Dessiner la zone Double (extérieur) - entre tripleOuterRadius et doubleOuterRadius
            svg += `
                <path d="M ${centerX + doubleInnerRadius * Math.cos(startAngle)},${centerY + doubleInnerRadius * Math.sin(startAngle)}
                         L ${centerX + doubleOuterRadius * Math.cos(startAngle)},${centerY + doubleOuterRadius * Math.sin(startAngle)}
                         A ${doubleOuterRadius},${doubleOuterRadius} 0 0 1 ${centerX + doubleOuterRadius * Math.cos(endAngle)},${centerY + doubleOuterRadius * Math.sin(endAngle)}
                         L ${centerX + doubleInnerRadius * Math.cos(endAngle)},${centerY + doubleInnerRadius * Math.sin(endAngle)}
                         A ${doubleInnerRadius},${doubleInnerRadius} 0 0 0 ${centerX + doubleInnerRadius * Math.cos(startAngle)},${centerY + doubleInnerRadius * Math.sin(startAngle)}
                         Z"
                      fill="${doubleColor}"
                      stroke="#000" stroke-width="1"
                      data-segment="${segment}" data-multiplier="2" />
            `;
        });

        // Dessiner BULL 25 (anneau) - entre le centre et la zone Simple
        const bull25Count = dartCounts.has('25-1') ? dartCounts.get('25-1').count : 0;
        const bull25Color = getColorForCount(bull25Count);
        svg += `
            <circle cx="${centerX}" cy="${centerY}" r="${bull25Radius}"
                    fill="${bull25Color}" stroke="#000" stroke-width="1"
                    data-segment="25" data-multiplier="1" />
        `;

        // Dessiner BULL 50 (centre) - tout au centre
        const bull50Count = (dartCounts.has('0-1') ? dartCounts.get('0-1').count : 0) +
                           (dartCounts.has('50-1') ? dartCounts.get('50-1').count : 0);
        const bull50Color = getColorForCount(bull50Count);
        svg += `
            <circle cx="${centerX}" cy="${centerY}" r="${bull50Radius}"
                    fill="${bull50Color}" stroke="#000" stroke-width="1"
                    data-segment="0" data-multiplier="1" />
        `;

        // Ajouter les numéros des segments (positionnés dans la zone Double)
        DARTBOARD.segments.forEach((segment, index) => {
            const angle = startOffset + index * segmentAngle + segmentAngle / 2;
            const textRadius = doubleInnerRadius + (doubleOuterRadius - doubleInnerRadius) * 0.5;
            const x = centerX + textRadius * Math.cos(angle);
            const y = centerY + textRadius * Math.sin(angle);
            svg += `
                <text x="${x}" y="${y}" text-anchor="middle" fill="#000" font-size="10" font-weight="bold">
                    ${segment}
                </text>
            `;
        });

        // Ajouter les labels pour les zones (Simple, Triple, Double - dans l'ordre centre vers extérieur)
        svg += `
            <text x="${centerX}" y="${centerY - singleRadius * 0.7}" text-anchor="middle" fill="#000" font-size="9">Simple</text>
            <text x="${centerX}" y="${centerY - tripleOuterRadius * 0.7}" text-anchor="middle" fill="#000" font-size="9">Triple</text>
            <text x="${centerX}" y="${centerY - doubleOuterRadius * 0.7}" text-anchor="middle" fill="#000" font-size="9">Double</text>
            <text x="${centerX}" y="${centerY + bull25Radius * 0.6}" text-anchor="middle" fill="#000" font-size="9">25</text>
            <text x="${centerX}" y="${centerY}" text-anchor="middle" fill="#000" font-size="9" dy="3">50</text>
        `;

        svg += `</svg>`;
        return svg;
    };

    /**
     * Génère la légende de la heatmap
     * @param {number} maxCount - Nombre maximum de lancers
     * @returns {string} - HTML de la légende
     */
    const generateLegend = (maxCount) => {
        let html = '<div class="heatmap-legend">';
        html += '<h4>Légende</h4>';
        html += '<div class="legend-scales">';

        COLOR_SCALE.forEach(range => {
            const color = range.color;
            const min = range.min;
            const max = range.max === Infinity ? '+' : range.max;
            html += `
                <div class="legend-item">
                    <span class="legend-color" style="background-color: ${color}; border: 1px solid #333;"></span>
                    <span class="legend-label">${min}-${max}</span>
                </div>
            `;
        });

        html += '</div>';
        html += `<p>Max: ${maxCount} lancer${maxCount > 1 ? 's' : ''}</p>`;
        html += '</div>';
        return html;
    };

    /**
     * Génère le HTML complet de la heatmap
     * @param {string} playerId - ID du joueur
     * @param {Object} filters - Filtres à appliquer
     * @returns {string} - HTML complet (SVG + légende + stats)
     */
    const generateHeatmapHTML = (playerId, filters = {}) => {
        const darts = collectAllDarts(playerId, filters);
        const dartCounts = countDartsByZone(darts);

        // Trouver le max count pour la légende
        let maxCount = 0;
        dartCounts.forEach(entry => {
            if (entry.count > maxCount) {
                maxCount = entry.count;
            }
        });

        // Générer le SVG et la légende
        const svg = generateDartboardSVG(dartCounts, maxCount);
        const legend = generateLegend(maxCount);

        // Stats globales
        const totalDarts = darts.length;
        const uniqueZones = dartCounts.size;

        // Message si aucune donnée
        if (totalDarts === 0) {
            return '<p class="no-data">Aucune fléchette trouvée avec les filtres actuels.</p>';
        }

        return `
            <div class="heatmap-container">
                <div class="heatmap-header">
                    <h3>Heatmap des Lancers</h3>
                    <p>Total: ${totalDarts} fléchette${totalDarts > 1 ? 's' : ''} | Zones touchées: ${uniqueZones}</p>
                </div>
                <div class="dartboard-wrapper">
                    ${svg}
                </div>
                ${legend}
            </div>
        `;
    };

    /**
     * Met à jour la heatmap pour un joueur
     * @param {string} playerId - ID du joueur
     * @param {Object} filters - Filtres à appliquer
     * @returns {string} - HTML de la heatmap
     */
    const updateHeatmap = (playerId, filters = {}) => {
        return generateHeatmapHTML(playerId, filters);
    };

    return {
        collectAllDarts,
        countDartsByZone,
        generateDartboardSVG,
        generateLegend,
        generateHeatmapHTML,
        updateHeatmap
    };
})();
