/*
 * TerraPulse - cas d'utilisation principal (Domain/Core).
 * Transforme des filtres + un jeu de données en tout ce qu'affiche le tableau de bord.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const { VAR_KEYS } = TP.core.config;
    const { agreger } = TP.core.aggregate;
    const { prevoirTout } = TP.core.forecast;

    function construireTableauDeBord(options) {
        const { dataset, filtres } = options;
        let { debut, fin } = filtres;
        if (debut > fin) [debut, fin] = [fin, debut];

        const gran = filtres.gran;
        const horizon = filtres.horizon;
        const seuils = filtres.seuils;

        const series = {}, mensuel = {};
        for (const k of VAR_KEYS) {
            series[k] = agreger(dataset.observations[k], k, gran, debut, fin, dataset.base);
            mensuel[k] = gran === 'month'
                ? series[k]
                : agreger(dataset.observations[k], k, 'month', debut, fin, dataset.base);
        }

        const prev = prevoirTout(mensuel, horizon, seuils);
        const labelsObs = [...new Set(VAR_KEYS.flatMap(k => [...series[k].keys()]))].sort();
        const prevSurGraphe = gran === 'month' ? prev.mois : [];
        const labels = [...labelsObs, ...prevSurGraphe.map(m => m.periode)];
        const ndvi16 = (gran === 'day' || gran === 'week') && dataset.base === 'day';

        return {
            debut, fin, gran, horizon, seuils,
            series, mensuel, prev,
            labelsObs, prevSurGraphe, labels, ndvi16,
        };
    }

    TP.core.dashboard = { construireTableauDeBord };
})(window);
