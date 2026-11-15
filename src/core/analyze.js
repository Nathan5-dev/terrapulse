/*
 * TerraPulse - analyse d'une série observée (Domain/Core).
 * Produit des valeurs brutes ; la mise en mots appartient à la présentation.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const FAMILLES = { precipitation: 'rain', humidity: 'hum', ndvi: 'ndvi' };

    /*
     * serie   : Map(clé -> valeur)
     * modele  : modèle renvoyé par apprendre() (ou null)
     * seuil   : seuil critique de la variable
     */
    function analyser(varKey, serie, modele, seuil) {
        const lignes = [...serie];
        if (!lignes.length) return null;

        const vals = lignes.map(l => l[1]);
        const n = vals.length;
        const moyenne = vals.reduce((a, b) => a + b, 0) / n;
        const iMax = vals.indexOf(Math.max(...vals));
        const iMin = vals.indexOf(Math.min(...vals));
        const sous = varKey === 'ndvi';
        const hors = lignes.filter(l => sous ? l[1] < seuil : l[1] > seuil);
        const part = hors.length / n;

        return {
            count: n,
            mean: moyenne,
            max: vals[iMax],
            maxKey: lignes[iMax][0],
            min: vals[iMin],
            minKey: lignes[iMin][0],
            outsideCount: hors.length,
            outsideShare: part,
            lastOutsideKey: hors.length ? hors[hors.length - 1][0] : '',
            threshold: seuil,
            below: sous,
            family: FAMILLES[varKey],
            level: part >= 0.3 ? 'hi' : part > 0 ? 'mid' : 'none',
            model: modele,
        };
    }

    TP.core.analyze = { analyser };
})(window);
