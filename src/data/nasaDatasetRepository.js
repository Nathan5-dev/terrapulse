/*
 * TerraPulse - dépôt de données NASA (Data).
 * Adapte le fichier généré terrapulse_data.js au modèle du domaine.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.data = TP.data || {};

    const { utc, iso } = TP.core.dates;

    function creerDepotDonneesNasa(rawData) {
        return {
            load() {
                if (!rawData || !rawData.journalier || !rawData.journalier.debut) return null;

                const t0 = utc(rawData.journalier.debut);
                const versObservations = arr => (arr || [])
                    .map((v, i) => ({ d: iso(t0 + i * 864e5), v }))
                    .filter(o => o.v !== null);

                const observations = {
                    precipitation: versObservations(rawData.journalier.precipitation),
                    humidity: versObservations(rawData.journalier.humidity),
                    ndvi: (rawData.ndvi || []).map(([d, v]) => ({ d, v })),
                };

                return {
                    base: 'day',
                    observations,
                    meta: rawData.meta || null,
                    csvFile: null,
                    map: rawData.carte || null,
                };
            },

            mapData() {
                return (rawData && rawData.carte) || null;
            },
        };
    }

    TP.data.nasaDatasetRepository = { creerDepotDonneesNasa };
})(window);
