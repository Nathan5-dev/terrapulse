/*
 * TerraPulse - dépôt CSV (Data).
 * Convertit un CSV mensuel importé en jeu de données du domaine.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.data = TP.data || {};

    const { VAR_KEYS } = TP.core.config;

    function creerDepotCsv() {
        return {
            /*
             * Retourne { dataset, count }. count vaut 0 si le format n'est pas reconnu.
             */
            parse(texte, nomFichier) {
                const lignes = String(texte)
                    .split(/\r?\n/)
                    .map(l => l.trim())
                    .filter(l => l && !l.startsWith('#'));

                const entete = lignes.findIndex(l => {
                    const bas = l.toLowerCase();
                    return bas.includes('date') && bas.includes('precipitation');
                });
                if (entete === -1) return { dataset: null, count: 0 };

                const observations = { precipitation: [], humidity: [], ndvi: [] };
                for (const ligne of lignes.slice(entete + 1)) {
                    const colonnes = ligne.split(',');
                    const date = (colonnes[0] || '').trim();
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
                    VAR_KEYS.forEach((k, i) => {
                        const v = parseFloat(colonnes[i + 1]);
                        if (!Number.isNaN(v)) observations[k].push({ d: date, v });
                    });
                }

                const count = observations.precipitation.length;
                if (!count) return { dataset: null, count: 0 };

                return {
                    count,
                    dataset: {
                        base: 'month',
                        observations,
                        meta: null,
                        csvFile: nomFichier,
                        map: null,
                    },
                };
            },
        };
    }

    TP.data.csvDatasetRepository = { creerDepotCsv };
})(window);
