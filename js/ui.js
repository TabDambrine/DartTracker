/**
 * UI Module
 * Gère l'interface utilisateur
 */

const UI = (() => {
    /**
     * Obtient le nom d'un joueur (ou "Joueur supprimé" si absent)
     */
    const getPlayerName = (playerId) => {
        if (Games.isGhostId && Games.isGhostId(playerId)) {
            const match = Games.getCurrentMatch();
            if (match) {
                const index = match.playerIds.indexOf(playerId);
                if (index !== -1) return Games.getGhostDisplayName(match, index);
            }
            return 'Ghost';
        }
        if (playerId === 'deleted_player') {
            return 'Joueur supprimé';
        }
        const player = Players.getById(playerId);
        return player ? player.name : 'Joueur supprimé';
    };

    /**
     * Change l'écran actif
     */
    const getMatchPlayerName = (match, playerIndex) => {
        const playerId = match.playerIds[playerIndex];
        if (Games.isGhostId && Games.isGhostId(playerId)) {
            return Games.getGhostDisplayName(match, playerIndex);
        }
        return getPlayerName(playerId);
    };

    const getMatchWinnerName = (match) => {
        if (!match || !match.winner) return '';
        const winnerIndex = match.playerIds.indexOf(match.winner);
        if (winnerIndex !== -1) return getMatchPlayerName(match, winnerIndex);
        return getPlayerName(match.winner);
    };

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
        const selects = [1, 2, 3, 4]
            .map(index => document.getElementById(`player${index}Select`))
            .filter(Boolean);

        selects.forEach((select, index) => {
            const currentValue = select.value;
            const placeholder = index < 2 ? '-- Choisir --' : '-- Optionnel --';
            select.innerHTML = `<option value="">${placeholder}</option>` +
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

        const scoresBoard = document.getElementById('scoresBoard');
        scoresBoard.style.setProperty('--player-count', match.playerIds.length);
        scoresBoard.innerHTML = match.playerIds.map((playerId, index) => `
            <div id="player${index + 1}ScoreBoard" class="score-player ${match.currentPlayerIndex === index ? 'active' : ''}">
                <div class="player-name" id="player${index + 1}NameDisplay">${getMatchPlayerName(match, index)}</div>
                <div class="player-score" id="player${index + 1}Score">${match.scores[index]}</div>
                <div class="player-throws" id="player${index + 1}Throws">${Games.getPlayerThrows(index).length} volees</div>
            </div>
        `).join('');

        const roundInfo = document.getElementById('roundInfo');
        if (roundInfo) {
            if (match.isDNF) {
                roundInfo.textContent = 'DNF (Did Not Finish)';
            } else if (match.roundLimit) {
                roundInfo.textContent = `Tour ${match.currentRound} / ${match.roundLimit}`;
            } else {
                roundInfo.textContent = `Tour ${match.currentRound}`;
            }
        }
    };
    /**
     * Mets a jour le formulaire de volée
     */
    const updateThrowsForm = () => {
        const player = Games.getCurrentPlayer();
        const match = Games.getCurrentMatch();

        if (!player || !match) return;

        document.getElementById('currentPlayerName').textContent = player.name;
        document.getElementById('currentPlayerScore').textContent = 
            `Score actuel: ${match.scores[match.currentPlayerIndex]}`;

        // Afficher la suggestion de finition si le score <= 170
        updateFinishSuggestion(
            Games.isGhostId(player.id) ? null : player.id,
            match.scores[match.currentPlayerIndex]
        );

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

    const setThrowsFormEnabled = (enabled, message = '') => {
        const form = document.getElementById('throwsForm');
        const currentPlayerName = document.getElementById('currentPlayerName');
        const currentPlayerScore = document.getElementById('currentPlayerScore');

        if (form) {
            form.classList.toggle('simulating', !enabled);
        }

        document.querySelectorAll('#throwsForm button, #throwsForm input, #throwsForm select').forEach(el => {
            el.disabled = !enabled;
        });

        if (!enabled) {
            if (currentPlayerName) currentPlayerName.textContent = message || 'Ghost en cours...';
            if (currentPlayerScore) currentPlayerScore.textContent = '';
        }
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

        let html = '';

        for (let playerIndex = 0; playerIndex < match.playerIds.length; playerIndex++) {
            const playerThrows = Games.getPlayerThrows(playerIndex);
            const playerName = getMatchPlayerName(match, playerIndex);

            if (playerThrows.length > 0) {
                html += `<div class="player-throws">
                    <h4>${playerName}</h4>`;

                playerThrows.forEach(t => {
                    // Formater chaque fléchette
                    const throwsDisplay = t.throw.map(th => Rules.formatThrow(th)).join(' + ');
                    const rowClass = t.isValid ? '' : 'invalid-throw';
                    const simulatedBadge = t.isSimulated ? '<span class="simulated-badge">Ghost</span>' : '';
                    const invalidBadge = t.isValid ? '' : `<span class="invalid-badge" title="${t.reason}">❌</span>`;

                    html += `<div class="throw-row ${rowClass}">
                        <span class="round-num">Volée ${t.round}</span>
                        <span class="scores">${throwsDisplay}</span>
                        <span class="total">${t.roundTotal} pts</span>
                        <span class="running">${t.runningTotal}</span>
                        ${simulatedBadge}
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
            const playersHtml = match.playerIds.map((playerId, index) => `
                <span class="player ${!match.isDNF && match.winner === playerId ? 'winner' : ''}">
                    ${getMatchPlayerName(match, index)}
                </span>
            `).join('<span class="vs">VS</span>');
            const date = new Date(match.startDate).toLocaleDateString('fr-FR');
            const resultDisplay = match.isDNF
                ? 'DNF (Did Not Finish)'
                : `Gagnant: ${getMatchWinnerName(match)}`;

            return `
                <div class="match-item" data-match-id="${match.id}">
                    <div class="match-info">
                        <div class="match-players">
                            ${playersHtml}
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
            showError('Match non trouve');
            return;
        }

        const playersTitle = match.playerIds
            .map((playerId, index) => getMatchPlayerName(match, index))
            .join(' VS ');
        const resultDisplay = match.isDNF ? 'DNF (Did Not Finish)' : getMatchWinnerName(match);
        const container = document.getElementById('matchDetailContent');

        let throwsHtml = '';
        for (let i = 0; i < match.playerIds.length; i++) {
            const throws = match.throws.filter(t => t.playerIndex === i);
            throwsHtml += `<div class="player-throws">
                <h4>${getMatchPlayerName(match, i)}</h4>`;

            throws.forEach(t => {
                const throwsDisplay = t.throw.map(th => Rules.formatThrow(th)).join(' + ');
                const rowClass = t.isValid ? '' : 'invalid-throw';
                const simulatedBadge = t.isSimulated ? '<span class="simulated-badge">Ghost</span>' : '';
                const invalidBadge = t.isValid ? '' : `<span class="invalid-badge" title="${t.reason}">X</span>`;

                throwsHtml += `<div class="throw-row ${rowClass}">
                    <span class="round-num">Volee ${t.round}</span>
                    <span class="scores">${throwsDisplay}</span>
                    <span class="total">${t.roundTotal} pts</span>
                    <span class="running">${t.runningTotal}</span>
                    ${simulatedBadge}
                    ${invalidBadge}
                </div>`;
            });

            throwsHtml += '</div>';
        }

        container.innerHTML = `
            <div class="match-detail">
                <h3>${playersTitle}</h3>
                <p class="game-info">
                    Jeu: ${match.gameType} | 
                    Resultat: <strong>${resultDisplay}</strong>
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
    const formatCompactThrow = (throw_) => {
        if (!throw_) return '-';

        if (throw_.segment === -1) return 'MISS';
        if (throw_.segment === 0 || throw_.segment === 50) return 'BULL';
        if (throw_.segment === 25) return '25';

        const multiplierPrefix = {
            1: 'S',
            2: 'D',
            3: 'T'
        }[throw_.multiplier] || 'S';

        return `${multiplierPrefix}${throw_.segment}`;
    };

    const formatRoundThrows = (throws) => {
        if (!Array.isArray(throws) || throws.length === 0) return 'Pas de donnees';
        return throws.map(formatCompactThrow).join(' - ');
    };

    const renderTopThrowsHtml = (topThrows) => {
        let html = '<div class="top-throws">';

        if (!topThrows || topThrows.length === 0) {
            html += '<p class="no-data">Pas de donnees</p>';
        } else {
            html += topThrows.slice(0, 5).map((t, i) => {
                const throwDisplay = Rules.formatThrow({ segment: t.segment, multiplier: t.multiplier });
                return `<div class="throw-stat">
                    <span class="rank">${i + 1}</span>
                    <span class="throw-name">${throwDisplay}</span>
                    <span class="count">${t.count}x</span>
                </div>`;
            }).join('');
        }

        html += '</div>';
        return html;
    };

    const renderPreferredDoubleHtml = (preferredFinishingDouble) => {
        let html = '<div class="preferred-double">';

        if (preferredFinishingDouble) {
            const doubleDisplay = Rules.formatThrow({
                segment: preferredFinishingDouble.segment,
                multiplier: 2
            });

            html += `
                <div class="double-info">
                    <span class="double-name">${doubleDisplay}</span>
                    <span class="double-stats">${preferredFinishingDouble.count}x</span>
                </div>
            `;
        } else {
            html += '<p class="no-data">Pas de finish realise</p>';
        }

        html += '</div>';
        return html;
    };

    const renderBestRoundHtml = (bestRound) => {
        if (!bestRound) {
            return '<p class="no-data">Pas de volee valide</p>';
        }

        return `
            <div class="round-highlight">
                <div class="round-highlight-score">
                    <span class="score-value">${bestRound.roundTotal}</span>
                    <span class="score-label">pts</span>
                </div>
                <div class="round-highlight-throws">${formatRoundThrows(bestRound.throw)}</div>
            </div>
        `;
    };

    const renderTopRoundsHtml = (topRounds) => {
        let html = '<div class="top-rounds">';

        if (!topRounds || topRounds.length === 0) {
            html += '<p class="no-data">Pas de volee valide</p>';
        } else {
            html += topRounds.slice(0, 5).map((round, i) => `
                <div class="round-stat">
                    <span class="rank">${i + 1}</span>
                    <div class="round-details">
                        <span class="round-name">${formatRoundThrows(round.throw)}</span>
                        <span class="round-meta">${round.gameType} - V${round.round}</span>
                    </div>
                    <span class="round-score">${round.roundTotal}</span>
                </div>
            `).join('');
        }

        html += '</div>';
        return html;
    };

    const renderTopFinishesHtml = (topFinishes) => {
        let html = '<div class="top-rounds">';

        if (!topFinishes || topFinishes.length === 0) {
            html += '<p class="no-data">Pas de finish valide</p>';
        } else {
            html += topFinishes.slice(0, 5).map((finish, i) => `
                <div class="round-stat">
                    <span class="rank">${i + 1}</span>
                    <div class="round-details">
                        <span class="round-name">${formatRoundThrows(finish.throw)}</span>
                        <span class="round-meta">${finish.gameType} - V${finish.round}</span>
                    </div>
                    <span class="round-score">${finish.finishScore}</span>
                </div>
            `).join('');
        }

        html += '</div>';
        return html;
    };

    const renderRecentAverageHtml = (recentAverage) => {
        if (!recentAverage || recentAverage.roundsCount === 0) {
            return '<p class="no-data">Pas assez de volees recentes</p>';
        }

        return `
            <div class="round-highlight recent-average-highlight">
                <div class="round-highlight-score">
                    <span class="score-value">${recentAverage.averageRoundScore}</span>
                    <span class="score-label">pts/volee</span>
                </div>
                <div class="round-highlight-throws">
                    Sur ${recentAverage.roundsCount} des ${recentAverage.windowSize} dernieres volees valides
                </div>
            </div>
        `;
    };

    const renderPerformanceSnapshotHtml = (firstNineAverage, regularity) => {
        const firstNineRounds = firstNineAverage?.roundsCount || 0;
        const regularityRounds = regularity?.roundsCount || 0;

        if (firstNineRounds === 0 && regularityRounds === 0) {
            return '<p class="no-data">Pas assez de volees pour analyser le demarrage</p>';
        }

        return `
            <div class="comparison-grid">
                <div class="comparison-card">
                    <span class="comparison-label">First 9 Avg</span>
                    <span class="comparison-value">${firstNineAverage?.averageRoundScore || '0.0'}</span>
                    <span class="comparison-meta">${firstNineRounds} volees prises en compte</span>
                </div>
                <div class="comparison-card">
                    <span class="comparison-label">Regularite</span>
                    <span class="comparison-value">${regularity?.standardDeviation || '0.0'}</span>
                    <span class="comparison-meta">${regularity?.label || 'N/A'}</span>
                </div>
            </div>
        `;
    };

    const renderCheckoutAverageHtml = (checkoutAverage) => {
        if (!checkoutAverage || checkoutAverage.finishesCount === 0) {
            return '<p class="no-data">Pas de finish valide</p>';
        }

        return `
            <div class="round-highlight checkout-average-highlight">
                <div class="round-highlight-score">
                    <span class="score-value">${checkoutAverage.averageFinishScore}</span>
                    <span class="score-label">pts</span>
                </div>
                <div class="round-highlight-throws">
                    Moyenne sur ${checkoutAverage.finishesCount} finishs
                </div>
            </div>
        `;
    };

    const formatOutcomeAverageValue = (outcome) => {
        if (!outcome || outcome.roundsCount === 0) return 'N/A';
        return Number(outcome.averageRoundScore || 0).toFixed(1);
    };

    const renderOutcomeAveragesHtml = (outcomeAverages, comparisonConfig) => {
        const primary = outcomeAverages?.[comparisonConfig.primaryKey];
        const secondary = outcomeAverages?.[comparisonConfig.secondaryKey];

        return `
            <div class="comparison-grid">
                <div class="comparison-card">
                    <span class="comparison-label">${comparisonConfig.primaryLabel}</span>
                    <span class="comparison-value">${formatOutcomeAverageValue(primary)}</span>
                    <span class="comparison-meta">${primary?.roundsCount || 0} volees valides</span>
                </div>
                <div class="comparison-card">
                    <span class="comparison-label">${comparisonConfig.secondaryLabel}</span>
                    <span class="comparison-value">${formatOutcomeAverageValue(secondary)}</span>
                    <span class="comparison-meta">${secondary?.roundsCount || 0} volees valides</span>
                </div>
            </div>
        `;
    };

    const renderHighScoreBreakdownHtml = (highScoreRounds) => {
        const breakdown = highScoreRounds || {
            score100Plus: 0,
            score140Plus: 0,
            score160Plus: 0,
            score180: 0
        };

        return `
            <div class="score-breakdown">
                <div class="score-breakdown-item">
                    <span class="score-band-label">100+</span>
                    <span class="score-band-value">${breakdown.score100Plus}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">140+</span>
                    <span class="score-band-value">${breakdown.score140Plus}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">160+</span>
                    <span class="score-band-value">${breakdown.score160Plus}</span>
                </div>
                <div class="score-breakdown-item highlight">
                    <span class="score-band-label">180</span>
                    <span class="score-band-value">${breakdown.score180}</span>
                </div>
            </div>
        `;
    };

    const renderFinishZoneBreakdownHtml = (finishZoneBreakdown) => {
        const breakdown = finishZoneBreakdown || {};

        return `
            <div class="score-breakdown">
                <div class="score-breakdown-item">
                    <span class="score-band-label">2-40</span>
                    <span class="score-band-value">${breakdown.zone2To40 || 0}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">41-80</span>
                    <span class="score-band-value">${breakdown.zone41To80 || 0}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">81-120</span>
                    <span class="score-band-value">${breakdown.zone81To120 || 0}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">121-170</span>
                    <span class="score-band-value">${breakdown.zone121To170 || 0}</span>
                </div>
            </div>
        `;
    };

    const renderThrowTypeBreakdownHtml = (throwTypeBreakdown) => {
        const breakdown = throwTypeBreakdown || {};
        const totalDarts = breakdown.totalDarts || 0;
        const formatPercentage = (count) => totalDarts > 0 ? `${((count / totalDarts) * 100).toFixed(1)}%` : '0.0%';

        return `
            <div class="score-breakdown detailed-breakdown">
                <div class="score-breakdown-item">
                    <span class="score-band-label">Simples</span>
                    <span class="score-band-value">${breakdown.singles || 0}</span>
                    <span class="score-band-meta">${formatPercentage(breakdown.singles || 0)}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">Doubles</span>
                    <span class="score-band-value">${breakdown.doubles || 0}</span>
                    <span class="score-band-meta">${formatPercentage(breakdown.doubles || 0)}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">Triples</span>
                    <span class="score-band-value">${breakdown.triples || 0}</span>
                    <span class="score-band-meta">${formatPercentage(breakdown.triples || 0)}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">Bulls</span>
                    <span class="score-band-value">${breakdown.bulls || 0}</span>
                    <span class="score-band-meta">${formatPercentage(breakdown.bulls || 0)}</span>
                </div>
            </div>
        `;
    };

    const renderFinishZoneBustRatesHtml = (finishZoneBustRates) => {
        const rates = finishZoneBustRates || {};
        const formatRate = (zone) => zone ? `${zone.invalidRoundRate || 0}%` : '0%';
        const formatMeta = (zone) => zone ? `${zone.invalidRounds || 0}/${zone.attempts || 0}` : '0/0';

        return `
            <div class="score-breakdown detailed-breakdown">
                <div class="score-breakdown-item">
                    <span class="score-band-label">2-40</span>
                    <span class="score-band-value">${formatRate(rates.zone2To40)}</span>
                    <span class="score-band-meta">${formatMeta(rates.zone2To40)}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">41-80</span>
                    <span class="score-band-value">${formatRate(rates.zone41To80)}</span>
                    <span class="score-band-meta">${formatMeta(rates.zone41To80)}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">81-120</span>
                    <span class="score-band-value">${formatRate(rates.zone81To120)}</span>
                    <span class="score-band-meta">${formatMeta(rates.zone81To120)}</span>
                </div>
                <div class="score-breakdown-item">
                    <span class="score-band-label">121-170</span>
                    <span class="score-band-value">${formatRate(rates.zone121To170)}</span>
                    <span class="score-band-meta">${formatMeta(rates.zone121To170)}</span>
                </div>
            </div>
        `;
    };

    const DARTBOARD_SEGMENT_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const mixHexColors = (startColor, endColor, ratio) => {
        const safeRatio = clamp(ratio, 0, 1);
        const start = startColor.replace('#', '');
        const end = endColor.replace('#', '');
        const mixed = [0, 1, 2].map(index => {
            const startValue = parseInt(start.slice(index * 2, index * 2 + 2), 16);
            const endValue = parseInt(end.slice(index * 2, index * 2 + 2), 16);
            const value = Math.round(startValue + (endValue - startValue) * safeRatio);
            return value.toString(16).padStart(2, '0');
        }).join('');

        return `#${mixed}`;
    };

    const getHeatmapColor = (value, maxValue) => {
        if (!value || maxValue <= 0) return '#edf2f7';
        const intensity = Math.pow(value / maxValue, 0.72);
        return mixHexColors('#dbe4ec', '#ff6b35', intensity);
    };

    const renderBarChartSvg = (items, caption) => {
        const safeItems = Array.isArray(items) ? items : [];
        const maxValue = Math.max(0, ...safeItems.map(item => Number(item.value) || 0));

        if (safeItems.length === 0 || maxValue === 0) {
            return '<p class="no-data">Pas assez de donnees pour afficher le graphique</p>';
        }

        const width = 360;
        const left = 72;
        const right = 40;
        const top = 16;
        const rowHeight = 30;
        const barHeight = 12;
        const bottom = 16;
        const height = top + bottom + safeItems.length * rowHeight;
        const barMaxWidth = width - left - right;

        const rows = safeItems.map((item, index) => {
            const value = Number(item.value) || 0;
            const y = top + index * rowHeight;
            const labelY = y + 15;
            const barY = y + 8;
            const barWidth = maxValue > 0 ? (value / maxValue) * barMaxWidth : 0;
            const fill = item.highlight ? '#ff8c42' : '#2d8cff';

            return `
                <text x="0" y="${labelY}" class="chart-axis-label">${item.label}</text>
                <rect x="${left}" y="${barY}" width="${barMaxWidth}" height="${barHeight}" rx="6" class="chart-bar-track"></rect>
                <rect x="${left}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="6" fill="${fill}">
                    <title>${item.label}: ${value}</title>
                </rect>
                <text x="${width - 2}" y="${labelY}" class="chart-value-label" text-anchor="end">${value}</text>
            `;
        }).join('');

        const topItem = safeItems.reduce((best, item) => {
            if (!best || (Number(item.value) || 0) > (Number(best.value) || 0)) return item;
            return best;
        }, null);

        return `
            <div class="chart-block">
                <svg class="stats-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${caption}">
                    ${rows}
                </svg>
                <p class="chart-caption">${caption}</p>
                ${topItem ? `<p class="chart-summary-inline">Pic actuel : <strong>${topItem.label}</strong> avec <strong>${topItem.value}</strong></p>` : ''}
            </div>
        `;
    };

    const renderRecentTrendChartHtml = (recentTrend) => {
        const points = recentTrend?.points || [];

        if (points.length === 0) {
            return '<p class="no-data">Pas assez de volees recentes pour tracer une courbe</p>';
        }

        const width = 360;
        const height = 190;
        const padding = { top: 16, right: 16, bottom: 34, left: 28 };
        const plotWidth = width - padding.left - padding.right;
        const plotHeight = height - padding.top - padding.bottom;
        const scores = points.map(point => point.score);
        const maxScore = Math.max(...scores, 60);
        const minScore = Math.min(...scores, 0);
        const range = maxScore - minScore || 1;

        const chartPoints = points.map((point, index) => {
            const x = padding.left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
            const y = padding.top + ((maxScore - point.score) / range) * plotHeight;
            return { ...point, x, y };
        });

        const polylinePoints = chartPoints.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
        const areaPoints = [
            `${padding.left},${padding.top + plotHeight}`,
            ...chartPoints.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`),
            `${padding.left + plotWidth},${padding.top + plotHeight}`
        ].join(' ');
        const yTicks = [maxScore, Math.round((maxScore + minScore) / 2), minScore];
        const tickLabels = yTicks.map(value => {
            const y = padding.top + ((maxScore - value) / range) * plotHeight;
            return `
                <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line"></line>
                <text x="${padding.left - 6}" y="${y + 4}" class="chart-axis-label" text-anchor="end">${value}</text>
            `;
        }).join('');

        const circles = chartPoints.map(point => `
            <circle cx="${point.x}" cy="${point.y}" r="4" class="chart-point">
                <title>${point.label}: ${point.score} pts</title>
            </circle>
        `).join('');

        const maxPoint = chartPoints.reduce((best, point) => point.score > best.score ? point : best, chartPoints[0]);
        const minPoint = chartPoints.reduce((best, point) => point.score < best.score ? point : best, chartPoints[0]);
        const lastPoint = chartPoints[chartPoints.length - 1];
        const spread = maxPoint.score - minPoint.score;

        const renderTrendBadge = (point, label, modifier = '') => {
            const badgeWidth = 62;
            const badgeHeight = 18;
            const badgeX = clamp(point.x - badgeWidth / 2, padding.left, width - padding.right - badgeWidth);
            const preferredY = point.y < padding.top + 28 ? point.y + 10 : point.y - 24;
            const badgeY = clamp(preferredY, padding.top + 2, height - padding.bottom - badgeHeight - 2);

            return `
                <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="9" class="chart-badge ${modifier}"></rect>
                <text x="${badgeX + badgeWidth / 2}" y="${badgeY + 12}" class="chart-badge-label" text-anchor="middle">${label}</text>
            `;
        };

        const badges = [
            renderTrendBadge(maxPoint, `Pic ${maxPoint.score}`, 'chart-badge-max'),
            maxPoint.index !== minPoint.index ? renderTrendBadge(minPoint, `Creux ${minPoint.score}`, 'chart-badge-min') : '',
            lastPoint.index !== maxPoint.index && lastPoint.index !== minPoint.index ? renderTrendBadge(lastPoint, `Dern. ${lastPoint.score}`, 'chart-badge-last') : ''
        ].join('');

        return `
            <div class="chart-block">
                <svg class="stats-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Progression recente des volees">
                    <defs>
                        <linearGradient id="trendFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#ff8c42" stop-opacity="0.28"></stop>
                            <stop offset="100%" stop-color="#ff8c42" stop-opacity="0.03"></stop>
                        </linearGradient>
                    </defs>
                    ${tickLabels}
                    <polygon points="${areaPoints}" fill="url(#trendFillGradient)"></polygon>
                    <polyline fill="none" stroke="#ff8c42" stroke-width="3" points="${polylinePoints}" stroke-linecap="round" stroke-linejoin="round"></polyline>
                    ${circles}
                    ${badges}
                    <text x="${padding.left}" y="${height - 10}" class="chart-axis-label">Anciennes</text>
                    <text x="${width - padding.right}" y="${height - 10}" class="chart-axis-label" text-anchor="end">Recentes</text>
                </svg>
                <p class="chart-caption">Dernieres ${points.length} volees valides</p>
                <div class="chart-meta-grid">
                    <div class="chart-meta-card">
                        <span class="chart-meta-label">Pic</span>
                        <span class="chart-meta-value">${maxPoint.score}</span>
                    </div>
                    <div class="chart-meta-card">
                        <span class="chart-meta-label">Derniere</span>
                        <span class="chart-meta-value">${lastPoint.score}</span>
                    </div>
                    <div class="chart-meta-card">
                        <span class="chart-meta-label">Amplitude</span>
                        <span class="chart-meta-value">${spread}</span>
                    </div>
                </div>
            </div>
        `;
    };

    const polarToCartesian = (cx, cy, radius, angleDegrees) => {
        const angleRadians = (angleDegrees * Math.PI) / 180;
        return {
            x: cx + radius * Math.cos(angleRadians),
            y: cy + radius * Math.sin(angleRadians)
        };
    };

    const describeRingSector = (cx, cy, innerRadius, outerRadius, startAngle, endAngle) => {
        const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
        const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
        const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
        const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);

        return [
            `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
            `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
            `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
            `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
            'Z'
        ].join(' ');
    };

    const renderTargetHeatmapHtml = (targetHeatmap) => {
        const heatmap = targetHeatmap || {};
        const totalHits = heatmap.totalHits || 0;
        const maxCount = heatmap.maxCount || 0;

        if (totalHits === 0 || maxCount === 0) {
            return '<p class="no-data">Pas assez de lancers pour afficher la heatmap</p>';
        }

        const width = 320;
        const height = 360;
        const cx = 160;
        const cy = 146;
        const radii = {
            doubleOuter: 112,
            doubleInner: 100,
            tripleOuter: 66,
            tripleInner: 54,
            singleInner: 20,
            bullOuter: 18,
            bullInner: 9
        };

        const segments = DARTBOARD_SEGMENT_ORDER.map((segment, index) => {
            const centerAngle = -90 + index * 18;
            const startAngle = centerAngle - 9;
            const endAngle = centerAngle + 9;
            const labelPos = polarToCartesian(cx, cy, 128, centerAngle);
            const singleCount = Number(heatmap.singles?.[segment]) || 0;
            const doubleCount = Number(heatmap.doubles?.[segment]) || 0;
            const tripleCount = Number(heatmap.triples?.[segment]) || 0;

            return `
                <path d="${describeRingSector(cx, cy, radii.doubleInner, radii.doubleOuter, startAngle, endAngle)}" fill="${getHeatmapColor(doubleCount, maxCount)}" class="heatmap-segment">
                    <title>D${segment}: ${doubleCount}</title>
                </path>
                <path d="${describeRingSector(cx, cy, radii.tripleOuter, radii.doubleInner, startAngle, endAngle)}" fill="${getHeatmapColor(singleCount, maxCount)}" class="heatmap-segment">
                    <title>S${segment}: ${singleCount}</title>
                </path>
                <path d="${describeRingSector(cx, cy, radii.tripleInner, radii.tripleOuter, startAngle, endAngle)}" fill="${getHeatmapColor(tripleCount, maxCount)}" class="heatmap-segment">
                    <title>T${segment}: ${tripleCount}</title>
                </path>
                <path d="${describeRingSector(cx, cy, radii.singleInner, radii.tripleInner, startAngle, endAngle)}" fill="${getHeatmapColor(singleCount, maxCount)}" class="heatmap-segment">
                    <title>S${segment}: ${singleCount}</title>
                </path>
                <text x="${labelPos.x.toFixed(2)}" y="${labelPos.y.toFixed(2)}" class="heatmap-label" text-anchor="middle" dominant-baseline="middle">${segment}</text>
            `;
        }).join('');

        const outerBullColor = getHeatmapColor(Number(heatmap.outerBull) || 0, maxCount);
        const bullseyeColor = getHeatmapColor(Number(heatmap.bullseye) || 0, maxCount);
        const summarizeZone = (counts, prefix) => {
            let bestSegment = null;
            let bestCount = 0;

            Object.entries(counts || {}).forEach(([segment, count]) => {
                const numericCount = Number(count) || 0;
                if (numericCount > bestCount) {
                    bestCount = numericCount;
                    bestSegment = segment;
                }
            });

            if (!bestSegment || bestCount === 0) {
                return 'N/A';
            }

            return `${prefix}${bestSegment} (${bestCount})`;
        };

        const heatmapSummary = [
            { label: 'Simple fort', value: summarizeZone(heatmap.singles, 'S') },
            { label: 'Triple fort', value: summarizeZone(heatmap.triples, 'T') },
            { label: 'Double fort', value: summarizeZone(heatmap.doubles, 'D') },
            { label: 'Bulls', value: `${(heatmap.outerBull || 0) + (heatmap.bullseye || 0)}` }
        ];

        return `
            <div class="chart-block heatmap-block">
                <svg class="stats-chart-svg heatmap-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Heatmap des segments touches">
                    <defs>
                        <linearGradient id="heatmapLegendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#dbe4ec"></stop>
                            <stop offset="100%" stop-color="#ff6b35"></stop>
                        </linearGradient>
                    </defs>
                    <circle cx="${cx}" cy="${cy}" r="${radii.doubleOuter + 2}" class="heatmap-board-outline"></circle>
                    ${segments}
                    <circle cx="${cx}" cy="${cy}" r="${radii.bullOuter}" fill="${outerBullColor}" class="heatmap-segment">
                        <title>BULL 25: ${heatmap.outerBull || 0}</title>
                    </circle>
                    <circle cx="${cx}" cy="${cy}" r="${radii.bullInner}" fill="${bullseyeColor}" class="heatmap-segment">
                        <title>BULL 50: ${heatmap.bullseye || 0}</title>
                    </circle>
                    <text x="${cx}" y="${cy + 4}" class="heatmap-center-label" text-anchor="middle">BULL</text>
                    <rect x="54" y="300" width="212" height="12" rx="6" fill="url(#heatmapLegendGradient)"></rect>
                    <text x="54" y="294" class="chart-axis-label">Peu joue</text>
                    <text x="266" y="294" class="chart-axis-label" text-anchor="end">Tres joue</text>
                    <text x="${cx}" y="336" class="chart-value-label" text-anchor="middle">${totalHits} lancers en cible</text>
                </svg>
                <p class="chart-caption">Les deux zones simples d'un segment partagent la meme intensite</p>
                <div class="chart-meta-grid chart-meta-grid-2">
                    ${heatmapSummary.map(item => `
                        <div class="chart-meta-card">
                            <span class="chart-meta-label">${item.label}</span>
                            <span class="chart-meta-value compact">${item.value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    const renderStatsCardHtml = (stats, gameTypeLabel, gameTypeClass, primaryRateLabel, primaryRateValue, comparisonConfig) => {
        return `
            <div class="stats-card">
                <div class="stats-header">
                    <h3>Statistiques <span class="game-type-indicator ${gameTypeClass}">${gameTypeLabel}</span></h3>
                </div>

                <div class="stats-section">
                    <div class="stats-grid">
                        <div class="stat">
                            <div class="stat-label">Matchs</div>
                            <div class="stat-value">${stats.matchesInfo}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">${primaryRateLabel}</div>
                            <div class="stat-value">${primaryRateValue}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Moy/volee</div>
                            <div class="stat-value">${stats.averageRoundScore}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Finish %</div>
                            <div class="stat-value">${stats.finishDoubleSuccessRate}%</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">180s</div>
                            <div class="stat-value">${stats.total180s}</div>
                        </div>
                        <div class="stat">
                            <div class="stat-label">Volees invalides</div>
                            <div class="stat-value">${stats.invalidRoundRate}%</div>
                            <div class="stat-subvalue">${stats.invalidRounds}/${stats.totalRoundsPlayed}</div>
                        </div>
                    </div>
                </div>

                <div class="stats-section">
                    <h4>Checkout max</h4>
                    <div class="best-score">
                        <span class="score-value">${stats.bestFinishingScore}</span>
                        <span class="score-label">pts</span>
                    </div>
                </div>

                <div class="stats-section">
                    <h4>Meilleure volee</h4>
                    ${renderBestRoundHtml(stats.bestRound)}
                </div>

                <div class="stats-section">
                    <h4>Top 5 volees</h4>
                    ${renderTopRoundsHtml(stats.topRounds)}
                </div>

                <div class="stats-section">
                    <h4>Top 5 finishes</h4>
                    ${renderTopFinishesHtml(stats.topFinishes)}
                </div>

                <div class="stats-section">
                    <h4>Forme recente</h4>
                    ${renderRecentAverageHtml(stats.recentAverage)}
                </div>

                <div class="stats-section">
                    <h4>Progression recente</h4>
                    ${renderRecentTrendChartHtml(stats.recentTrend)}
                </div>

                <div class="stats-section">
                    <h4>${comparisonConfig.sectionTitle}</h4>
                    ${renderOutcomeAveragesHtml(stats.outcomeAverages, comparisonConfig)}
                </div>

                <div class="stats-section">
                    <h4>Demarrage et regularite</h4>
                    ${renderPerformanceSnapshotHtml(stats.firstNineAverage, stats.regularity)}
                </div>

                <div class="stats-section">
                    <h4>Checkout moyen</h4>
                    ${renderCheckoutAverageHtml(stats.checkoutAverage)}
                </div>

                <div class="stats-section">
                    <h4>Zones de finish</h4>
                    ${renderBarChartSvg([
                        { label: '2-40', value: stats.finishZoneBreakdown?.zone2To40 || 0 },
                        { label: '41-80', value: stats.finishZoneBreakdown?.zone41To80 || 0 },
                        { label: '81-120', value: stats.finishZoneBreakdown?.zone81To120 || 0 },
                        { label: '121-170', value: stats.finishZoneBreakdown?.zone121To170 || 0 }
                    ], 'Repartition des checkouts par zone')}
                    ${renderFinishZoneBreakdownHtml(stats.finishZoneBreakdown)}
                </div>

                <div class="stats-section">
                    <h4>Grosses volees</h4>
                    ${renderBarChartSvg([
                        { label: '100+', value: stats.highScoreRounds?.score100Plus || 0 },
                        { label: '140+', value: stats.highScoreRounds?.score140Plus || 0 },
                        { label: '160+', value: stats.highScoreRounds?.score160Plus || 0 },
                        { label: '180', value: stats.highScoreRounds?.score180 || 0, highlight: true }
                    ], 'Repartition des grosses volees')}
                    ${renderHighScoreBreakdownHtml(stats.highScoreRounds)}
                </div>

                <div class="stats-section">
                    <h4>Top 5 coups</h4>
                    ${renderTopThrowsHtml(stats.topThrows)}
                </div>

                <div class="stats-section">
                    <h4>Double prefere</h4>
                    ${renderPreferredDoubleHtml(stats.preferredFinishingDouble)}
                </div>

                <div class="stats-section">
                    <h4>Profil de lancers</h4>
                    ${renderThrowTypeBreakdownHtml(stats.throwTypeBreakdown)}
                </div>

                <div class="stats-section">
                    <h4>Heatmap cible</h4>
                    ${renderTargetHeatmapHtml(stats.targetHeatmap)}
                </div>

                <div class="stats-section">
                    <h4>Bust par zone de finish</h4>
                    ${renderFinishZoneBustRatesHtml(stats.finishZoneBustRates)}
                </div>
            </div>
        `;
    };

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

        container.innerHTML = renderStatsCardHtml(
            stats,
            gameTypeLabel,
            gameTypeClass,
            'Taux victoire',
            `${stats.winRate}%`,
            {
                sectionTitle: 'Victoires vs defaites',
                primaryKey: 'wins',
                primaryLabel: 'Victoires',
                secondaryKey: 'losses',
                secondaryLabel: 'Defaites'
            }
        );
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

        container.innerHTML = renderStatsCardHtml(
            stats,
            gameTypeLabel,
            gameTypeClass,
            'Taux finish',
            `${stats.finishRate}%`,
            {
                sectionTitle: 'Finies vs inachevees',
                primaryKey: 'finished',
                primaryLabel: 'Finies',
                secondaryKey: 'unfinished',
                secondaryLabel: 'Inachevees'
            }
        );
    };

    /**
     * Met à jour et affiche la suggestion de finition
     */
    const updateFinishSuggestion = (playerId, currentScore, maxDarts = 3) => {
        const suggestionEl = document.getElementById('finishSuggestion');

        if (!suggestionEl) return;

        // Score > 170 ne peut pas être fini en une volée
        if (maxDarts < 1 || currentScore > 170 || currentScore < 2) {
            suggestionEl.style.display = 'none';
            return;
        }

        const suggestion = Finishes.getFinishSuggestion(currentScore, playerId, maxDarts);

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
        setThrowsFormEnabled,
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
