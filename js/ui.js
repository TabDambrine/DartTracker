/**
 * UI Module
 * Gère l'interface utilisateur
 */

const UI = (() => {
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

        document.getElementById('player1NameDisplay').textContent = player1.name;
        document.getElementById('player1Score').textContent = match.scores[0];
        document.getElementById('player1Throws').textContent = 
            `${Games.getPlayerThrows(0).length} volées`;

        document.getElementById('player2NameDisplay').textContent = player2.name;
        document.getElementById('player2Score').textContent = match.scores[1];
        document.getElementById('player2Throws').textContent = 
            `${Games.getPlayerThrows(1).length} volées`;

        // Highlighter le joueur actuel
        const activeClass = 'active';
        document.getElementById('player1ScoreBoard').classList.toggle(activeClass, match.currentPlayerIndex === 0);
        document.getElementById('player2ScoreBoard').classList.toggle(activeClass, match.currentPlayerIndex === 1);
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

        // Réinitialiser les sélecteurs de fléchettes
        resetThrowSelectors();

        // Focus sur le premier segment
        const firstSegmentSelect = document.querySelector('.throw-selector:nth-child(1) .segment-select');
        if (firstSegmentSelect) {
            firstSegmentSelect.focus();
        }
    };

    /**
     * Réinitialise les sélecteurs de fléchettes
     */
    const resetThrowSelectors = () => {
        document.querySelectorAll('.throw-selector').forEach(selector => {
            selector.querySelector('.segment-select').value = '20';
            selector.querySelector('.multiplier-select').value = '1';
            updateThrowDisplay(selector);
        });
        document.getElementById('throwError').style.display = 'none';
    };

    /**
     * Met à jour l'affichage d'une fléchette ET vérifie si on peut finir
     */
    const updateThrowDisplay = (selectorElement) => {
        const segment = parseInt(selectorElement.querySelector('.segment-select').value);
        const multiplierSelect = selectorElement.querySelector('.multiplier-select');
        let multiplier = parseInt(multiplierSelect.value);

        // Si MISS (-1), forcer le multiplicateur à 1 et désactiver
        if (segment === -1) {
            multiplier = 1;
            multiplierSelect.value = '1';
            multiplierSelect.disabled = true;
        } else {
            multiplierSelect.disabled = false;
        }

        const score = Rules.calculateScore({ segment, multiplier });
        const display = Rules.formatThrow({ segment, multiplier });

        selectorElement.querySelector('.throw-display').textContent = `${display}`;
        selectorElement.dataset.score = score;

        // Vérifier si on peut finir avec moins de 3 fléchettes
        checkForPartialFinish();
    };

    /**
     * Vérifie si une volée partielle peut finir le match
     */
    const checkForPartialFinish = () => {
        const match = Games.getCurrentMatch();
        if (!match) return;

        const playerIndex = match.currentPlayerIndex;
        const currentScore = match.scores[playerIndex];

        // Collecter les fléchettes remplies
        const throws = [];
        const selectors = document.querySelectorAll('.throw-selector');

        for (let selector of selectors) {
            const segment = parseInt(selector.querySelector('.segment-select').value);
            const multiplier = parseInt(selector.querySelector('.multiplier-select').value);

            throws.push({ segment, multiplier });

            // Vérifier la validation partielle
            const validation = Rules.validatePartialFinish(match.gameType, currentScore, throws);

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
     * Récupère les 3 fléchettes du formulaire
     */
    const getThrowsFromForm = () => {
        const throws = [];
        document.querySelectorAll('.throw-selector').forEach((selector, index) => {
            const segment = parseInt(selector.querySelector('.segment-select').value);
            const multiplier = parseInt(selector.querySelector('.multiplier-select').value);
            throws.push({ segment, multiplier });
        });
        return throws;
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
            const player1 = Players.getById(match.playerIds[0]);
            const player2 = Players.getById(match.playerIds[1]);
            const winner = Players.getById(match.winner);
            const date = new Date(match.startDate).toLocaleDateString('fr-FR');

            return `
                <div class="match-item" data-match-id="${match.id}">
                    <div class="match-info">
                        <div class="match-players">
                            <span class="player ${match.winner === player1.id ? 'winner' : ''}">
                                ${player1.name}
                            </span>
                            <span class="vs">VS</span>
                            <span class="player ${match.winner === player2.id ? 'winner' : ''}">
                                ${player2.name}
                            </span>
                        </div>
                        <div class="match-meta">
                            <span class="game-type">${match.gameType}</span>
                            <span class="date">${date}</span>
                            <span class="winner">Gagnant: ${winner.name}</span>
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

        const player1 = Players.getById(match.playerIds[0]);
        const player2 = Players.getById(match.playerIds[1]);
        const winner = Players.getById(match.winner);

        const container = document.getElementById('matchDetailContent');

        let throwsHtml = '';
        for (let i = 0; i < 2; i++) {
            const throws = match.throws.filter(t => t.playerIndex === i);
            throwsHtml += `<div class="player-throws">
                <h4>${Players.getById(match.playerIds[i]).name}</h4>`;

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
                <h3>${player1.name} VS ${player2.name}</h3>
                <p class="game-info">
                    Jeu: ${match.gameType} | 
                    Gagnant: <strong>${winner.name}</strong>
                </p>
                <div class="throws-detailed">
                    ${throwsHtml}
                </div>
            </div>
        `;
    };

    /**
     * Rend les statistiques
     */
    const renderStats = () => {
        const container = document.getElementById('statsList');
        const players = Players.getAll();

        if (players.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun joueur</p>';
            return;
        }

        container.innerHTML = players.map(player => {
            const formattedStats = Stats.getFormattedStats(player.id);
            if (!formattedStats) return '';

            const stats = formattedStats.displayStats;

            // Formater les coups préférés
            let topThrowsHtml = '<div class="top-throws">';
            if (stats.topThrows.length === 0) {
                topThrowsHtml += '<p class="no-data">Pas de données</p>';
            } else {
                topThrowsHtml += stats.topThrows.slice(0, 5).map((t, i) => {
                    const throwDisplay = Rules.formatThrow({ segment: t.segment, multiplier: t.multiplier });
                    return `<div class="throw-stat">
                        <span class="rank">${i + 1}.</span>
                        <span class="throw-name">${throwDisplay}</span>
                        <span class="count">${t.count}x (${t.percentage.toFixed(1)}%)</span>
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
                        <span class="double-stats">${stats.preferredFinishingDouble.count}x (${stats.preferredFinishingDouble.percentage.toFixed(1)}%)</span>
                    </div>
                `;
            } else {
                preferredDoubleHtml += '<p class="no-data">Pas de finish réalisé</p>';
            }
            preferredDoubleHtml += '</div>';

            return `
                <div class="stats-card detailed-stats">
                    <h3>${player.name}</h3>

                    <!-- Stats Basiques -->
                    <div class="stats-section">
                        <h4>Vue Synthétique</h4>
                        <div class="stats-grid">
                            <div class="stat">
                                <div class="stat-label">Matchs</div>
                                <div class="stat-value">${stats.matchesInfo}</div>
                            </div>
                            <div class="stat">
                                <div class="stat-label">Taux de victoire</div>
                                <div class="stat-value">${stats.winRate}%</div>
                            </div>
                            <div class="stat">
                                <div class="stat-label">Moyenne par volée</div>
                                <div class="stat-value">${stats.averageRoundScore} pts</div>
                            </div>
                            <div class="stat">
                                <div class="stat-label">Finish au double</div>
                                <div class="stat-value">${stats.finishDoubleSuccessRate}%</div>
                            </div>
                        </div>
                    </div>

                    <!-- Meilleur Score de Finish -->
                    <div class="stats-section">
                        <h4>🎯 Meilleur Score de Finish</h4>
                        <div class="best-score">
                            <span class="score-value">${stats.bestFinishingScore}</span>
                            <span class="score-label">points</span>
                        </div>
                    </div>

                    <!-- Top 5 Coups Préférés -->
                    <div class="stats-section">
                        <h4>📊 Top 5 Coups Préférés</h4>
                        ${topThrowsHtml}
                    </div>

                    <!-- Double Préféré pour Finish -->
                    <div class="stats-section">
                        <h4>🎯 Double Préféré pour Finish</h4>
                        ${preferredDoubleHtml}
                    </div>
                </div>
            `;
        }).join('');
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
        updateThrowDisplay,
        getThrowsFromForm,
        updateThrowsHistory,
        renderMatchesList,
        renderMatchDetail,
        renderStats
    };
})();
