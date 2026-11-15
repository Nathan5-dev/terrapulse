/*
 * TerraPulse - dépôt de données NASA (Data).
 * Charge le jeu local puis remplace son contenu si le serveur l'a actualisé.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.data = TP.data || {};

    const { utc, iso } = TP.core.dates;

    function creerDepotDonneesNasa(initialData) {
        let rawData = initialData || null;
        let derniereCharge = null;
        function adapter() {
            if (!rawData || !rawData.journalier || !rawData.journalier.debut) return null;
            const t0 = utc(rawData.journalier.debut);
            const versObservations = arr => (arr || [])
                .map((v, i) => ({ d: iso(t0 + i * 864e5), v }))
                .filter(o => o.v !== null);
            return {
                base: 'day',
                observations: {
                    precipitation: versObservations(rawData.journalier.precipitation),
                    humidity: versObservations(rawData.journalier.humidity),
                    ndvi: (rawData.ndvi || []).map(([d, v]) => ({ d, v })),
                },
                meta: rawData.meta || null,
                csvFile: null,
                map: rawData.carte || null,
            };
        }
        return {
            load() { return adapter(); },
            async refresh() {
                let status = { updated: false, error: null };
                try {
                    const response = await global.fetch('/api/data', { cache: 'no-store' });
                    const result = await response.json();
                    if (!response.ok || !result.ok || !result.data) {
                        throw new Error(result.error || `${response.status} ${response.statusText}`);
                    }
                    if (result.data.carte && !Array.isArray(result.data.carte.indice)) {
                        throw new Error('Données cartographiques incomplètes');
                    }
                    rawData = result.data;
                    status = { updated: result.updated === true, error: null };
                } catch (error) {
                    status.error = error && error.message ? error.message : 'API indisponible';
                    if (!rawData) throw error;
                }
                derniereCharge = { ...status, dataset: adapter() };
                return derniereCharge;
            },

            lastRefresh() { return derniereCharge; },

            mapData() {
                return (rawData && rawData.carte) || null;
            },
        };
    }

    TP.data.nasaDatasetRepository = { creerDepotDonneesNasa };
})(window);
