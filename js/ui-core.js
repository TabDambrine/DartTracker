/**
 * UI Core Module
 * Fonctions UI pures sans logique métier
 * Gère uniquement l'affichage et les interactions de base
 */

const UICore = (() => {
    /**
     * Change l'écran actif
     * @param {string} screenId - ID de l'écran à afficher
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
     * @param {string} title - Titre du modal
     * @param {string} message - Message à afficher
     * @returns {Promise<boolean>} - true si confirmé, false sinon
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
     * @param {string} title - Titre du modal
     * @param {string} message - Message à afficher
     * @returns {Promise<void>}
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
     * @param {string} message - Message d'erreur
     * @returns {Promise<void>}
     */
    const showError = (message) => {
        return showMessageModal('Erreur', message);
    };

    /**
     * Affiche un message de succès
     * @param {string} message - Message de succès
     * @returns {Promise<void>}
     */
    const showSuccess = (message) => {
        return showMessageModal('Succès', message);
    };

    /**
     * Affiche un message de volée invalide
     * @param {string} message - Message d'erreur
     */
    const showThrowError = (message) => {
        const errorElement = document.getElementById('throwError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 3000);
        }
    };

    /**
     * Efface le message d'erreur de volée
     */
    const clearThrowError = () => {
        const errorElement = document.getElementById('throwError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    };

    /**
     * Affiche les options de validation pour une volée invalide
     * @param {string} message - Message à afficher
     * @returns {Promise<string>} - 'valid' ou 'correct'
     */
    const showValidationOptions = (message) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('validationModal');
            document.getElementById('validationMessage').textContent = message;

            const handleValid = () => {
                cleanup();
                resolve('valid');
            };

            const handleCorrect = () => {
                cleanup();
                resolve('correct');
            };

            const cleanup = () => {
                modal.style.display = 'none';
                document.getElementById('btnValidateAnyway').removeEventListener('click', handleValid);
                document.getElementById('btnCorrectThrow').removeEventListener('click', handleCorrect);
            };

            document.getElementById('btnValidateAnyway').addEventListener('click', handleValid);
            document.getElementById('btnCorrectThrow').addEventListener('click', handleCorrect);

            modal.style.display = 'flex';
        });
    };

    /**
     * Efface le formulaire de joueur
     */
    const clearPlayerForm = () => {
        document.getElementById('playerNameInput').value = '';
    };

    /**
     * Met à jour le formulaire de volée
     * @param {boolean} showFinishButtons - Si vrai, affiche les boutons de finish
     */
    const updateThrowsForm = (showFinishButtons = false) => {
        // Réinitialiser le formulaire
        document.getElementById('throwsForm').reset();
        
        // Masquer les boutons de finish par défaut
        document.getElementById('btnSubmitThrows').style.display = 'block';
        document.getElementById('btnSubmitPartialFinish').style.display = 'none';
        
        if (showFinishButtons) {
            document.getElementById('btnSubmitPartialFinish').style.display = 'block';
        }
        
        clearThrowError();
        ThrowsInput.reset();
    };

    /**
     * Obtient les fléchettes du formulaire
     * @returns {Array} - Tableau d'objets {segment, multiplier}
     */
    const getThrowsFromForm = () => {
        return ThrowsInput.getState()
            .filter(t => t.segment !== null)
            .map(t => ({ segment: t.segment, multiplier: t.multiplier }));
    };

    return {
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
        getThrowsFromForm
    };
})();
