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

        async function exporterPdf(tableau, dataset) {
            if (!tableau || !global.jspdf || !global.html2canvas) return;
            const rapport = construireRapport(tableau, dataset, core.dates.aujourdHui());
            const { jsPDF } = global.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const marge = 14, largeur = doc.internal.pageSize.getWidth();
            const hauteur = doc.internal.pageSize.getHeight();
            const titre = i18n.getLangue() === 'fr' ? 'Rapport TerraPulse — Bukavu' : 'TerraPulse report — Bukavu';
            const ligne = i18n.t('export.line2', {
                zone: rapport.meta.zone, a: rapport.meta.periode[0], b: rapport.meta.periode[1],
                g: i18n.t('gran.' + rapport.meta.pas_de_temps),
            });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text(titre, marge, 18);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(ligne, marge, 25);
            doc.text(`${rapport.observations.length} observations · ${rapport.previsions.length} ${i18n.getLangue() === 'fr' ? 'prévisions' : 'forecasts'}`, marge, 31);

            const graphiques = ['chartRain', 'chartHum', 'chartNdvi'].map(id => dom.$(id));
            let y = 38;
            for (const canvas of graphiques) {
                const image = canvas.toDataURL('image/png', 1);
                const w = largeur - marge * 2, h = Math.min(w * canvas.height / canvas.width, 62);
                if (y + h > hauteur - marge) { doc.addPage(); y = marge; }
                doc.addImage(image, 'PNG', marge, y, w, h);
                y += h + 5;
            }

            const carte = dom.$('carte');
            if (carte && global.html2canvas) {
                try {
                    const imageCarte = await global.html2canvas(carte, { useCORS: true, backgroundColor: '#fff', scale: 1.5 });
                    const w = largeur - marge * 2, h = Math.min(w * imageCarte.height / imageCarte.width, 90);
                    if (y + h > hauteur - marge) { doc.addPage(); y = marge; }
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
                    doc.text(i18n.t('map.title'), marge, y + 4);
                    doc.addImage(imageCarte.toDataURL('image/png'), 'PNG', marge, y + 7, w, h);
                    y += h + 12;
                } catch (e) { /* la capture carte peut échouer si le fond bloque le canvas */ }
            }

            doc.addPage();
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
            doc.text(i18n.t('export.title'), marge, 18);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            const lignes = [
                ...(rapport.meta.sources ? Object.entries(rapport.meta.sources).map(([k, v]) => `${k}: ${v}`) : []),
                ...rapport.observations.map(o => `${o.periode} | ${o.precipitation_mm ?? '—'} mm | ${o.humidite_sol_pourcent ?? '—'} % | NDVI ${o.ndvi ?? '—'}`),
                ...rapport.previsions.map(o => `${o.periode} | ${o.precipitation_mm ?? '—'} mm | ${o.humidite_sol_pourcent ?? '—'} % | NDVI ${o.ndvi ?? '—'} | ${o.risque_glissement} | ${o.risque_erosion}`),
            ];
            y = 24;
            for (const texte of lignes) {
                const retours = doc.splitTextToSize(texte, largeur - marge * 2);
                const blocH = retours.length * 4;
                if (y + blocH > hauteur - marge) { doc.addPage(); y = marge; }
                doc.text(retours, marge, y);
                y += blocH + 1;
            }
            doc.save(nomFichier(rapport.meta, 'pdf'));
        }

        return { exporterCsv, exporterJson, exporterPdf };
    }

    TP.presentation.exportView = { creerVueExport };
})(window);
