/**
 * Export/Import Module
 * Gère l'export et l'import des données via fichiers JSON
 */

const ExportImport = (() => {
    const APP_NAME = 'DartStatsTracker';
    const EXPORT_VERSION = '1.0.0';

    /**
     * Exporte toutes les données (joueurs et matchs) en JSON
     */
    const exportData = () => {
        const players = Storage.getPlayers();
        const matches = Storage.getMatches();
        const appVersion = Storage.get(Storage.KEYS.APP_VERSION);

        const exportData = {
            version: EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            appVersion: appVersion,
            data: {
                players: players,
                matches: matches
            }
        };

        return exportData;
    };

    /**
     * Génère un fichier JSON à télécharger
     */
    const downloadJSON = (data, filename) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    /**
     * Exporte et télécharge les données
     */
    const exportToFile = () => {
        try {
            const data = exportData();
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${APP_NAME}_export_${timestamp}.json`;
            downloadJSON(data, filename);
            return { success: true, message: 'Export réussi' };
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            return { success: false, message: `Erreur lors de l'export: ${error.message}` };
        }
    };

    /**
     * Lit un fichier JSON uploadé
     */
    const readFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Fichier JSON invalide'));
                }
            };
            reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
            reader.readAsText(file);
        });
    };

    /**
     * Valide les données importées
     */
    const validateImportData = (data) => {
        if (!data) {
            return { valid: false, message: 'Aucune donnée à importer' };
        }

        if (!data.data) {
            return { valid: false, message: 'Format de fichier invalide: données manquantes' };
        }

        if (!Array.isArray(data.data.players) || !Array.isArray(data.data.matches)) {
            return { valid: false, message: 'Format de fichier invalide: joueurs ou matchs manquants' };
        }

        // Vérifier la version si présente
        if (data.version && data.version !== EXPORT_VERSION) {
            console.warn(`Version du fichier: ${data.version}, version attendue: ${EXPORT_VERSION}`);
        }

        return { valid: true, message: 'Données valides' };
    };

    /**
     * Importe les données depuis un fichier JSON
     */
    const importFromFile = async (file) => {
        try {
            const data = await readFile(file);
            const validation = validateImportData(data);
            
            if (!validation.valid) {
                return { success: false, message: validation.message };
            }

            // Sauvegarder les données
            Storage.set(Storage.KEYS.PLAYERS, data.data.players);
            Storage.set(Storage.KEYS.MATCHES, data.data.matches);

            // Mettre à jour la version de l'app si présente
            if (data.appVersion) {
                Storage.set(Storage.KEYS.APP_VERSION, data.appVersion);
            }

            return { 
                success: true, 
                message: `Import réussi: ${data.data.players.length} joueurs et ${data.data.matches.length} matchs importés`,
                playersCount: data.data.players.length,
                matchesCount: data.data.matches.length
            };
        } catch (error) {
            console.error('Erreur lors de l\'import:', error);
            return { success: false, message: `Erreur lors de l'import: ${error.message}` };
        }
    };

    /**
     * Crée un élément input file pour l'upload
     */
    const createFileInput = (accept, multiple = false) => {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.multiple = multiple;
            input.style.display = 'none';
            
            input.addEventListener('change', () => {
                if (input.files.length > 0) {
                    resolve(Array.from(input.files));
                } else {
                    resolve([]);
                }
                document.body.removeChild(input);
            });
            
            document.body.appendChild(input);
            input.click();
        });
    };

    /**
     * Ouvre le sélecteur de fichier pour l'import
     */
    const openImportDialog = async () => {
        const files = await createFileInput('.json');
        if (files.length === 0) {
            return { success: false, message: 'Aucun fichier sélectionné' };
        }
        return importFromFile(files[0]);
    };

    return {
        exportToFile,
        importFromFile,
        openImportDialog,
        exportData,
        validateImportData
    };
})();
