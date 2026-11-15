/*
 * TerraPulse - formatage dépendant de la langue (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerFormateur(i18n) {
        const fmt = (v, dec) => (v === null || v === undefined || Number.isNaN(v)) ? '—'
            : v.toLocaleString(i18n.locale(), {
                minimumFractionDigits: dec,
                maximumFractionDigits: dec,
            });

        const pct = p => Math.round(p * 100) + (i18n.getLangue() === 'fr' ? ' %' : '%');

        return { fmt, pct };
    }

    TP.presentation.formatterFactory = { creerFormateur };
})(window);
