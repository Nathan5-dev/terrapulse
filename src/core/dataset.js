/*
 * TerraPulse - lecture d'un jeu de données (Domain/Core).
 * Aucune dépendance à la provenance des données (NASA ou CSV).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const { VAR_KEYS } = TP.core.config;
    const { agreger } = TP.core.aggregate;
    const { quantile } = TP.core.stats;

    function aDesDonnees(dataset) {
        return !!dataset && VAR_KEYS.some(k => dataset.observations[k] && dataset.observations[k].length);
    }

    function bornes(dataset) {
        const toutes = VAR_KEYS.flatMap(k => (dataset.observations[k] || []).map(o => o.d)).sort();
        if (!toutes.length) return null;
        return {
            debut: dataset.base === 'month' ? toutes[0].slice(0, 8) + '01' : toutes[0],
            fin: toutes[toutes.length - 1],
        };
    }

    /*
     * Seuil d'humidité calibré sur les données : 80e centile des moyennes
     * mensuelles. Le seuil fixe de 75 % ne convient pas à la mesure MERRA-2.
     */
    function seuilHumiditeDefaut(dataset, debut, fin) {
        const mensuel = [...agreger(dataset.observations.humidity, 'humidity', 'month', debut, fin, dataset.base).values()];
        return (Math.round(quantile(mensuel, 0.8) * 2) / 2).toFixed(1);
    }

    TP.core.dataset = { aDesDonnees, bornes, seuilHumiditeDefaut };
})(window);
