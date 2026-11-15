/*
 * TerraPulse - couche Domain/Core.
 * Configuration métier : aucune dépendance au DOM, à Leaflet ou à Chart.js.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const VARIABLES = {
        precipitation: { unite: 'mm', how: 'sum', dec: 1, min: 0, max: Infinity },
        humidity: { unite: '%', how: 'mean', dec: 1, min: 0, max: 100 },
        ndvi: { unite: '', how: 'mean', dec: 3, min: -1, max: 1 },
    };

    TP.core.config = {
        VARIABLES,
        VAR_KEYS: Object.keys(VARIABLES),
        // Demi-largeur de l'intervalle à 80 % (loi de Student, ~45 degrés de liberté).
        Z80: 1.30,
        // Il faut au moins deux cycles saisonniers pour apprendre un modèle.
        MIN_MOIS_MODELE: 24,
    };
})(window);
