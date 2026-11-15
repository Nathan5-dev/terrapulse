/*
 * TerraPulse - tableaux de prévision et d'observations (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerVueTableaux(options) {
        const { i18n, formatter, config, badges, dom } = options;
        const { VAR_KEYS, VARIABLES } = config;
        const { fmt, pct } = formatter;
        const { el } = dom;

        function rendrePrevision(prev) {
            const table = dom.$('forecastTable');
            dom.vider(table);
            dom.$('modelNote').textContent = prev.mois.length
                ? i18n.t('fc.note', { n: prev.modeles.precipitation.n })
                : '';
            if (!prev.mois.length) return;

            const thead = el('thead'), trh = el('tr');
            i18n.t('fc.cols').forEach(c => trh.append(el('th', '', c)));
            thead.append(trh);

            const tbody = el('tbody');
            for (const m of prev.mois) {
                const tr = el('tr');
                const cellule = k => {
                    const d = VARIABLES[k].dec === 3 ? 2 : 0;
                    return `${fmt(m[k].mu, d)} [${fmt(m[k].bas, d)} – ${fmt(m[k].haut, d)}]`;
                };
                tr.append(
                    el('td', 'font-semibold', m.periode),
                    el('td', '', cellule('precipitation')), el('td', '', pct(m.pPluie)),
                    el('td', '', cellule('humidity')), el('td', '', pct(m.pHum)),
                    el('td', '', cellule('ndvi')), el('td', '', pct(m.pNdvi)),
                );
                for (const k of ['glissement', 'erosion']) {
                    const td = el('td');
                    td.append(badges(m[k]));
                    tr.append(td);
                }
                tbody.append(tr);
            }
            table.append(thead, tbody);
        }

        function rendreObservations(labels, series, gran) {
            const table = dom.$('obsTable'), MAX = 400;
            dom.vider(table);

            const thead = el('thead'), trh = el('tr');
            i18n.t('obs.cols').forEach(c => trh.append(el('th', 'sticky top-0 bg-slate-800', c)));
            thead.append(trh);

            const tbody = el('tbody');
            for (const k of labels.slice(-MAX)) {
                const tr = el('tr');
                tr.append(el('td', '', k), ...VAR_KEYS.map(v =>
                    el('td', '', fmt(series[v].get(k), VARIABLES[v].dec))));
                tbody.append(tr);
            }
            table.append(thead, tbody);

            dom.$('obsTableNote').textContent = i18n.t(
                labels.length > MAX ? 'obs.note.max' : 'obs.note',
                { max: MAX, n: labels.length, g: i18n.t('gran.' + gran) },
            );
        }

        return { rendrePrevision, rendreObservations };
    }

    TP.presentation.tablesView = { creerVueTableaux };
})(window);
