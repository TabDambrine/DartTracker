/**
 * App Module
 * Orchestration et gestion des events
 */

const App = (() => {
    let selectedGameType = '501';

    const init = () => {
        // Initialiser l'UI
        UI.renderPlayersList();
        UI.renderSelectPlayerOptions();

        // Attacher les events du menu principal
        attachHomeScreenEvents();

        // Attacher les events des autres écrans
        attachPlayersScreenEvents();
        attachSelectPlayersScreenEvents();
        attachGameScreenEvents();
        attachMatchesScreenEvents();
        attachStatsScreenEvents();

        // Attacher l'event du bouton retour detail match
        const btnBackFromMatchDetail = document.getElementById('btnBackFromMatchDetail');
        if (btnBackFromMatchDetail) {
            btnBackFromMatchDetail.addEventListener('click', () => {
                UI.renderMatchesList();
                UI.showScreen('matchesScreen');
            });
        }

        console.log('Dart Stats Tracker initialisé');
    };

    /**
     * Events écran d'accueil
     */
    const attachHomeScreenEvents = () => {
        document.getElementById('btnNewMatch').addEventListener('click', () => {
            UI.showScreen('selectPlayersScreen');
            UI.renderSelectPlayerOptions();
        });

        document.getElementById('btnViewMatches').addEventListener('click', () => {
            UI.renderMatchesList();
            UI.showScreen('matchesScreen');
        });

        document.getElementById('btnManagePlayers').addEventListener('click', () => {
            UI.renderPlayersList();
            UI.showScreen('playersScreen');
        });

        document.getElementById('btnStats').addEventListener('click', () => {
            UI.renderStats();
            UI.showScreen('statsScreen');
        });
    };

    /**
     * Events écran gestion joueurs
     */
    const attachPlayersScreenEvents = () => {
        const btnAdd = document.getElementById('btnAddPlayer');
        const input = document.getElementById('playerNameInput');

        const addPlayer = () => {
            const name = input.value;
            if (!name.trim()) {
                UI.showError('Veuillez entrer un nom');
                return;
            }

            try {
                Players.create(name);
                UI.clearPlayerForm();
                UI.renderPlayersList();
                UI.renderSelectPlayerOptions();
            } catch (err) {
                UI.showError(err.message);
            }
        };

        btnAdd.addEventListener('click', addPlayer);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPlayer();
        });

        document.getElementById('btnBackFromPlayers').addEventListener('click', () => {
            UI.showScreen('homeScreen');
        });
    };

    /**
     * Events écran sélection joueurs
     */
    const attachSelectPlayersScreenEvents = () => {
        const roundLimitInput = document.getElementById('roundLimitInput');

        // Sélection du type de jeu
        document.querySelectorAll('.btn-game-type').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-game-type').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedGameType = e.target.dataset.game;

                // Définir la limite par défaut selon le type de jeu
                if (!roundLimitInput.value) {
                    roundLimitInput.placeholder = selectedGameType === '501' ? 'Ex: 15' : 'Ex: 10';
                }
            });
        });

        // Démarrer le match
        document.getElementById('btnStartMatch').addEventListener('click', () => {
            const player1Id = document.getElementById('player1Select').value;
            const player2Id = document.getElementById('player2Select').value;

            if (!player1Id) {
                UI.showError('Veuillez sélectionner le Joueur 1');
                return;
            }

            if (!player2Id) {
                UI.showError('Veuillez sélectionner le Joueur 2');
                return;
            }

            // Récupérer la limite de tours (null si vide, sinon entier positif)
            let roundLimit = null;
            if (roundLimitInput.value.trim()) {
                roundLimit = parseInt(roundLimitInput.value);
                if (isNaN(roundLimit) || roundLimit <= 0) {
                    UI.showError('La limite de tours doit être un nombre positif');
                    return;
                }
            }

            // Créer le match avec tous les paramètres
            const match = Games.createMatch(player1Id, player2Id, selectedGameType, roundLimit);
            startGame(match);
        });

        document.getElementById('btnBackFromSelect').addEventListener('click', () => {
            UI.showScreen('homeScreen');
        });
    };

    /**
     * Démarre un nouveau jeu
     */
    const startGame = (match) => {
        const gameTitle = `${match.gameType} - ${Games.getCurrentPlayer().name}`;
        document.getElementById('gameTitle').textContent = gameTitle;

        UI.updateScoresBoard();
        UI.updateThrowsForm();
        UI.updateThrowsHistory();
        UI.showScreen('gameScreen');
    };

    /**
     * Events écran de jeu
     */
    const attachGameScreenEvents = () => {
        // Soumission normale (3 fléchettes)
        document.getElementById('btnSubmitThrows').addEventListener('click', submitThrows);

        // Soumission du finish partiel
        document.getElementById('btnSubmitPartialFinish').addEventListener('click', submitPartialFinish);

        document.getElementById('btnAbortMatch').addEventListener('click', async () => {
            const confirmed = await UI.showConfirmModal(
                'Abandonner le match',
                'Êtes-vous sûr ? Le match ne sera pas sauvegardé.'
            );

            if (confirmed) {
                Games.clearCurrentMatch();
                UI.showScreen('homeScreen');
            }
        });

        // Les événements des sélecteurs de fléchettes sont maintenant gérés dans ThrowsInput
        // Aucune autre gestion nécessaire ici
    };

    /**
     * Soumet une volée
     */
    const submitThrows = async () => {
        try {
            const throws = UI.getThrowsFromForm();

            const result = Games.addThrow(throws);

            if (!result.success) {
                // La volée est invalide - proposer à l'utilisateur
                const choice = await UI.showValidationOptions(
                    `⚠️ ${result.reason}\n\nValider quand même comme erreur du joueur ?`
                );

                if (choice === 'valid') {
                    // Cliquez sur "Valider quand même" → enregistrer comme erreur
                    const errorResult = Games.addInvalidThrow(throws, result.reason);
                    UI.updateScoresBoard();
                    UI.updateThrowsHistory();

                    // Vérifier si on a déclenché un DNF par cette volée invalide
                    const currentMatch = Games.getCurrentMatch();
                    if (currentMatch && currentMatch.isDNF) {
                        // DNF déclenché
                        await UI.showMessageModal(
                            '⏱️ Limite de Tours Atteinte',
                            'Match non terminé (DNF - Did Not Finish)'
                        );
                        Games.clearCurrentMatch();
                        UI.showScreen('homeScreen');
                    } else {
                        UI.updateThrowsForm();
                    }
                } else {
                    // Cliquez sur "Corriger" → abandonner et laisser corriger
                    UI.showThrowError('Veuillez corriger la volée');
                }
                return;
            }

            UI.updateScoresBoard();
            UI.updateThrowsHistory();

            if (result.finished) {
                if (result.isDNF) {
                    // Match DNF
                    await UI.showMessageModal(
                        '⏱️ Limite de Tours Atteinte',
                        'Match non terminé (DNF - Did Not Finish)'
                    );
                } else {
                    // Match normal terminé
                    const winner = result.winner;
                    await UI.showMessageModal(
                        '🎉 Match Terminé!',
                        `${winner.name} a remporté le match!`
                    );
                }
                Games.clearCurrentMatch();
                UI.showScreen('homeScreen');
            } else {
                UI.updateThrowsForm();
            }
        } catch (err) {
            UI.showThrowError(err.message);
        }
    };

    /**
     * Soumet une volée partielle qui termine le match
     */
    const submitPartialFinish = async () => {
        try {
            const match = Games.getCurrentMatch();
            if (!match) return;

            const playerIndex = match.currentPlayerIndex;
            const currentScore = match.scores[playerIndex];

            // Collecter les fléchettes jusqu'à trouver le finish (utilise ThrowsInput)
            const throwsState = ThrowsInput.getState();
            const partialThrows = [];

            for (let i = 0; i < throwsState.length; i++) {
                const throw_ = throwsState[i];
                if (throw_.segment === null) break;

                partialThrows.push({ segment: throw_.segment, multiplier: throw_.multiplier });

                // Vérifier la validation partielle
                const validation = Rules.validatePartialFinish(match.gameType, currentScore, partialThrows);

                if (validation.finished) {
                    // On a trouvé le finish - utiliser seulement ces fléchettes
                    const result = Games.addThrow(partialThrows);

                    if (!result.success) {
                        UI.showThrowError(`Erreur: ${result.reason}`);
                        return;
                    }

                    UI.updateScoresBoard();
                    UI.updateThrowsHistory();

                    if (result.finished) {
                        const winner = result.winner;
                        await UI.showMessageModal(
                            '🎉 Match Terminé!',
                            `${winner.name} a remporté le match!`
                        );
                        Games.clearCurrentMatch();
                        UI.showScreen('homeScreen');
                    }
                    return;
                } else if (!validation.valid) {
                    // Les fléchettes jusqu'ici ne sont pas valides
                    UI.showThrowError('Erreur: volée invalide');
                    return;
                }
            }

            UI.showThrowError('Erreur: impossible de terminer le match');
        } catch (err) {
            UI.showThrowError(err.message);
        }
    };

    /**
     * Events écran historique
     */
    const attachMatchesScreenEvents = () => {
        document.getElementById('btnBackFromMatches').addEventListener('click', () => {
            UI.showScreen('homeScreen');
        });
    };

    /**
     * Events écran statistiques
     */
    const attachStatsScreenEvents = () => {
        document.getElementById('btnBackFromStats').addEventListener('click', () => {
            UI.showScreen('homeScreen');
        });
    };

    /**
     * Affiche le détail d'un match
     */
    const showMatchDetail = (matchId) => {
        UI.renderMatchDetail(matchId);
        UI.showScreen('matchDetailScreen');
    };

    return {
        init,
        startGame,
        showMatchDetail
    };
})();

// Initialiser l'app au chargement du DOM
document.addEventListener('DOMContentLoaded', App.init);
