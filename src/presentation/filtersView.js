/*
 * TerraPulse - filtres de dates et de seuils (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    const IDS = ['startDate', 'endDate', 'granularity', 'forecastMonths', 'thrRain', 'thrHum', 'thrNdvi'];

    function creerVueFiltres(options) {
        const { i18n, dom } = options;

        function initialiser(dataset) {
            const bornes = TP.core.dataset.bornes(dataset);
            if (!bornes) return null;

            for (const id of ['startDate', 'endDate']) {
                dom.$(id).min = bornes.debut;
                dom.$(id).max = bornes.fin;
            }
            dom.$('startDate').value = bornes.debut;
            dom.$('endDate').value = bornes.fin;

            const g = dom.$('granularity');
            for (const o of g.options) {
                o.disabled = dataset.base === 'month' && (o.value === 'day' || o.value === 'week');
            }
            if (g.selectedOptions[0].disabled) g.value = 'month';

            return bornes;
        }

        function definirSeuilHumidite(valeur) {
            dom.$('thrHum').value = valeur;
        }

        function lire() {
            return {
                debut: dom.$('startDate').value,
                fin: dom.$('endDate').value,
                gran: dom.$('granularity').value,
                horizon: +dom.$('forecastMonths').value,
                seuils: {
                    pluie: +dom.$('thrRain').value,
                    hum: +dom.$('thrHum').value,
                    ndvi: +dom.$('thrNdvi').value,
                },
            };
        }

        function lier(handler) {
            for (const id of IDS) dom.$(id).addEventListener('change', handler);
        }

        function majNotes(base, gran) {
            dom.$('filterNote').textContent = i18n.t(
                gran === 'month' ? 'filter.note.month' : 'filter.note.other');
            dom.$('thrNote').textContent = i18n.t(
                base === 'day' ? 'thr.note.nasa' : 'thr.note.csv');
        }

        return { initialiser, definirSeuilHumidite, lire, lier, majNotes };
    }

    TP.presentation.filtersView = { creerVueFiltres };
})(window);
