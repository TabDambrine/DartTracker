/**
 * Constants Module
 * Centralise toutes les constantes de l'application pour éviter les strings magiques
 */

const Constants = (() => {
    /**
     * Types de jeu disponibles
     */
    const GAME_TYPES = {
        D301: '301',
        D501: '501'
    };

    /**
     * Scores initiaux par type de jeu
     */
    const GAME_START_SCORES = {
        [GAME_TYPES.D301]: 301,
        [GAME_TYPES.D501]: 501
    };

    /**
     * Noms des écrans de l'application
     */
    const SCREENS = {
        HOME: 'homeScreen',
        PLAYERS: 'playersScreen',
        SELECT_PLAYERS: 'selectPlayersScreen',
        GAME: 'gameScreen',
        MATCHES: 'matchesScreen',
        STATS: 'statsScreen',
        MATCH_DETAIL: 'matchDetailScreen'
    };

    /**
     * Sélecteurs DOM - Boutons principaux
     */
    const BUTTON_SELECTORS = {
        // Home screen
        NEW_MATCH: 'btnNewMatch',
        VIEW_MATCHES: 'btnViewMatches',
        MANAGE_PLAYERS: 'btnManagePlayers',
        STATS: 'btnStats',
        EXPORT_DATA: 'btnExportData',
        IMPORT_DATA: 'btnImportData',
        
        // Players screen
        ADD_PLAYER: 'btnAddPlayer',
        BACK_FROM_PLAYERS: 'btnBackFromPlayers',
        
        // Select players screen
        START_MATCH: 'btnStartMatch',
        BACK_FROM_SELECT: 'btnBackFromSelect',
        
        // Game screen
        SUBMIT_THROWS: 'btnSubmitThrows',
        SUBMIT_PARTIAL_FINISH: 'btnSubmitPartialFinish',
        ABORT_MATCH: 'btnAbortMatch',
        
        // Matches screen
        BACK_FROM_MATCHES: 'btnBackFromMatches',
        BACK_FROM_MATCH_DETAIL: 'btnBackFromMatchDetail',
        
        // Stats screen
        BACK_FROM_STATS: 'btnBackFromStats',
        RECALCULATE_STATS: 'btnRecalculateStats'
    };

    /**
     * Sélecteurs DOM - Formulaires et inputs
     */
    const FORM_SELECTORS = {
        PLAYER_NAME_INPUT: 'playerNameInput',
        PLAYER1_SELECT: 'player1Select',
        PLAYER2_SELECT: 'player2Select',
        ROUND_LIMIT_INPUT: 'roundLimitInput',
        PLAYERS_LIST: 'playersList',
        MATCHES_LIST: 'matchesList',
        GAME_TITLE: 'gameTitle',
        THROWS_FORM: 'throwsForm',
        THROWS_HISTORY: 'throwsHistory',
        SCORES_BOARD: 'scoresBoard'
    };

    /**
     * Sélecteurs DOM - Conteneurs
     */
    const CONTAINER_SELECTORS = {
        PLAYERS_CONTAINER: 'playersContainer',
        STATS_CONTAINER: 'statsContainer',
        MATCH_DETAIL_CONTAINER: 'matchDetailContainer',
        SUGGESTION_CONTAINER: 'finishSuggestion'
    };

    /**
     * Classes CSS
     */
    const CSS_CLASSES = {
        ACTIVE: 'active',
        HIDDEN: 'hidden',
        ERROR: 'error',
        SUCCESS: 'success',
        PREFERRED_DOUBLE_BADGE: 'preferred-double-badge',
        DOUBLE_STATS: 'double-stats',
        BTN_GAME_TYPE: 'btn-game-type'
    };

    /**
     * Messages d'erreur et de succès
     */
    const MESSAGES = {
        ERROR: {
            PLAYER_NAME_REQUIRED: 'Veuillez entrer un nom',
            PLAYER_NAME_TOO_LONG: 'Le nom ne doit pas dépasser 50 caractères',
            PLAYER_ALREADY_EXISTS: 'Un joueur avec ce nom existe déjà',
            SELECT_PLAYER_1: 'Veuillez sélectionner le Joueur 1',
            SELECT_PLAYER_2: 'Veuillez sélectionner le Joueur 2',
            INVALID_ROUND_LIMIT: 'La limite de tours doit être un nombre positif',
            INVALID_THROW: 'Volée invalide',
            CORRECT_THROW: 'Veuillez corriger la volée',
            IMPOSSIBLE_FINISH: 'Erreur: impossible de terminer le match'
        },
        SUCCESS: {
            PLAYER_CREATED: 'Joueur créé avec succès',
            DATA_EXPORTED: 'Données exportées avec succès!',
            DATA_IMPORTED: 'Données importées avec succès',
            STATS_RECALCULATED: (count) => `Statistiques recalculées pour ${count} joueur(s)`
        },
        CONFIRMATION: {
            ABANDON_MATCH: {
                title: 'Abandonner le match',
                message: 'Êtes-vous sûr ? Le match ne sera pas sauvegardé.'
            },
            IMPORT_DATA: {
                title: 'Importer des données',
                message: 'Êtes-vous sûr de vouloir importer des données? Cela écrasera vos données actuelles (joueurs et matchs).'
            },
            RECALCULATE_STATS: {
                title: 'Recalculer les stats',
                message: 'Êtes-vous sûr ? Cette opération recalculera les statistiques de tous les joueurs selon leurs matchs.'
            }
        },
        INFO: {
            DNF_REACHED: '⏱️ Limite de Tours Atteinte',
            DNF_MESSAGE: 'Match non terminé (DNF - Did Not Finish)',
            MATCH_WON: (winnerName) => `🎉 Match Terminé!\n${winnerName} a remporté le match!`
        }
    };

    /**
     * Limites par défaut pour les types de jeu
     */
    const DEFAULT_ROUND_LIMITS = {
        [GAME_TYPES.D301]: 10,
        [GAME_TYPES.D501]: 15
    };

    /**
     * Multiplicateurs de fléchettes
     */
    const DART_MULTIPLIERS = {
        SINGLE: 1,
        DOUBLE: 2,
        TRIPLE: 3
    };

    /**
     * Segments spéciaux du dartboard
     */
    const SPECIAL_SEGMENTS = {
        BULL: 0,
        BULL_25: 25
    };

    /**
     * Points des segments spéciaux
     */
    const SPECIAL_SEGMENT_POINTS = {
        [SPECIAL_SEGMENTS.BULL]: 50,
        [SPECIAL_SEGMENTS.BULL_25]: 25
    };

    return {
        GAME_TYPES,
        GAME_START_SCORES,
        SCREENS,
        BUTTON_SELECTORS,
        FORM_SELECTORS,
        CONTAINER_SELECTORS,
        CSS_CLASSES,
        MESSAGES,
        DEFAULT_ROUND_LIMITS,
        DART_MULTIPLIERS,
        SPECIAL_SEGMENTS,
        SPECIAL_SEGMENT_POINTS
    };
})();
