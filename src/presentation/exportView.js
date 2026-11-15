/*
 * TerraPulse - exports CSV / JSON (Presentation).
 * Le rapport vient du domaine, la sérialisation de la couche Data,
 * le téléchargement est un détail navigateur.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerVueExport(options) {
        const { i18n, config, core, serializer, sources, dom } = options;
        const { VAR_KEYS } = config;

        function construireRapport(tableau, dataset, date) {
            return core.report.construireRapport({
                tableau,
                sources: sources.libellesSources(dataset),
                niveaux: i18n.t('export.levels'),
                zone: i18n.t('export.zone'),
                modele: i18n.t('export.model'),
                langue: i18n.getLangue(),
                date,
            });
        }

        function nomFichier(meta, extension) {
            return `terrapulse_bukavu_${meta.pas_de_temps}_${meta.periode[0]}_${meta.periode[1]}.${extension}`;
        }

        function exporterCsv(tableau, dataset) {
            if (!tableau) return;
            const rapport = construireRapport(tableau, dataset, core.dates.aujourdHui());
            const M = rapport.meta;

            const entete = [
                `${M.application} - ${i18n.t('export.head', { d: M.exporte_le })}`,
                i18n.t('export.line2', {
                    zone: M.zone,
                    a: M.periode[0],
                    b: M.periode[1],
                    g: i18n.t('gran.' + M.pas_de_temps),
                }),
                ...VAR_KEYS.map(k => i18n.t('export.source', {
                    v: i18n.t('var.' + k),
                    s: M.sources[k],
                })),
                i18n.t('export.thr', {
                    p: M.seuils.pluie_mm_par_mois,
                    h: M.seuils.humidite_pourcent,
                    n: M.seuils.ndvi,
                }),
                i18n.t('export.fc', { t: M.previsions }),
            ];

            dom.telecharger(
                nomFichier(M, 'csv'),
                serializer.serialiserCsv(rapport, entete),
                'text/csv;charset=utf-8',
            );
        }

        function exporterJson(tableau, dataset) {
            if (!tableau) return;
            const rapport = construireRapport(tableau, dataset, core.dates.aujourdHui());
            dom.telecharger(
                nomFichier(rapport.meta, 'json'),
                serializer.serialiserJson(rapport),
                'application/json',
            );
        }

        return { exporterCsv, exporterJson };
    }

    TP.presentation.exportView = { creerVueExport };
})(window);
