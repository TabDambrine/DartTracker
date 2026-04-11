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
                UI.showSuccess(`${name} a été ajouté`);
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
        // Sélection du type de jeu
        document.querySelectorAll('.btn-game-type').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-game-type').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedGameType = e.target.dataset.game;
            });
        });

        // Démarrer le match
        document.getElementById('btnStartMatch').addEventListener('click', () => {
            const player1Id = document.getElementById('player1Select').value;
            const player2Id = document.getElementById('player2Select').value;

            if (!player1Id || !player2Id) {
                UI.showError('Veuillez sélectionner 2 joueurs');
                return;
            }

            if (player1Id === player2Id) {
                UI.showError('Veuillez sélectionner 2 joueurs différents');
                return;
            }

            // Créer le match
            const match = Games.createMatch(player1Id, player2Id, selectedGameType);
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
        document.getElementById('btnSubmitThrows').addEventListener('click', submitThrows);

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

        // Navigation au clavier pour les inputs
        document.querySelectorAll('.throw-input').forEach((input, index) => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (index < 2) {
                        document.querySelectorAll('.throw-input')[index + 1].focus();
                    } else {
                        submitThrows();
                    }
                }
            });
        });
    };

    /**
     * Soumet une volée
     */
    const submitThrows = async () => {
        const inputs = document.querySelectorAll('.throw-input');
        const scores = Array.from(inputs).map(input => {
            const value = parseInt(input.value) || 0;
            return value;
        });

        try {
            const result = Games.addThrow(scores);

            if (!result.success) {
                UI.showThrowError(result.reason);
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
            } else {
                UI.updateThrowsForm();
            }
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

    // Attacher l'event du bouton retour detail
    document.getElementById('btnBackFromMatchDetail').addEventListener('click', () => {
        UI.renderMatchesList();
        UI.showScreen('matchesScreen');
    });

    return {
        init,
        startGame,
        showMatchDetail
    };
})();

// Initialiser l'app au chargement du DOM
document.addEventListener('DOMContentLoaded', App.init);
