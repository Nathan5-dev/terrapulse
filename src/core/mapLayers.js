/*
 * TerraPulse - découpage des couches cartographiques (Domain/Core).
 * Seuils métier uniquement : les couleurs appartiennent à la présentation.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const COUCHES = {
        indice: { bornes: [0.2, 0.4, 0.6, 0.8] },
        pente: { bornes: [5, 10, 15, 25] },
        ndvi: { bornes: [0.3, 0.4, 0.5, 0.6] },
    };

    function classeDe(couche, valeur) {
        const bornes = COUCHES[couche].bornes;
        let i = 0;
        while (i < bornes.length && valeur >= bornes[i]) i++;
        return i;
    }

    TP.core.mapLayers = { COUCHES, classeDe };
})(window);
