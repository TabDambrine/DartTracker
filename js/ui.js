/**
 * UI Module
 * Gère l'interface utilisateur
 */

const UI = (() => {
    /**
     * Obtient le nom d'un joueur (ou "Joueur supprimé" si absent)
     */
    const getPlayerName = (playerId) => {
        if (playerId === 'deleted_player') {
            return 'Joueur supprimé';
        }
        const player = Players.getById(playerId);
        return player ? player.name : 'Joueur supprimé';
    };

    /**
     * Change l'écran actif
     */
    const showScreen = (screenId) => {
        // Masquer tous les écrans
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Afficher l'écran demandé
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        }
    };

    /**
     * Affiche le modal de confirmation
     */
    const showConfirmModal = (title, message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;

            const handleYes = () => {
                cleanup();
                resolve(true);
            };

            const handleNo = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                modal.style.display = 'none';
                document.getElementById('btnConfirmYes').removeEventListener('click', handleYes);
                document.getElementById('btnConfirmNo').removeEventListener('click', handleNo);
            };

            document.getElementById('btnConfirmYes').addEventListener('click', handleYes);
            document.getElementById('btnConfirmNo').addEventListener('click', handleNo);

            modal.style.display = 'flex';
        });
    };

    /**
     * Affiche un modal de message
     */
    const showMessageModal = (title, message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('messageModal');
            document.getElementById('messageTitle').textContent = title;
            document.getElementById('messageContent').textContent = message;

            const handleClose = () => {
                cleanup();
                resolve();
            };

            const cleanup = () => {
                modal.style.display = 'none';
                document.getElementById('btnMessageClose').removeEventListener('click', handleClose);
            };

            document.getElementById('btnMessageClose').addEventListener('click', handleClose);
            modal.style.display = 'flex';
        });
    };

    /**
     * Affiche un message d'erreur
     */
    const showError = (message) => {
        return showMessageModal('Erreur', message);
    };

    /**
     * Affiche un message de succès
     */
    const showSuccess = (message) => {
        return showMessageModal('Succès', message);
    };

    /**
     * Efface le formulaire de joueur
     */
    const clearPlayerForm = () => {
        document.getElementById('playerNameInput').value = '';
    };

    /**
     * Met à jour la liste des joueurs
     */
    const renderPlayersList = () => {
        const container = document.getElementById('playersList');
        const players = Players.getAll();

        if (players.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun joueur pour le moment</p>';
            return;
        }

        container.innerHTML = players.map(player => `
            <div class="player-item">
                <div class="player-info">
                    <h4>${player.name}</h4>
                    <small>${player.stats.totalMatches} matchs - ${player.stats.wins} victoires</small>
                </div>
                <button class="btn btn-danger btn-small" data-delete="${player.id}">Supprimer</button>
            </div>
        `).join('');

        // Ajouter les listeners de suppression
        container.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const playerId = e.target.dataset.delete;
                const player = Players.getById(playerId);
                const confirmed = await UI.showConfirmModal(
                    'Supprimer joueur',
                    `Êtes-vous sûr de vouloir supprimer ${player.name} ?`
                );

                if (confirmed) {
                    try {
                        Players.remove(playerId);
                        UI.renderPlayersList();
                        UI.renderSelectPlayerOptions();
                    } catch (err) {
                        UI.showError(err.message);
                    }
                }
            });
        });
    };

    /**
     * Met à jour les options de sélection de joueurs
     */
    const renderSelectPlayerOptions = () => {
        const players = Players.getAll();
        const select1 = document.getElementById('player1Select');
        const select2 = document.getElementById('player2Select');

        [select1, select2].forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Choisir --</option>' +
                players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            select.value = currentValue;
        });
    };

    /**
     * Mets à jour le tableau de scores
     */
    const updateScoresBoard = () => {
        const match = Games.getCurrentMatch();
        if (!match) return;

        const player1 = Players.getById(match.playerIds[0]);
        const player2 = Players.getById(match.playerIds[1]);

        document.getElementById('player1NameDisplay').textContent = getPlayerName(match.playerIds[0]);
        document.getElementById('player1Score').textContent = match.scores[0];
        document.getElementById('player1Throws').textContent = 
            `${Games.getPlayerThrows(0).length} volées`;

        if (!match.isTraining) {
            document.getElementById('player2NameDisplay').textContent = getPlayerName(match.playerIds[1]);
            document.getElementById('player2Score').textContent = match.scores[1];
            document.getElementById('player2Throws').textContent = 
                `${Games.getPlayerThrows(1).length} volées`;
        }

        // Afficher le tour courant et la limite
        const roundInfo = document.getElementById('roundInfo');
        if (roundInfo) {
            if (match.isDNF) {
                roundInfo.textContent = '❌ DNF (Did Not Finish)';
            } else if (match.roundLimit) {
                roundInfo.textContent = `Tour ${match.currentRound} / ${match.roundLimit}`;
            } else {
                roundInfo.textContent = `Tour ${match.currentRound}`;
            }
        }

        // Highlighter le joueur actuel
        const activeClass = 'active';
        document.getElementById('player1ScoreBoard').classList.toggle(activeClass, match.currentPlayerIndex === 0);
        if (!match.isTraining) {
            document.getElementById('player2ScoreBoard').classList.toggle(activeClass, match.currentPlayerIndex === 1);
        }
    };

    /**
     * Mets à jour le formulaire de volée
     */
    const updateThrowsForm = () => {
        const player = Games.getCurrentPlayer();
        const match = Games.getCurrentMatch();

        if (!player || !match) return;

        document.getElementById('currentPlayerName').textContent = player.name;
        document.getElementById('currentPlayerScore').textContent = 
            `Score actuel: ${match.scores[match.currentPlayerIndex]}`;

        // Afficher la suggestion de finition si le score <= 170
        updateFinishSuggestion(player.id, match.scores[match.currentPlayerIndex]);

        // Réinitialiser les sélecteurs de fléchettes avec le nouveau composant
        resetThrowSelectors();
    };

    /**
     * Réinitialise les sélecteurs de fléchettes
     */
    const resetThrowSelectors = () => {
        ThrowsInput.resetThrows();
        ThrowsInput.renderThrows();
        document.getElementById('throwError').style.display = 'none';
        document.getElementById('btnSubmitThrows').style.display = 'block';
        document.getElementById('btnSubmitPartialFinish').style.display = 'none';
    };

    /**
     * Récupère les fléchettes du formulaire (utilise maintenant ThrowsInput)
     */
    const getThrowsFromForm = () => {
        return ThrowsInput.getThrows();
    };

    /**
     * Affiche un message d'erreur de volée
     */
    const showThrowError = (message) => {
        const errorDiv = document.getElementById('throwError');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    };

    /**
     * Affiche les options de validation (valide ou erreur)
     */
    const showValidationOptions = (message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('validationModal');
            if (!modal) {
                resolve('error');
                return;
            }

            document.getElementById('validationMessage').textContent = message;

            const handleValid = () => {
                cleanup();
                resolve('valid');
            };

            const handleError = () => {
                cleanup();
                resolve('error');
            };

            const cleanup = () => {
                modal.style.display = 'none';
                document.getElementById('btnValidate').removeEventListener('click', handleValid);
                document.getElementById('btnMarkError').removeEventListener('click', handleError);
            };

            document.getElementById('btnValidate').addEventListener('click', handleValid);
            document.getElementById('btnMarkError').addEventListener('click', handleError);

            modal.style.display = 'flex';
        });
    };

    /**
     * Mets à jour l'historique des lancers
     */
    const updateThrowsHistory = () => {
        const match = Games.getCurrentMatch();
        const container = document.getElementById('throwsList');

        if (!match || match.throws.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun lancer pour le moment</p>';
            return;
        }

        // Grouper par joueur
        const players = [
            Players.getById(match.playerIds[0]),
            Players.getById(match.playerIds[1])
        ];

        let html = '';

        for (let playerIndex = 0; playerIndex < 2; playerIndex++) {
            const playerThrows = Games.getPlayerThrows(playerIndex);
            const player = players[playerIndex];

            if (playerThrows.length > 0) {
                html += `<div class="player-throws">
                    <h4>${player.name}</h4>`;

                playerThrows.forEach(t => {
                    // Formater chaque fléchette
                    const throwsDisplay = t.throw.map(th => Rules.formatThrow(th)).join(' + ');
                    const rowClass = t.isValid ? '' : 'invalid-throw';
                    const invalidBadge = t.isValid ? '' : `<span class="invalid-badge" title="${t.reason}">❌</span>`;

                    html += `<div class="throw-row ${rowClass}">
                        <span class="round-num">Volée ${t.round}</span>
                        <span class="scores">${throwsDisplay}</span>
                        <span class="total">${t.roundTotal} pts</span>
                        <span class="running">${t.runningTotal}</span>
                        ${invalidBadge}
                    </div>`;
                });

                html += '</div>';
            }
        }

        container.innerHTML = html;
    };

    /**
     * Rend la liste des matchs
     */
    const renderMatchesList = () => {
        const container = document.getElementById('matchesList');
        const matches = Games.getMatchHistory();

        if (matches.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun match pour le moment</p>';
            return;
        }

        container.innerHTML = matches.slice().reverse().map(match => {
            const player1Name = getPlayerName(match.playerIds[0]);
            const player2Name = getPlayerName(match.playerIds[1]);
            const date = new Date(match.startDate).toLocaleDateString('fr-FR');

            // Affichage du résultat
            let resultDisplay = '';
            if (match.isDNF) {
                resultDisplay = 'DNF (Did Not Finish)';
            } else {
                const winnerName = getPlayerName(match.winner);
                resultDisplay = `Gagnant: ${winnerName}`;
            }

            return `
                <div class="match-item" data-match-id="${match.id}">
                    <div class="match-info">
                        <div class="match-players">
                            <span class="player ${!match.isDNF && match.winner === match.playerIds[0] ? 'winner' : ''}">
                                ${player1Name}
                            </span>
                            <span class="vs">VS</span>
                            <span class="player ${!match.isDNF && match.winner === match.playerIds[1] ? 'winner' : ''}">
                                ${player2Name}
                            </span>
                        </div>
                        <div class="match-meta">
                            <span class="game-type">${match.gameType}</span>
                            <span class="date">${date}</span>
                            <span class="winner">${resultDisplay}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Ajouter les listeners
        container.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', () => {
                const matchId = item.dataset.matchId;
                App.showMatchDetail(matchId);
            });
        });
    };

    /**
     * Rend le détail d'un match
     */
    const renderMatchDetail = (matchId) => {
        const match = Games.getMatchById(matchId);
        if (!match) {
            showError('Match non trouvé');
            return;
        }

        const player1Name = getPlayerName(match.playerIds[0]);
        const player2Name = getPlayerName(match.playerIds[1]);

        // Afficher le gagnant ou DNF
        let resultDisplay = '';
        if (match.isDNF) {
            resultDisplay = 'DNF (Did Not Finish)';
        } else {
            resultDisplay = getPlayerName(match.winner);
        }

        const container = document.getElementById('matchDetailContent');

        let throwsHtml = '';
        for (let i = 0; i < 2; i++) {
            const throws = match.throws.filter(t => t.playerIndex === i);
            throwsHtml += `<div class="player-throws">
                <h4>${getPlayerName(match.playerIds[i])}</h4>`;

            throws.forEach(t => {
                const throwsDisplay = t.throw.map(th => Rules.formatThrow(th)).join(' + ');
                const rowClass = t.isValid ? '' : 'invalid-throw';
                const invalidBadge = t.isValid ? '' : `<span class="invalid-badge" title="${t.reason}">❌</span>`;

                throwsHtml += `<div class="throw-row ${rowClass}">
                    <span class="round-num">Volée ${t.round}</span>
                    <span class="scores">${throwsDisplay}</span>
                    <span class="total">${t.roundTotal} pts</span>
                    <span class="running">${t.runningTotal}</span>
                    ${invalidBadge}
                </div>`;
            });

            throwsHtml += '</div>';
        }

        container.innerHTML = `
            <div class="match-detail">
                <h3>${player1Name} VS ${player2Name}</h3>
                <p class="game-info">
                    Jeu: ${match.gameType} | 
                    Résultat: <strong>${resultDisplay}</strong>
                </p>
                <div class="throws-detailed">
                    ${throwsHtml}
                </div>
            </div>
        `;
    };

    /**
     * Rend les statistiques pour le joueur sélectionné
     */
    const renderStats = () => {
        const players = Players.getAll();
        const selectElement = document.getElementById('playerStatsSelect');
        const container = document.getElementById('statsList');

        // Remplir le sélecteur de joueurs
        if (selectElement) {
            selectElement.innerHTML = players.map(p => 
                `<option value="${p.id}">${p.name}</option>`
            ).join('');

            // Ajouter un événement changement
            selectElement.removeEventListener('change', renderStatsForPlayer);
            selectElement.addEventListener('change', renderStatsForPlayer);
        }

        // Ajouter les événements des onglets
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.removeEventListener('click', handleTabSwitch);
            btn.addEventListener('click', handleTabSwitch);
        });

        // Ajouter les événements des boutons de type de jeu
        const gameTypeBtns = document.querySelectorAll('.game-type-buttons .btn-game-type');
        gameTypeBtns.forEach(btn => {
            btn.removeEventListener('click', handleGameTypeSwitch);
            btn.addEventListener('click', handleGameTypeSwitch);
        });

        // Afficher les stats du premier joueur par défaut
        if (players.length > 0) {
            renderStatsForPlayer();
        } else {
            container.innerHTML = '<p class="empty-state">Aucun joueur</p>';
        }
    };

    /**
     * Gère le changement d'onglet stats
     */
    const handleTabSwitch = (e) => {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        renderStatsForPlayer();
    };

    /**
     * Gère le changement de type de jeu
     */
    const handleGameTypeSwitch = (e) => {
        const gameTypeBtns = document.querySelectorAll('.game-type-buttons .btn-game-type');
        gameTypeBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        renderStatsForPlayer();
    };

    /**
     * Affiche les stats du joueur sélectionné
     */
    const renderStatsForPlayer = () => {
        const selectElement = document.getElementById('playerStatsSelect');
        const container = document.getElementById('statsList');
        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'competition';
        const activeGameTypeBtn = document.querySelector('.game-type-buttons .btn-game-type.active');
        const gameType = activeGameTypeBtn ? activeGameTypeBtn.getAttribute('data-game-type') : 'all';
        const playerId = selectElement ? selectElement.value : null;

        if (!playerId) {
            container.innerHTML = '<p class="empty-state">Veuillez sélectionner un joueur</p>';
            return;
        }

        const player = Players.getById(playerId);
        if (!player) {
            container.innerHTML = '<p class="empty-state">Joueur non trouvé</p>';
            return;
        }

        if (activeTab === 'training') {
            renderTrainingStatsForPlayer(container, playerId, gameType);
        } else {
            renderCompetitionStatsForPlayer(container, playerId, gameType);
        }
    };

    /**
     * Affiche les stats de compétition du joueur sélectionné
     */
    const renderCompetitionStatsForPlayer = (container, playerId, gameType = 'all') => {
        const formattedStats = Stats.getFormattedStats(playerId);
        if (!formattedStats) {
            container.innerHTML = '<p class="empty-state">Aucune donnée pour ce joueur</p>';
            return;
        }

        // Utiliser les stats par type de jeu si spécifié, sinon les stats globales
        let stats;
        if (gameType !== 'all' && formattedStats.byGameType && formattedStats.byGameType[gameType]) {
            stats = formattedStats.byGameType[gameType];
        } else {
            stats = formattedStats.displayStats;
        }

        // Ajouter l'indicateur de type de jeu
        const gameTypeLabel = gameType === 'all' ? 'Tous' : gameType;
        const gameTypeClass = gameType === 'all' ? 'all' : `g${gameType}`;

        // Formater les coups préférés
        let topThrowsHtml = '<div class="top-throws">';
        if (stats.topThrows.length === 0) {
            topThrowsHtml += '<p class="no-data">Pas de données</p>';
        } else {
            topThrowsHtml += stats.topThrows.slice(0, 5).map((t, i) => {
                const throwDisplay = Rules.formatThrow({ segment: t.segment, multiplier: t.multiplier });
                return `<div class="throw-stat">
                    <span class="rank">${i + 1}</span>
                    <span class="throw-name">${throwDisplay}</span>
                    <span class="count">${t.count}x</span>
                </div>`;
            }).join('');
        }
        topThrowsHtml += '</div>';

        // Formater le double préféré
        let preferredDoubleHtml = '<div class="preferred-double">';
        if (stats.preferredFinishingDouble) {
            const doubleDisplay = Rules.formatThrow({ 
                segment: stats.preferredFinishingDouble.segment, 
                multiplier: 2 
            });
            preferredDoubleHtml += `
                <div class="double-info">
                    <span class="double-name">${doubleDisplay}</span>
                    <span class="double-stats">${stats.preferredFinishingDouble.count}x</span>
                </div>
            `;
        } else {
            preferredDoubleHtml += '<p class="no-data">Pas de finish réalisé</p>';
        }
        preferredDoubleHtml += '</div>';

        container.innerHTML = `
            <div class="stats-card">
                <!-- En-tête avec type de jeu -->
                <div class="stats-header">
                    <h3>Statistiques <span class="game-type-indicator ${gameTypeClass}">${gameTypeLabel}</span></h3>
                </div>
                <!-- Stats Basiques -->
                <div class="stats-section">
                    <div class="stats-grid">
                        <div class="stat">
                            <div class="stat-label">Matchs</div>
                            <div class="stat-value">${stats.matchesInfo}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Taux victoire</div>
                            <div class="stat-value">${stats.winRate}%</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Moy/volée</div>
                            <div class="stat-value">${stats.averageRoundScore}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Finish %</div>
                            <div class="stat-value">${stats.finishDoubleSuccessRate}%</div>
                        </div>
                    </div>
                </div>

                <!-- Meilleur Score de Finish -->
                <div class="stats-section">
                    <h4>🎯 Meilleur Finish</h4>
                    <div class="best-score">
                        <span class="score-value">${stats.bestFinishingScore}</span>
                        <span class="score-label">pts</span>
                    </div>
                </div>

                <!-- Top 5 Coups -->
                <div class="stats-section">
                    <h4>📊 Top 5 Coups</h4>
                    ${topThrowsHtml}
                </div>

                <!-- Double Préféré -->
                <div class="stats-section">
                    <h4>🎯 Double Préféré</h4>
                    ${preferredDoubleHtml}
                </div>
            </div>
        `;
    };

    /**
     * Affiche les stats d'entraînement du joueur sélectionné
     */
    const renderTrainingStatsForPlayer = (container, playerId, gameType = 'all') => {
        const formattedStats = Stats.getFormattedTrainingStats(playerId);
        if (!formattedStats) {
            container.innerHTML = '<p class="empty-state">Aucune donnée pour ce joueur</p>';
            return;
        }

        // Utiliser les stats par type de jeu si spécifié, sinon les stats globales
        let stats;
        if (gameType !== 'all' && formattedStats.byGameType && formattedStats.byGameType[gameType]) {
            stats = formattedStats.byGameType[gameType];
        } else {
            stats = formattedStats.displayStats;
        }

        // Ajouter l'indicateur de type de jeu
        const gameTypeLabel = gameType === 'all' ? 'Tous' : gameType;
        const gameTypeClass = gameType === 'all' ? 'all' : `g${gameType}`;

        // Formater les coups préférés
        let topThrowsHtml = '<div class="top-throws">';
        if (stats.topThrows.length === 0) {
            topThrowsHtml += '<p class="no-data">Pas de données</p>';
        } else {
            topThrowsHtml += stats.topThrows.slice(0, 5).map((t, i) => {
                const throwDisplay = Rules.formatThrow({ segment: t.segment, multiplier: t.multiplier });
                return `<div class="throw-stat">
                    <span class="rank">${i + 1}</span>
                    <span class="throw-name">${throwDisplay}</span>
                    <span class="count">${t.count}x</span>
                </div>`;
            }).join('');
        }
        topThrowsHtml += '</div>';

        // Formater le double préféré
        let preferredDoubleHtml = '<div class="preferred-double">';
        if (stats.preferredFinishingDouble) {
            const doubleDisplay = Rules.formatThrow({ 
                segment: stats.preferredFinishingDouble.segment, 
                multiplier: 2 
            });
            preferredDoubleHtml += `
                <div class="double-info">
                    <span class="double-name">${doubleDisplay}</span>
                    <span class="double-stats">${stats.preferredFinishingDouble.count}x</span>
                </div>
            `;
        } else {
            preferredDoubleHtml += '<p class="no-data">Pas de finish réalisé</p>';
        }
        preferredDoubleHtml += '</div>';

        container.innerHTML = `
            <div class="stats-card">
                <!-- En-tête avec type de jeu -->
                <div class="stats-header">
                    <h3>Statistiques <span class="game-type-indicator ${gameTypeClass}">${gameTypeLabel}</span></h3>
                </div>
                <!-- Stats Basiques -->
                <div class="stats-section">
                    <div class="stats-grid">
                        <div class="stat">
                            <div class="stat-label">Matchs</div>
                            <div class="stat-value">${stats.matchesInfo}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Taux finish</div>
                            <div class="stat-value">${stats.finishRate}%</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Moy/volée</div>
                            <div class="stat-value">${stats.averageRoundScore}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Finish %</div>
                            <div class="stat-value">${stats.finishDoubleSuccessRate}%</div>
                        </div>
                    </div>
                </div>

                <!-- Meilleur Score de Finish -->
                <div class="stats-section">
                    <h4>🎯 Meilleur Finish</h4>
                    <div class="best-score">
                        <span class="score-value">${stats.bestFinishingScore}</span>
                        <span class="score-label">pts</span>
                    </div>
                </div>

                <!-- Top 5 Coups -->
                <div class="stats-section">
                    <h4>📊 Top 5 Coups</h4>
                    ${topThrowsHtml}
                </div>

                <!-- Double Préféré -->
                <div class="stats-section">
                    <h4>🎯 Double Préféré</h4>
                    ${preferredDoubleHtml}
                </div>
            </div>
        `;
    };

    /**
     * Met à jour et affiche la suggestion de finition
     */
    const updateFinishSuggestion = (playerId, currentScore) => {
        const suggestionEl = document.getElementById('finishSuggestion');

        if (!suggestionEl) return;

        // Score > 170 ne peut pas être fini en une volée
        if (currentScore > 170 || currentScore < 2) {
            suggestionEl.style.display = 'none';
            return;
        }

        const suggestion = Finishes.getFinishSuggestion(currentScore, playerId);

        if (!suggestion) {
            suggestionEl.style.display = 'none';
            return;
        }

        // Construire le HTML de la suggestion
        let html = `<div class="finish-suggestion-content">`;
        html += `<strong>💡 Suggestion de finish:</strong> ${suggestion.formatted}`;

        if (suggestion.usedPreferredDouble) {
            html += ` <span class="preferred-double-badge">✓ Double favori</span>`;
        }

        html += `</div>`;

        suggestionEl.innerHTML = html;
        suggestionEl.style.display = 'block';
    };

    return {
        showScreen,
        showConfirmModal,
        showMessageModal,
        showError,
        showSuccess,
        showThrowError,
        showValidationOptions,
        clearPlayerForm,
        renderPlayersList,
        renderSelectPlayerOptions,
        updateScoresBoard,
        updateThrowsForm,
        resetThrowSelectors,
        getThrowsFromForm,
        updateThrowsHistory,
        renderMatchesList,
        renderMatchDetail,
        renderStats,
        getPlayerName,
        updateFinishSuggestion
    };
})();
