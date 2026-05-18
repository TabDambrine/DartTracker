/**
 * App Module
 * Orchestration et gestion des events.
 */

const App = (() => {
    let selectedGameType = '501';

    const init = () => {
        UI.renderPlayersList();
        UI.renderSelectPlayerOptions();

        attachHomeScreenEvents();
        attachPlayersScreenEvents();
        attachSelectPlayersScreenEvents();
        attachGameScreenEvents();
        attachMatchesScreenEvents();
        attachStatsScreenEvents();

        const btnBackFromMatchDetail = document.getElementById('btnBackFromMatchDetail');
        if (btnBackFromMatchDetail) {
            btnBackFromMatchDetail.addEventListener('click', () => {
                UI.renderMatchesList();
                UI.showScreen('matchesScreen');
            });
        }

        console.log('Dart Stats Tracker initialise');
    };

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

        const btnExport = document.getElementById('btnExportData');
        if (btnExport) {
            btnExport.addEventListener('click', handleExportData);
        }

        const btnImport = document.getElementById('btnImportData');
        if (btnImport) {
            btnImport.addEventListener('click', handleImportData);
        }
    };

    const handleExportData = async () => {
        try {
            const result = ExportImport.exportToFile();
            if (result.success) {
                UI.showSuccess('Donnees exportees avec succes!');
            } else {
                UI.showError(result.message);
            }
        } catch (err) {
            UI.showError(`Erreur: ${err.message}`);
        }
    };

    const handleImportData = async () => {
        try {
            const confirmed = await UI.showConfirmModal(
                'Importer des donnees',
                'Etes-vous sur de vouloir importer des donnees? Cela ecrasera vos donnees actuelles (joueurs et matchs).'
            );

            if (!confirmed) return;

            const result = await ExportImport.openImportDialog();

            if (result.success) {
                UI.renderPlayersList();
                UI.renderSelectPlayerOptions();
                UI.renderMatchesList();
                UI.renderStats();
                UI.showSuccess(result.message);
            } else {
                UI.showError(result.message);
            }
        } catch (err) {
            UI.showError(`Erreur: ${err.message}`);
        }
    };

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

    const attachSelectPlayersScreenEvents = () => {
        const roundLimitInput = document.getElementById('roundLimitInput');
        const ghostModeCheckbox = document.getElementById('ghostModeCheckbox');
        const player2GhostCheckbox = document.getElementById('player2GhostCheckbox');

        if (ghostModeCheckbox && player2GhostCheckbox) {
            ghostModeCheckbox.addEventListener('change', () => {
                player2GhostCheckbox.checked = ghostModeCheckbox.checked;
            });

            player2GhostCheckbox.addEventListener('change', () => {
                ghostModeCheckbox.checked = player2GhostCheckbox.checked;
            });
        }

        document.querySelectorAll('.btn-game-type').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-game-type').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedGameType = e.target.dataset.game;

                if (!roundLimitInput.value) {
                    roundLimitInput.placeholder = selectedGameType === '501' ? 'Ex: 15' : 'Ex: 10';
                }
            });
        });

        document.getElementById('btnStartMatch').addEventListener('click', () => {
            const participants = collectMatchParticipants();

            if (participants.error) {
                UI.showError(participants.error);
                return;
            }

            let roundLimit = null;
            if (roundLimitInput.value.trim()) {
                roundLimit = parseInt(roundLimitInput.value);
                if (isNaN(roundLimit) || roundLimit <= 0) {
                    UI.showError('La limite de tours doit etre un nombre positif');
                    return;
                }
            }

            const match = Games.createMatch(null, null, selectedGameType, roundLimit, {
                participants: participants.players
            });
            startGame(match);
        });

        document.getElementById('btnBackFromSelect').addEventListener('click', () => {
            UI.showScreen('homeScreen');
        });
    };

    const collectMatchParticipants = () => {
        const players = [];

        for (let index = 0; index < 4; index++) {
            const select = document.getElementById(`player${index + 1}Select`);
            const ghostCheckbox = document.getElementById(`player${index + 1}GhostCheckbox`);
            const playerId = select?.value || '';
            const isGhost = ghostCheckbox?.checked === true;

            if (!playerId) {
                if (index < 2) {
                    return { error: `Veuillez selectionner le Joueur ${index + 1}` };
                }
                if (isGhost) {
                    return { error: `Veuillez selectionner un profil pour le Ghost du Joueur ${index + 1}` };
                }
                continue;
            }

            players.push({ playerId, isGhost });
        }

        if (players.length < 2) {
            return { error: 'Veuillez selectionner au moins 2 joueurs' };
        }

        const humanIds = players.filter(p => !p.isGhost).map(p => p.playerId);
        const uniqueHumanIds = new Set(humanIds);
        const isLegacySelfPlay = players.length === 2 && humanIds.length === 2 && uniqueHumanIds.size === 1;

        if (!isLegacySelfPlay && uniqueHumanIds.size !== humanIds.length) {
            return { error: 'Un meme joueur humain ne peut pas occuper plusieurs places dans un match multi-joueurs' };
        }

        return { players };
    };

    const startGame = (match) => {
        const gameTitle = `${match.gameType} - ${match.playerIds.length} joueurs`;
        document.getElementById('gameTitle').textContent = gameTitle;

        UI.updateScoresBoard();
        UI.setThrowsFormEnabled(true);
        UI.updateThrowsForm();
        UI.updateThrowsHistory();
        UI.showScreen('gameScreen');
        playGhostTurnIfNeeded();
    };

    const attachGameScreenEvents = () => {
        document.getElementById('btnSubmitThrows').addEventListener('click', submitThrows);
        document.getElementById('btnSubmitPartialFinish').addEventListener('click', submitPartialFinish);

        document.getElementById('btnAbortMatch').addEventListener('click', async () => {
            const confirmed = await UI.showConfirmModal(
                'Abandonner le match',
                'Etes-vous sur ? Le match ne sera pas sauvegarde.'
            );

            if (confirmed) {
                Games.clearCurrentMatch();
                UI.showScreen('homeScreen');
            }
        });
    };

    const finishMatchAndReturnHome = async (result) => {
        if (result.isDNF) {
            await UI.showMessageModal(
                'Limite de Tours Atteinte',
                'Match non termine (DNF - Did Not Finish)'
            );
        } else {
            const winnerName = result.winner?.name || UI.getPlayerName(Games.getCurrentMatch()?.winner);
            await UI.showMessageModal(
                'Match Termine!',
                `${winnerName} a remporte le match!`
            );
        }

        Games.clearCurrentMatch();
        UI.showScreen('homeScreen');
    };

    const playGhostTurnIfNeeded = async () => {
        const match = Games.getCurrentMatch();
        if (!match || !Games.isGhostId(match.playerIds[match.currentPlayerIndex])) {
            return false;
        }

        while (Games.getCurrentMatch() && Games.isGhostId(Games.getCurrentMatch().playerIds[Games.getCurrentMatch().currentPlayerIndex])) {
            const currentMatch = Games.getCurrentMatch();
            const ghostName = Games.getGhostDisplayName(currentMatch, currentMatch.currentPlayerIndex);
            UI.setThrowsFormEnabled(false, `${ghostName} joue sa volee...`);

            await new Promise(resolve => setTimeout(resolve, 450));

            const result = Ghost.playTurn(currentMatch);
            UI.updateScoresBoard();
            UI.updateThrowsHistory();

            if (result.finished) {
                await finishMatchAndReturnHome(result);
                return true;
            }
        }

        UI.setThrowsFormEnabled(true);
        UI.updateThrowsForm();
        return true;
    };

    const submitThrows = async () => {
        try {
            const throws = UI.getThrowsFromForm();
            const result = Games.addThrow(throws);

            if (!result.success) {
                const choice = await UI.showValidationOptions(
                    `${result.reason}\n\nValider quand meme comme erreur du joueur ?`
                );

                if (choice === 'valid') {
                    const errorResult = Games.addInvalidThrow(throws, result.reason);
                    UI.updateScoresBoard();
                    UI.updateThrowsHistory();

                    if (errorResult.finished) {
                        await finishMatchAndReturnHome(errorResult);
                    } else {
                        const ghostPlayed = await playGhostTurnIfNeeded();
                        if (!ghostPlayed) {
                            UI.updateThrowsForm();
                        }
                    }
                } else {
                    UI.showThrowError('Veuillez corriger la volee');
                }
                return;
            }

            UI.updateScoresBoard();
            UI.updateThrowsHistory();

            if (result.finished) {
                await finishMatchAndReturnHome(result);
            } else {
                const ghostPlayed = await playGhostTurnIfNeeded();
                if (!ghostPlayed) {
                    UI.updateThrowsForm();
                }
            }
        } catch (err) {
            UI.showThrowError(err.message);
        }
    };

    const submitPartialFinish = async () => {
        try {
            const match = Games.getCurrentMatch();
            if (!match) return;

            const playerIndex = match.currentPlayerIndex;
            const currentScore = match.scores[playerIndex];
            const throwsState = ThrowsInput.getState();
            const partialThrows = [];

            for (let i = 0; i < throwsState.length; i++) {
                const throw_ = throwsState[i];
                if (throw_.segment === null) break;

                partialThrows.push({ segment: throw_.segment, multiplier: throw_.multiplier });

                const validation = Rules.validatePartialFinish(match.gameType, currentScore, partialThrows);

                if (validation.finished) {
                    const result = Games.addThrow(partialThrows);

                    if (!result.success) {
                        UI.showThrowError(`Erreur: ${result.reason}`);
                        return;
                    }

                    UI.updateScoresBoard();
                    UI.updateThrowsHistory();

                    if (result.finished) {
                        await finishMatchAndReturnHome(result);
                    }
                    return;
                }

                if (!validation.valid) {
                    UI.showThrowError('Erreur: volee invalide');
                    return;
                }
            }

            UI.showThrowError('Erreur: impossible de terminer le match');
        } catch (err) {
            UI.showThrowError(err.message);
        }
    };

    const attachMatchesScreenEvents = () => {
        document.getElementById('btnBackFromMatches').addEventListener('click', () => {
            UI.showScreen('homeScreen');
        });
    };

    const attachStatsScreenEvents = () => {
        document.getElementById('btnBackFromStats').addEventListener('click', () => {
            UI.showScreen('homeScreen');
        });

        const btnRecalculate = document.getElementById('btnRecalculateStats');
        if (btnRecalculate) {
            btnRecalculate.addEventListener('click', () => {
                recalculateAllStats();
            });
        }
    };

    const recalculateAllStats = async () => {
        const confirmed = await UI.showConfirmModal(
            'Recalculer les stats',
            'Etes-vous sur ? Cette operation recalculera les statistiques de tous les joueurs selon leurs matchs.'
        );

        if (!confirmed) return;

        try {
            const count = Stats.recalculateAllStats();
            UI.showSuccess(`Statistiques recalculees pour ${count} joueur(s)`);
            UI.renderStats();
        } catch (err) {
            UI.showError(`Erreur: ${err.message}`);
        }
    };

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

document.addEventListener('DOMContentLoaded', App.init);
