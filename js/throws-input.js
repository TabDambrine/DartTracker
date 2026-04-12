/**
 * Throws Input Module
 * Gère l'interface de saisie des fléchettes avec cases clickables
 */

const ThrowsInput = (() => {
    const SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 50];
    const MULTIPLIERS = [
        { value: 1, label: 'S', name: 'Simple' },
        { value: 2, label: 'D', name: 'Double' },
        { value: 3, label: 'T', name: 'Triple' }
    ];

    let throwsState = [
        { segment: null, multiplier: null, completed: false },
        { segment: null, multiplier: null, completed: false },
        { segment: null, multiplier: null, completed: false }
    ];

    /**
     * Initialise les fléchettes et affiche la première
     */
    const init = () => {
        resetThrows();
        renderThrows();
    };

    /**
     * Réinitialise l'état des fléchettes
     */
    const resetThrows = () => {
        throwsState = [
            { segment: null, multiplier: null, completed: false },
            { segment: null, multiplier: null, completed: false },
            { segment: null, multiplier: null, completed: false }
        ];
    };

    /**
     * Affiche les fléchettes en fonction de leur état
     */
    const renderThrows = () => {
        const container = document.getElementById('throwsContainer');
        if (!container) return;

        container.innerHTML = throwsState.map((throw_, index) => {
            const isCompleted = throw_.segment !== null;
            return createThrowBlock(throw_, index, isCompleted);
        }).join('');

        // Attaché les événements
        attachThrowEvents();
    };

    /**
     * Crée le HTML pour un bloc de fléchette
     */
    const createThrowBlock = (throw_, index, isCompleted) => {
        const throwNumber = index + 1;
        const display = getThrowDisplay(throw_);

        // Vérifier si cette fléchette doit être affichée
        // Fléchette 0 (1ère) : toujours visible
        // Fléchette 1+ (2e, 3e) : visible seulement si la fléchette précédente est complétée
        const shouldDisplay = index === 0 || throwsState[index - 1].segment !== null;

        if (!shouldDisplay) {
            return '';  // Ne pas afficher cette fléchette
        }

        return `
            <div class="throw-block ${isCompleted ? 'completed' : ''} ${!isCompleted ? 'editing' : ''}" data-throw-index="${index}">
                <div class="throw-header">
                    <div class="throw-label">Fléchette ${throwNumber}</div>
                    <div class="throw-summary" data-summary="${index}">${display}</div>
                </div>

                ${!isCompleted ? createThrowSelectors(throw_, index) : ''}

                ${isCompleted ? `
                    <button class="throw-edit-btn" data-edit-index="${index}">Modifier</button>
                ` : ''}
            </div>
        `;
    };

    /**
     * Crée les sélecteurs pour une fléchette
     */
    const createThrowSelectors = (throw_, index) => {
        // Désactiver les multiplicateurs pour BULL (25, 50) et MISS (-1)
        const isBullOrMiss = throw_.segment === -1 || throw_.segment === 25 || throw_.segment === 50;

        const multiplierBtns = MULTIPLIERS.map(m => `
            <button class="multiplier-btn ${throw_.multiplier === m.value ? 'selected' : ''} ${isBullOrMiss ? 'disabled' : ''}" 
                    data-throw="${index}" data-multiplier="${m.value}"
                    title="${m.name}"
                    ${isBullOrMiss ? 'disabled' : ''}>
                ${m.label}
            </button>
        `).join('');

        // Segments 1-20
        const regularSegments = SEGMENTS.slice(0, 20);
        const specialSegments = [25, 50];

        const segmentGrid = regularSegments.map(seg => `
            <button class="segment-btn ${throw_.segment === seg ? 'selected' : ''}" 
                    data-throw="${index}" data-segment="${seg}">
                ${seg}
            </button>
        `).join('');

        const specialBtns = `
            <button class="segment-btn ${throw_.segment === 25 ? 'selected' : ''}" 
                    data-throw="${index}" data-segment="25" title="Bull 25">
                25
            </button>
            <button class="segment-btn ${throw_.segment === 50 ? 'selected' : ''}" 
                    data-throw="${index}" data-segment="50" title="Bull 50">
                50
            </button>
            <button class="segment-btn out-btn ${throw_.segment === -1 ? 'selected' : ''}" 
                    data-throw="${index}" data-segment="-1" title="Hors cible">
                OUT
            </button>
        `;

        return `
            <div class="throw-selectors">
                <div class="multiplier-selector">
                    <div class="multiplier-selector-label">Mult.</div>
                    <div class="multiplier-buttons">
                        ${multiplierBtns}
                    </div>
                </div>

                <div class="segment-selector">
                    <div class="segment-selector-label">Valeur</div>
                    <div class="segment-grid">
                        ${segmentGrid}
                    </div>
                    <div class="segment-grid">
                        ${specialBtns}
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * Obtient l'affichage formaté d'une fléchette
     */
    const getThrowDisplay = (throw_) => {
        if (throw_.segment === null) {
            return '—';
        }
        return Rules.formatThrow({ segment: throw_.segment, multiplier: throw_.multiplier });
    };

    /**
     * Attache les événements aux boutons
     */
    const attachThrowEvents = () => {
        // Événements multiplicateur
        document.querySelectorAll('.multiplier-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Ignorer si le bouton est désactivé
                if (e.target.disabled) return;

                const throwIndex = parseInt(e.target.dataset.throw);
                const multiplier = parseInt(e.target.dataset.multiplier);
                const segment = throwsState[throwIndex].segment;

                // Si segment est -1 (MISS), forcer multiplier à 1
                if (segment === -1) {
                    throwsState[throwIndex].multiplier = 1;
                } else {
                    throwsState[throwIndex].multiplier = multiplier;
                }

                checkAndAdvance(throwIndex);
            });
        });

        // Événements segment
        document.querySelectorAll('.segment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const throwIndex = parseInt(e.target.dataset.throw);
                const segment = parseInt(e.target.dataset.segment);

                throwsState[throwIndex].segment = segment;

                // Si MISS, forcer multiplier à 1 et marquer comme complétée
                if (segment === -1) {
                    throwsState[throwIndex].multiplier = 1;
                } 
                // Si BULL (25 ou 50), forcer multiplier à 1 (pas de multiplicateur)
                else if (segment === 25 || segment === 50) {
                    throwsState[throwIndex].multiplier = 1;
                }
                // Pour les autres segments, définir un multiplicateur par défaut si null
                else if (throwsState[throwIndex].multiplier === null) {
                    throwsState[throwIndex].multiplier = 1;
                }

                checkAndAdvance(throwIndex);
            });
        });

        // Événements bouton modifier
        document.querySelectorAll('.throw-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const throwIndex = parseInt(e.target.dataset.editIndex);
                if (!isNaN(throwIndex)) {
                    throwsState[throwIndex].completed = false;
                    throwsState[throwIndex].segment = null;  // Réinitialiser aussi le segment
                    throwsState[throwIndex].multiplier = 1;  // Réinitialiser le multiplicateur
                    renderThrows();
                }
            });
        });
    };

    /**
     * Vérifie si une fléchette est complète et avance si nécessaire
     */
    const checkAndAdvance = (throwIndex) => {
        const throw_ = throwsState[throwIndex];

        // Une fléchette est complète si elle a BOTH segment ET multiplier (sauf MISS)
        if (throw_.segment !== null) {
            // Si c'est MISS, pas besoin de multiplier
            if (throw_.segment === -1) {
                throw_.completed = true;
                renderThrows();
                checkForPartialFinish();
            } else {
                // Pour les autres segments, les deux sont obligatoires
                // Multiplier a une valeur par défaut (1 = Simple), donc on peut avancer directement
                throw_.completed = true;
                renderThrows();
                checkForPartialFinish();
            }
        }

        // Mise à jour des suggestions
        const match = Games.getCurrentMatch();
        if (match) {
            const currentScore = match.scores[match.currentPlayerIndex];
            const player = Games.getCurrentPlayer();
            if (player) {
                UI.updateFinishSuggestion(player.id, currentScore);
            }
        }
    };

    /**
     * Vérifie si on peut finir avec une volée partielle
     */
    const checkForPartialFinish = () => {
        const match = Games.getCurrentMatch();
        if (!match) return;

        const playerIndex = match.currentPlayerIndex;
        const currentScore = match.scores[playerIndex];

        // Collecter les fléchettes complétées
        const partialThrows = [];
        for (let i = 0; i < throwsState.length; i++) {
            if (throwsState[i].segment === null) break;

            partialThrows.push({ 
                segment: throwsState[i].segment, 
                multiplier: throwsState[i].multiplier 
            });

            // Vérifier la validation partielle
            const validation = Rules.validatePartialFinish(match.gameType, currentScore, partialThrows);

            if (validation.finished) {
                // On peut finir ici!
                document.getElementById('btnSubmitThrows').style.display = 'none';
                document.getElementById('btnSubmitPartialFinish').style.display = 'block';
                return;
            } else if (!validation.valid) {
                // La volée jusqu'à présent est invalide
                break;
            }
        }

        // Pas de finish partiel détecté
        document.getElementById('btnSubmitThrows').style.display = 'block';
        document.getElementById('btnSubmitPartialFinish').style.display = 'none';
    };

    /**
     * Récupère les fléchettes sous forme de tableau d'objets {segment, multiplier}
     * Ne retourne que les fléchettes qui ont un segment défini
     */
    const getThrows = () => {
        return throwsState
            .filter(t => t.segment !== null)
            .map(t => ({ segment: t.segment, multiplier: t.multiplier }));
    };

    /**
     * Récupère l'état complet des fléchettes
     */
    const getState = () => {
        return JSON.parse(JSON.stringify(throwsState));
    };

    return {
        init,
        resetThrows,
        renderThrows,
        getThrows,
        getState
    };
})();
