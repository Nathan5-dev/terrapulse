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

        function justifier(doc, lignes, x, y, largeur, interligne) {
            lignes.forEach((texte, index) => {
                const derniere = index === lignes.length - 1;
                if (derniere || texte.trim().length < 3) {
                    doc.text(texte, x, y + index * interligne);
                    return;
                }
                const mots = texte.trim().split(/\s+/);
                const largeurMots = mots.reduce((total, mot) => total + doc.getTextWidth(mot), 0);
                const espacementMots = (largeur - largeurMots) / Math.max(1, mots.length - 1);
                let curseur = x;
                mots.forEach((mot, i) => {
                    doc.text(mot, curseur, y + index * interligne);
                    curseur += doc.getTextWidth(mot) + (i < mots.length - 1 ? espacementMots : 0);
                });
            });
        }

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
            const largeurTexte = largeur - marge * 2;
            const espacement = 6;
            let y = 18;
            const sauterPageSiBesoin = hauteurBloc => {
                if (y + hauteurBloc > hauteur - marge) { doc.addPage(); y = marge; }
            };
            const titre = i18n.getLangue() === 'fr' ? 'Rapport TerraPulse — Bukavu' : 'TerraPulse report — Bukavu';
            const ligne = i18n.t('export.line2', {
                zone: rapport.meta.zone, a: rapport.meta.periode[0], b: rapport.meta.periode[1],
                g: i18n.t('gran.' + rapport.meta.pas_de_temps),
            });

            doc.setFont('times', 'bold');
            doc.setFontSize(16);
            doc.text(titre, marge, 18);
            y += espacement;
            doc.setFont('times', 'normal');
            doc.setFontSize(12);
            doc.text(doc.splitTextToSize(ligne, largeurTexte), marge, y);
            y += espacement;
            doc.text(`${rapport.observations.length} observations · ${rapport.previsions.length} ${i18n.getLangue() === 'fr' ? 'prévisions' : 'forecasts'}`, marge, y);
            y += espacement;

            const graphiques = [
                { canvas: dom.$('chartRain'), titre: 'chart.precipitation', details: 'interpRain' },
                { canvas: dom.$('chartHum'), titre: 'chart.humidity', details: 'interpHum' },
                { canvas: dom.$('chartNdvi'), titre: 'chart.ndvi', details: 'interpNdvi' },
            ];
            for (const graphique of graphiques) {
                const { canvas } = graphique;
                const titre = i18n.t(graphique.titre);
                const paragraphes = [...dom.$(graphique.details).querySelectorAll('p')]
                    .map(p => p.innerText || p.textContent)
                    .map(texte => texte.replace(/\s+/g, ' ').trim())
                    .filter(Boolean);
                const textes = paragraphes.length ? paragraphes : [i18n.t('interp.empty')];
                doc.setFont('times', 'bold');
                doc.setFontSize(14);
                const lignesTitre = doc.splitTextToSize(titre, largeurTexte);
                sauterPageSiBesoin(lignesTitre.length * espacement + 4);
                doc.text(lignesTitre, marge, y);
                y += lignesTitre.length * espacement;
                const image = canvas.toDataURL('image/png', 1);
                const w = largeurTexte, h = Math.min(w * canvas.height / canvas.width, 55);
                sauterPageSiBesoin(h + espacement);
                doc.addImage(image, 'PNG', marge, y, w, h);
                y += h + espacement;
                doc.setFont('times', 'normal');
                doc.setFontSize(12);
                for (const texte of textes) {
                    const lignes = doc.splitTextToSize(texte, largeurTexte);
                    const blocH = lignes.length * espacement;
                    sauterPageSiBesoin(blocH);
                    justifier(doc, lignes, marge, y, largeurTexte, espacement);
                    y += blocH + espacement;
                }
            }

            const carte = dom.$('carte');
            if (carte && global.html2canvas) {
                try {
                    const imageCarte = await global.html2canvas(carte, { useCORS: true, backgroundColor: '#fff', scale: 1.5 });
                    const w = largeurTexte, h = Math.min(w * imageCarte.height / imageCarte.width, 90);
                    doc.setFont('times', 'bold'); doc.setFontSize(14);
                    sauterPageSiBesoin(14 + h + espacement);
                    doc.text(i18n.t('map.title'), marge, y);
                    y += espacement;
                    doc.addImage(imageCarte.toDataURL('image/png'), 'PNG', marge, y, w, h);
                    y += h + espacement;
                } catch (e) { /* la capture carte peut échouer si le fond bloque le canvas */ }
            }

            doc.addPage();
            y = 18;
            doc.setFont('times', 'bold'); doc.setFontSize(14);
            doc.text(i18n.t('export.title'), marge, y);
            y += espacement;
            doc.setFont('times', 'normal'); doc.setFontSize(12);
            const lignes = [
                ...(rapport.meta.sources ? Object.entries(rapport.meta.sources).map(([k, v]) => `${k}: ${v}`) : []),
                ...rapport.observations.map(o => `${o.periode} | ${o.precipitation_mm ?? '—'} mm | ${o.humidite_sol_pourcent ?? '—'} % | NDVI ${o.ndvi ?? '—'}`),
                ...rapport.previsions.map(o => `${o.periode} | ${o.precipitation_mm ?? '—'} mm | ${o.humidite_sol_pourcent ?? '—'} % | NDVI ${o.ndvi ?? '—'} | ${o.risque_glissement} | ${o.risque_erosion}`),
            ];
            for (const texte of lignes) {
                const retours = doc.splitTextToSize(texte, largeurTexte);
                const blocH = retours.length * espacement;
                sauterPageSiBesoin(blocH);
                justifier(doc, retours, marge, y, largeurTexte, espacement);
                y += blocH + espacement;
            }
            doc.save(nomFichier(rapport.meta, 'pdf'));
        }

        return { exporterCsv, exporterJson, exporterPdf };
    }

    TP.presentation.exportView = { creerVueExport };
})(window);
