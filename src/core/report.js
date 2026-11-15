/*
 * TerraPulse - construction du rapport d'export (Domain/Core).
 * Le rapport est un objet de données pur ; sa sérialisation est dans Data.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const { VAR_KEYS } = TP.core.config;

    const arrondi = (v, dec) => (v === undefined || v === null) ? null : +v.toFixed(dec);

    /*
     * options :
     *   tableau   : résultat de construireTableauDeBord()
     *   sources   : { varKey: libellé traduit }
     *   niveaux   : libellés traduits des 3 niveaux de risque
     *   zone      : libellé traduit de la zone
     *   modele    : phrase traduite décrivant le modèle
     *   langue    : 'fr' | 'en'
     *   date      : date d'export ISO
     */
    function construireRapport(options) {
        const { tableau, sources, niveaux, zone, modele, langue, date } = options;
        const R = tableau;

        const observations = R.labelsObs.map(k => ({
            periode: k,
            precipitation_mm: arrondi(R.series.precipitation.get(k), 1),
            humidite_sol_pourcent: arrondi(R.series.humidity.get(k), 1),
            ndvi: arrondi(R.series.ndvi.get(k), 3),
        }));

        const previsions = R.prev.mois.map(m => ({
            periode: m.periode,
            precipitation_mm: arrondi(m.precipitation.mu, 1),
            precipitation_bas: arrondi(m.precipitation.bas, 1),
            precipitation_haut: arrondi(m.precipitation.haut, 1),
            humidite_sol_pourcent: arrondi(m.humidity.mu, 1),
            humidite_bas: arrondi(m.humidity.bas, 1),
            humidite_haut: arrondi(m.humidity.haut, 1),
            ndvi: arrondi(m.ndvi.mu, 3),
            ndvi_bas: arrondi(m.ndvi.bas, 3),
            ndvi_haut: arrondi(m.ndvi.haut, 3),
            proba_pluie_sup_seuil: arrondi(m.pPluie, 2),
            proba_humidite_sup_seuil: arrondi(m.pHum, 2),
            proba_ndvi_inf_seuil: arrondi(m.pNdvi, 2),
            risque_glissement: niveaux[m.glissement],
            risque_erosion: niveaux[m.erosion],
        }));

        const meta = {
            application: 'TERRAPULSE - Kivu EarthLab',
            exporte_le: date,
            langue,
            zone,
            periode: [R.debut, R.fin],
            pas_de_temps: R.gran,
            sources: Object.fromEntries(VAR_KEYS.map(k => [k, sources[k]])),
            seuils: {
                pluie_mm_par_mois: R.seuils.pluie,
                humidite_pourcent: R.seuils.hum,
                ndvi: R.seuils.ndvi,
            },
            previsions: modele,
        };

        return { meta, observations, previsions };
    }

    TP.core.report = { construireRapport };
})(window);
