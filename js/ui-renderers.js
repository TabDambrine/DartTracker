/**
 * UI Renderers Module
 * Fonctions de rendu pur sans logique métier
 * Reçoit des données déjà formatées et les affiche
 */

const UIRenderers = (() => {
    /**
     * Obtient le nom d'un joueur (ou "Joueur supprimé" si absent)
     * @param {string} playerId - ID du joueur
     * @returns {string} - Nom du joueur
     */
    const getPlayerName = (playerId) => {
        if (playerId === 'deleted_player') {
            return 'Joueur supprimé';
        }
        const player = Players.getById(playerId);
        return player ? player.name : 'Joueur supprimé';
    };

    /**
     * Rend la liste des joueurs
     * @param {Array} playersData - Tableau de données de joueurs formatées
     */
    const renderPlayersList = (playersData) => {
        const container = document.getElementById('playersList');
        
        if (playersData.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun joueur pour le moment</p>';
            return;
        }

        container.innerHTML = playersData.map(player => `
            <div class="player-item">
                <div class="player-info">
                    <h4>${player.name}</h4>
                    <small>${player.matchesInfo}</small>
                </div>
                <button class="btn btn-danger btn-small" data-delete="${player.id}">Supprimer</button>
            </div>
        `).join('');
    };

    /**
     * Rend les options de sélection de joueurs
     * @param {Array} players - Tableau de joueurs
     */
    const renderSelectPlayerOptions = (players) => {
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
     * Met à jour le tableau de scores
     * @param {Object} scoresData - Données de scores formatées
     */
    const updateScoresBoard = (scoresData) => {
        if (!scoresData) return;

        document.getElementById('player1NameDisplay').textContent = scoresData.player1.name;
        document.getElementById('player1Score').textContent = scoresData.player1.score;
        document.getElementById('player1Throws').textContent = scoresData.player1.throwsCount;

        if (!scoresData.isTraining) {
            document.getElementById('player2NameDisplay').textContent = scoresData.player2.name;
            document.getElementById('player2Score').textContent = scoresData.player2.score;
            document.getElementById('player2Throws').textContent = scoresData.player2.throwsCount;
        }

        // Afficher le tour courant et la limite
        const roundInfo = document.getElementById('roundInfo');
        if (roundInfo) {
            if (scoresData.isDNF) {
                roundInfo.textContent = '❌ DNF (Did Not Finish)';
            } else if (scoresData.roundLimit) {
                roundInfo.textContent = `Tour ${scoresData.currentRound} / ${scoresData.roundLimit}`;
            } else {
                roundInfo.textContent = `Tour ${scoresData.currentRound}`;
            }
        }
    };

    /**
     * Met à jour l'historique des volées
     * @param {Array} throwsHistory - Historique des volées formaté
     */
    const updateThrowsHistory = (throwsHistory) => {
        const container = document.getElementById('throwsHistory');
        
        if (!container) return;

        container.innerHTML = throwsHistory.map(throwItem => `
            <div class="throw-record ${throwItem.isValid ? '' : 'invalid'}">
                <div class="throw-header">
                    <span class="player-indicator">${throwItem.playerName}</span>
                    <span class="round-indicator">Tour ${throwItem.round}</span>
                    <span class="total-score">Total: ${throwItem.roundTotal}</span>
                    <span class="running-total">Restant: ${throwItem.runningTotal}</span>
                </div>
                <div class="throw-darts">
                    ${throwItem.darts.map(dart => `
                        <span class="dart ${dart.multiplier === 2 ? 'double' : dart.multiplier === 3 ? 'triple' : ''}">
                            ${formatDart(dart)}
                        </span>
                    `).join('')}
                </div>
                ${!throwItem.isValid ? `<div class="invalid-reason">${throwItem.reason}</div>` : ''}
            </div>
        `).join('');
    };

    /**
     * Formate une fléchette pour l'affichage
     * @param {Object} dart - Objet {segment, multiplier}
     * @returns {string} - Texte formaté
     */
    const formatDart = (dart) => {
        if (dart.segment === 0) return 'BULL';
        if (dart.segment === 25) return '25';
        
        const multiplierNames = {
            1: '',
            2: 'D',
            3: 'T'
        };
        
        return `${multiplierNames[dart.multiplier] || ''}${dart.segment}`;
    };

    /**
     * Rend la liste des matchs
     * @param {Array} matchesData - Tableau de matchs formatés
     */
    const renderMatchesList = (matchesData) => {
        const container = document.getElementById('matchesList');
        
        if (matchesData.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucun match joué pour le moment</p>';
            return;
        }

        container.innerHTML = matchesData.map(match => `
            <div class="match-item" data-match-id="${match.id}">
                <div class="match-header">
                    <span class="match-type">${match.gameType}</span>
                    <span class="match-date">${match.date}</span>
                </div>
                <div class="match-players">
                    ${match.players.join(' vs ')}
                </div>
                <div class="match-result">
                    ${match.winner ? `🏆 ${match.winner}` : match.isDNF ? '❌ DNF' : '⏳ En cours'}
                </div>
                <button class="btn btn-small" data-view="${match.id}">Voir</button>
            </div>
        `).join('');
    };

    /**
     * Rend le détail d'un match
     * @param {Object} matchDetail - Détails du match formatés
     */
    const renderMatchDetail = (matchDetail) => {
        const container = document.getElementById('matchDetailContainer');
        
        container.innerHTML = `
            <div class="match-detail-header">
                <h3>${matchDetail.gameType} Match</h3>
                <p>${matchDetail.date} - ${matchDetail.players.join(' vs ')}</p>
                <p class="match-result">${matchDetail.winner ? `🏆 Vainqueur: ${matchDetail.winner}` : matchDetail.isDNF ? '❌ DNF' : '⏳ En cours'}</p>
            </div>
            <div class="match-detail-throws">
                ${matchDetail.throws.map(throwItem => `
                    <div class="throw-record detail">
                        <div class="throw-header">
                            <span class="player-indicator">${throwItem.playerName}</span>
                            <span class="round-indicator">Tour ${throwItem.round}</span>
                            <span class="total-score">Total: ${throwItem.roundTotal}</span>
                            <span class="running-total">Restant: ${throwItem.runningTotal}</span>
                        </div>
                        <div class="throw-darts">
                            ${throwItem.darts.map(dart => `
                                <span class="dart ${dart.multiplier === 2 ? 'double' : dart.multiplier === 3 ? 'triple' : ''}">
                                    ${formatDart(dart)}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    };

    /**
     * Rend les statistiques
     * @param {Object} statsData - Données de statistiques formatées
     */
    const renderStats = (statsData) => {
        const container = document.getElementById('statsContainer');
        
        if (!statsData || !statsData.player) {
            container.innerHTML = '<p class="empty-state">Aucun joueur sélectionné</p>';
            return;
        }

        const player = statsData.player;
        const stats = statsData.displayStats;
        const byGameType = statsData.byGameType;

        container.innerHTML = `
            <div class="stats-header">
                <h3>Statistiques de ${player.name}</h3>
                <p>Membre depuis: ${new Date(player.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div class="stats-section">
                <h4>📊 Général</h4>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Matchs joués</div>
                        <div class="stat-value">${stats.matchesInfo}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Taux de victoire</div>
                        <div class="stat-value">${stats.winRate}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Moyenne par volée</div>
                        <div class="stat-value">${stats.averageRoundScore}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Meilleur finish</div>
                        <div class="stat-value">${stats.bestFinishingScore}</div>
                    </div>
                </div>
            </div>
            
            ${stats.preferredFinishingDouble ? `
            <div class="stats-section">
                <h4>🎯 Double Préféré</h4>
                <div class="double-stats">
                    <span class="double-name">Double ${stats.preferredFinishingDouble.segment === 0 ? 'BULL' : stats.preferredFinishingDouble.segment}</span>
                    <span class="double-stats">${stats.preferredFinishingDouble.count}x</span>
                    <span class="double-percentage">(${stats.preferredFinishingDouble.percentage.toFixed(1)}%)</span>
                </div>
            </div>
            ` : ''}
            
            <div class="stats-section">
                <h4>📈 Top 10 des fléchettes</h4>
                <div class="top-throws">
                    ${stats.topThrows.map((t, index) => `
                        <div class="top-throw">
                            <span class="rank">#${index + 1}</span>
                            <span class="throw-name">
                                ${t.multiplier === 2 ? 'D' : t.multiplier === 3 ? 'T' : ''}${t.segment}
                            </span>
                            <span class="throw-count">${t.count}x</span>
                            <span class="throw-percentage">(${t.percentage.toFixed(1)}%)</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="stats-section">
                <h4>🎮 Par type de jeu</h4>
                <div class="game-type-stats">
                    ${Object.entries(byGameType).map(([gameType, gameStats]) => `
                        <div class="game-type-stat">
                            <h5>${gameType}</h5>
                            <p>${gameStats.matchesInfo}</p>
                            <p>Moyenne: ${gameStats.averageRoundScore}</p>
                            <p>Taux de victoire: ${gameStats.winRate}%</p>
                            <p>Meilleur finish: ${gameStats.bestFinishingScore}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    /**
     * Affiche la suggestion de finish
     * @param {Object} suggestion - Suggestion de finish formatée
     */
    const showFinishSuggestion = (suggestion) => {
        const suggestionEl = document.getElementById('finishSuggestion');
        
        if (!suggestionEl || !suggestion) {
            if (suggestionEl) suggestionEl.style.display = 'none';
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
        getPlayerName,
        renderPlayersList,
        renderSelectPlayerOptions,
        updateScoresBoard,
        updateThrowsHistory,
        formatDart,
        renderMatchesList,
        renderMatchDetail,
        renderStats,
        showFinishSuggestion
    };
})();
