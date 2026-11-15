/*
 * TerraPulse - textes fixes, badge de source et pied de page (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerVueSources(options) {
        const { i18n, config, theme, dom } = options;
        const { VAR_KEYS } = config;
        let csvInfo = null;

        function appliquerTextes() {
            document.documentElement.lang = i18n.getLangue();
            document.querySelectorAll('[data-i18n]').forEach(e => {
                e.textContent = i18n.t(e.dataset.i18n);
            });
            document.querySelectorAll('.tp-lang').forEach(b => {
                b.setAttribute('aria-pressed', String(b.dataset.lang === i18n.getLangue()));
            });
        }

        function rendreStatut() {
            dom.$('csvStatus').textContent = !csvInfo
                ? i18n.t('csv.hint')
                : csvInfo.error
                    ? i18n.t('csv.bad')
                    : i18n.t('csv.ok', { n: csvInfo.count, f: csvInfo.file });
        }

        function libelleSource(dataset, k) {
            return dataset.csvFile
                ? i18n.t('src.csv', { f: dataset.csvFile })
                : i18n.t('src.' + k);
        }

        function libellesSources(dataset) {
            const res = {};
            for (const k of VAR_KEYS) res[k] = libelleSource(dataset, k);
            return res;
        }

        function rendre(dataset) {
            const aDonnees = TP.core.dataset.aDesDonnees(dataset);

            dom.$('sourceBadge').textContent = !aDonnees
                ? i18n.t('badge.none')
                : dataset.csvFile
                    ? i18n.t('badge.csv', { f: dataset.csvFile })
                    : 'NASA POWER (MERRA-2) + MODIS MOD13Q1';

            const liste = dom.$('sourcesList');
            dom.vider(liste);
            if (aDonnees) {
                for (const k of VAR_KEYS) {
                    const li = dom.el('li');
                    const sw = dom.el('span', 'tp-swatch');
                    sw.style.background = theme.CHART_BINDINGS[k].color;
                    li.append(
                        sw,
                        dom.el('strong', 'text-slate-100',
                            i18n.t('var.' + k) + (i18n.getLangue() === 'fr' ? ' : ' : ': ')),
                        document.createTextNode(libelleSource(dataset, k)),
                    );
                    liste.append(li);
                }
            }

            rendreStatut();

            dom.$('footer').textContent = 'TERRAPULSE • NASA Space Apps Challenge 2026 • Kivu EarthLab' +
                (dataset && dataset.meta ? i18n.t('footer.dl', { d: dataset.meta.genere_le }) : '');
        }

        function statutCsv(count, fichier) {
            csvInfo = count ? { count, file: fichier } : { error: true };
            rendreStatut();
        }

        return { appliquerTextes, rendre, libelleSource, libellesSources, statutCsv };
    }

    TP.presentation.sourcesView = { creerVueSources };
})(window);
