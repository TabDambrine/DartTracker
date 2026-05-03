/**
 * UI Module - Facade
 * Point d'entrée unique pour toutes les opérations UI
 * Délègue aux sous-modules (ui-core, ui-formatters, ui-renderers)
 */

const UI = (() => {
    // Références aux sous-modules
    const Core = UICore;
    const Formatters = UIFormatters;
    const Renderers = UIRenderers;

    /**
     * Obtient le nom d'un joueur (ou "Joueur supprimé" si absent)
     * @param {string} playerId - ID du joueur
     * @returns {string} - Nom du joueur
     */
    const getPlayerName = (playerId) => {
        return Renderers.getPlayerName(playerId);
    };

    /**
     * Change l'écran actif
     * @param {string} screenId - ID de l'écran à afficher
     */
    const showScreen = (screenId) => {
        Core.showScreen(screenId);
    };

    /**
     * Affiche le modal de confirmation
     * @param {string} title - Titre du modal
     * @param {string} message - Message à afficher
     * @returns {Promise<boolean>}
     */
    const showConfirmModal = (title, message) => {
        return Core.showConfirmModal(title, message);
    };

    /**
     * Affiche un modal de message
     * @param {string} title - Titre du modal
     * @param {string} message - Message à afficher
     * @returns {Promise<void>}
     */
    const showMessageModal = (title, message) => {
        return Core.showMessageModal(title, message);
    };

    /**
     * Affiche un message d'erreur
     * @param {string} message - Message d'erreur
     * @returns {Promise<void>}
     */
    const showError = (message) => {
        return Core.showError(message);
    };

    /**
     * Affiche un message de succès
     * @param {string} message - Message de succès
     * @returns {Promise<void>}
     */
    const showSuccess = (message) => {
        return Core.showSuccess(message);
    };

    /**
     * Affiche un message de volée invalide
     * @param {string} message - Message d'erreur
     */
    const showThrowError = (message) => {
        Core.showThrowError(message);
    };

    /**
     * Efface le message d'erreur de volée
     */
    const clearThrowError = () => {
        Core.clearThrowError();
    };

    /**
     * Affiche les options de validation pour une volée invalide
     * @param {string} message - Message à afficher
     * @returns {Promise<string>}
     */
    const showValidationOptions = (message) => {
        return Core.showValidationOptions(message);
    };

    /**
     * Efface le formulaire de joueur
     */
    const clearPlayerForm = () => {
        Core.clearPlayerForm();
    };

    /**
     * Met à jour le formulaire de volée
     * @param {boolean} showFinishButtons - Si vrai, affiche les boutons de finish
     */
    const updateThrowsForm = (showFinishButtons = false) => {
        Core.updateThrowsForm(showFinishButtons);
    };

    /**
     * Obtient les fléchettes du formulaire
     * @returns {Array}
     */
    const getThrowsFromForm = () => {
        return Core.getThrowsFromForm();
    };

    /**
     * Met à jour la liste des joueurs
     */
    const renderPlayersList = () => {
        const playersData = Formatters.formatPlayersList();
        Renderers.renderPlayersList(playersData);
        
        // Ajouter les listeners de suppression (logique métier)
        const container = document.getElementById('playersList');
        if (container) {
            container.querySelectorAll('[data-delete]').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const playerId = e.target.dataset.delete;
                    const player = Players.getById(playerId);
                    const confirmed = await showConfirmModal(
                        'Supprimer joueur',
                        `Êtes-vous sûr de vouloir supprimer ${player.name} ?`
                    );

                    if (confirmed) {
                        try {
                            Players.remove(playerId);
                            renderPlayersList();
                            renderSelectPlayerOptions();
                        } catch (err) {
                            showError(err.message);
                        }
                    }
                });
            });
        }
    };

    /**
     * Met à jour les options de sélection de joueurs
     */
    const renderSelectPlayerOptions = () => {
        const players = Formatters.formatPlayerOptions();
        Renderers.renderSelectPlayerOptions(players);
    };

    /**
     * Mets à jour le tableau de scores
     */
    const updateScoresBoard = () => {
        const scoresData = Formatters.formatScoresBoard();
        Renderers.updateScoresBoard(scoresData);
    };

    /**
     * Met à jour l'historique des volées
     */
    const updateThrowsHistory = () => {
        const throwsHistory = Formatters.formatThrowsHistory();
        Renderers.updateThrowsHistory(throwsHistory);
    };

    /**
     * Rend la liste des matchs
     */
    const renderMatchesList = () => {
        const matchesData = Formatters.formatMatchesList();
        Renderers.renderMatchesList(matchesData);
        
        // Ajouter les listeners pour voir les détails
        const container = document.getElementById('matchesList');
        if (container) {
            container.querySelectorAll('[data-view]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const matchId = btn.dataset.view;
                    App.showMatchDetail(matchId);
                });
            });
        }
    };

    /**
     * Rend le détail d'un match
     * @param {string} matchId - ID du match
     */
    const renderMatchDetail = (matchId) => {
        const matchDetail = Formatters.formatMatchDetail(matchId);
        Renderers.renderMatchDetail(matchDetail);
    };

    /**
     * Initialise la page des statistiques
     */
    const initStatsPage = () => {
        // Initialiser le sélecteur de joueurs
        const players = Formatters.formatPlayerOptions();
        Renderers.renderStatsPlayerSelect(players);
        
        // Ajouter l'événement pour le changement de joueur
        const selectElement = document.getElementById('playerStatsSelect');
        if (selectElement) {
            selectElement.addEventListener('change', () => {
                renderStats(selectElement.value);
            });
        }
        
        // Ajouter les événements des onglets
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Retirer la classe active de tous les boutons
                tabBtns.forEach(b => b.classList.remove('active'));
                // Ajouter la classe active au bouton cliqué
                btn.classList.add('active');
                // Re-rendre les stats avec le bon type
                const selectElement = document.getElementById('playerStatsSelect');
                if (selectElement && selectElement.value) {
                    const activeTab = btn.getAttribute('data-tab');
                    if (activeTab === 'training') {
                        const statsData = Formatters.formatTrainingStats(selectElement.value);
                        Renderers.renderTrainingStats(statsData);
                    } else {
                        const statsData = Formatters.formatStats(selectElement.value);
                        Renderers.renderStats(statsData);
                    }
                }
            });
        });
        
        // Ajouter les événements des boutons de type de jeu
        const gameTypeBtns = document.querySelectorAll('.game-type-buttons .btn-game-type');
        gameTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Retirer la classe active de tous les boutons
                gameTypeBtns.forEach(b => b.classList.remove('active'));
                // Ajouter la classe active au bouton cliqué
                btn.classList.add('active');
                // Re-rendre les stats avec le bon type de jeu
                const selectElement = document.getElementById('playerStatsSelect');
                if (selectElement && selectElement.value) {
                    const activeTab = document.querySelector('.tab-btn.active');
                    const tabType = activeTab ? activeTab.getAttribute('data-tab') : 'competition';
                    if (tabType === 'training') {
                        const statsData = Formatters.formatTrainingStats(selectElement.value);
                        Renderers.renderTrainingStats(statsData);
                    } else {
                        const statsData = Formatters.formatStats(selectElement.value);
                        Renderers.renderStats(statsData);
                    }
                }
            });
        });
        
        // Afficher les stats du premier joueur par défaut
        if (players.length > 0) {
            renderStats(players[0].id);
        } else {
            Renderers.renderStats(null);
        }
    };

    /**
     * Rend les statistiques
     * @param {string} playerId - ID du joueur (optionnel)
     */
    const renderStats = (playerId = null) => {
        const players = Players.getAll();
        const targetPlayerId = playerId || (players.length > 0 ? players[0].id : null);
        
        if (!targetPlayerId) {
            Renderers.renderStats(null);
            return;
        }
        
        // Vérifier quel onglet est actif
        const activeTab = document.querySelector('.tab-btn.active');
        const tabType = activeTab ? activeTab.getAttribute('data-tab') : 'competition';
        
        if (tabType === 'training') {
            const statsData = Formatters.formatTrainingStats(targetPlayerId);
            Renderers.renderTrainingStats(statsData);
        } else {
            const statsData = Formatters.formatStats(targetPlayerId);
            Renderers.renderStats(statsData);
        }
    };

    /**
     * Affiche la suggestion de finish
     * @param {number} currentScore - Score actuel
     * @param {string} playerId - ID du joueur
     */
    const showFinishSuggestion = (currentScore, playerId) => {
        const suggestion = Formatters.formatFinishSuggestion(currentScore, playerId);
        Renderers.showFinishSuggestion(suggestion);
    };

    return {
        // Core functions
        getPlayerName,
        showScreen,
        showConfirmModal,
        showMessageModal,
        showError,
        showSuccess,
        showThrowError,
        clearThrowError,
        showValidationOptions,
        clearPlayerForm,
        updateThrowsForm,
        getThrowsFromForm,
        initStatsPage,
        
        // Render functions
        renderPlayersList,
        renderSelectPlayerOptions,
        updateScoresBoard,
        updateThrowsHistory,
        renderMatchesList,
        renderMatchDetail,
        renderStats,
        showFinishSuggestion
    };
})();
