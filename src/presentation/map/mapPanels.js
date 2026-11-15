/*
 * TerraPulse - tableaux et sources de la carte (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerPanneauxCarte(options) {
        const { i18n, formatter, dom } = options;
        const { fmt, pct } = formatter;
        const { el } = dom;

        function rendre(C) {
            if (!C) return;

            const table = dom.$('communesTable');
            dom.vider(table);

            const trh = el('tr');
            i18n.t('map.cols').forEach(c => trh.append(el('th', '', c)));
            const thead = el('thead');
            thead.append(trh);

            const tbody = el('tbody');
            for (const com of C.communes || []) {
                const s = com.stats, tr = el('tr');
                tr.append(
                    el('td', 'font-semibold', com.nom),
                    el('td', '', fmt(s.surface_km2, 1) + ' km²'),
                    el('td', '', s.surface_commune_km2
                        ? pct(Math.min(1, s.surface_km2 / s.surface_commune_km2)) : '—'),
                    el('td', '', fmt(s.pente_moyenne, 1) + '°'),
                    el('td', '', pct(s.part_pente_sup_15)),
                    el('td', '', fmt(s.ndvi_moyen, 2)),
                    el('td', '', fmt(s.indice_moyen, 2)),
                    el('td', '', pct(s.part_indice_sup_04)),
                );
                tbody.append(tr);
            }
            table.append(thead, tbody);

            const F = C.formule;
            dom.$('carteNote').textContent = i18n.t('map.note', {
                p: fmt(F.pente_ref, 0),
                d: fmt(F.ndvi_dense, 2),
                nu: fmt(F.ndvi_nu, 2),
            });

            const ul = dom.$('carteSources');
            dom.vider(ul);
            for (const cle of ['pente', 'ndvi', 'communes']) {
                const li = el('li');
                li.append(
                    el('strong', 'text-slate-300',
                        i18n.t(`map.src.${cle}.label`) + (i18n.getLangue() === 'fr' ? ' : ' : ': ')),
                    document.createTextNode(i18n.t('map.src.' + cle)),
                );
                ul.append(li);
            }
        }

        return { rendre };
    }

    TP.presentation.mapPanels = { creerPanneauxCarte };
})(window);
