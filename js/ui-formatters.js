/**
 * UI Formatters Module
 * Formate les données brutes pour le rendu
 * Contient la logique métier pour préparer les données
 */

const UIFormatters = (() => {
    /**
     * Formate la liste des joueurs pour le rendu
     * @returns {Array} - Tableau de joueurs formatés
     */
    const formatPlayersList = () => {
        const players = Players.getAll();
        return players.map(player => ({
            id: player.id,
            name: player.name,
            matchesInfo: `${player.stats.totalMatches} matchs - ${player.stats.wins} victoires`
        }));
    };

    /**
     * Formate les options de sélection de joueurs
     * @returns {Array} - Tableau de joueurs pour les selects
     */
    const formatPlayerOptions = () => {
        return Players.getAll();
    };

    /**
     * Formate les données du tableau de scores
     * @returns {Object} - Données de scores formatées
     */
    const formatScoresBoard = () => {
        const match = Games.getCurrentMatch();
        if (!match) return null;

        const player1 = Players.getById(match.playerIds[0]);
        const player2 = Players.getById(match.playerIds[1]);

        return {
            player1: {
                name: player1 ? player1.name : 'Joueur 1',
                score: match.scores[0],
                throwsCount: `${Games.getPlayerThrows(0).length} volées`
            },
            player2: match.isSelfPlay ? null : {
                name: player2 ? player2.name : 'Joueur 2',
                score: match.scores[1],
                throwsCount: `${Games.getPlayerThrows(1).length} volées`
            },
            isTraining: match.isSelfPlay,
            isDNF: match.isDNF,
            currentRound: match.currentRound,
            roundLimit: match.roundLimit
        };
    };

    /**
     * Formate l'historique des volées
     * @returns {Array} - Historique des volées formaté
     */
    const formatThrowsHistory = () => {
        const match = Games.getCurrentMatch();
        if (!match) return [];

        return match.throws.map(throwRecord => {
            const player = Players.getById(match.playerIds[throwRecord.playerIndex]);
            return {
                playerName: player ? player.name : `Joueur ${throwRecord.playerIndex + 1}`,
                round: throwRecord.round,
                roundTotal: throwRecord.roundTotal,
                runningTotal: throwRecord.runningTotal,
                isValid: throwRecord.isValid,
                reason: throwRecord.reason || '',
                darts: throwRecord.throw ? throwRecord.throw.map(dart => ({
                    segment: dart.segment,
                    multiplier: dart.multiplier
                })) : []
            };
        });
    };

    /**
     * Formate la liste des matchs
     * @returns {Array} - Tableau de matchs formatés
     */
    const formatMatchesList = () => {
        const matches = Games.getMatchHistory();
        
        return matches.map(match => {
            const player1 = Players.getById(match.playerIds[0]);
            const player2 = Players.getById(match.playerIds[1]);
            const winner = match.winner ? Players.getById(match.winner) : null;

            return {
                id: match.id,
                gameType: match.gameType,
                date: new Date(match.startDate).toLocaleDateString(),
                players: [
                    player1 ? player1.name : 'Joueur supprimé',
                    player2 ? player2.name : 'Joueur supprimé'
                ],
                winner: winner ? winner.name : null,
                isDNF: match.isDNF
            };
        });
    };

    /**
     * Formate le détail d'un match
     * @param {string} matchId - ID du match
     * @returns {Object} - Détails du match formatés
     */
    const formatMatchDetail = (matchId) => {
        const match = Games.getMatchById(matchId);
        if (!match) return null;

        const player1 = Players.getById(match.playerIds[0]);
        const player2 = Players.getById(match.playerIds[1]);
        const winner = match.winner ? Players.getById(match.winner) : null;

        return {
            gameType: match.gameType,
            date: new Date(match.startDate).toLocaleDateString(),
            players: [
                player1 ? player1.name : 'Joueur supprimé',
                player2 ? player2.name : 'Joueur supprimé'
            ],
            winner: winner ? winner.name : null,
            isDNF: match.isDNF,
            throws: match.throws.map(throwRecord => {
                const player = Players.getById(match.playerIds[throwRecord.playerIndex]);
                return {
                    playerName: player ? player.name : `Joueur ${throwRecord.playerIndex + 1}`,
                    round: throwRecord.round,
                    roundTotal: throwRecord.roundTotal,
                    runningTotal: throwRecord.runningTotal,
                    darts: throwRecord.throw ? throwRecord.throw.map(dart => ({
                        segment: dart.segment,
                        multiplier: dart.multiplier
                    })) : []
                };
            })
        };
    };

    /**
     * Formate les statistiques pour le rendu
     * @param {string} playerId - ID du joueur
     * @returns {Object} - Statistiques formatées
     */
    const formatStats = (playerId) => {
        const formattedStats = Stats.getFormattedStats(playerId);
        
        if (!formattedStats) {
            return null;
        }

        return {
            player: formattedStats.player,
            displayStats: formattedStats.displayStats,
            byGameType: formattedStats.byGameType
        };
    };

    /**
     * Formate la suggestion de finish
     * @param {number} currentScore - Score actuel
     * @param {string} playerId - ID du joueur
     * @returns {Object|null} - Suggestion de finish formatée
     */
    const formatFinishSuggestion = (currentScore, playerId) => {
        const suggestion = Finishes.getFinishSuggestion(currentScore, playerId);
        
        if (!suggestion) return null;

        return {
            formatted: suggestion.formatted,
            usedPreferredDouble: suggestion.usedPreferredDouble
        };
    };

    /**
     * Formate les stats d'entraînement
     * @param {string} playerId - ID du joueur
     * @returns {Object|null} - Stats d'entraînement formatées
     */
    const formatTrainingStats = (playerId) => {
        const formattedStats = Stats.getFormattedTrainingStats(playerId);
        
        if (!formattedStats) {
            return null;
        }

        return {
            player: formattedStats.player,
            displayStats: formattedStats.displayStats,
            byGameType: formattedStats.byGameType
        };
    };

    return {
        formatPlayersList,
        formatPlayerOptions,
        formatScoresBoard,
        formatThrowsHistory,
        formatMatchesList,
        formatMatchDetail,
        formatStats,
        formatTrainingStats,
        formatFinishSuggestion
    };
})();
