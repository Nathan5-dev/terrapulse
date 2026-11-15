/*
 * TerraPulse - composition root (Presentation).
 * Seul fichier qui connaît toutes les couches et assemble l'application.
 * Scripts classiques (pas de modules ES), données locales avec actualisation API.
 */
(function (global) {
    'use strict';

    function demarrer() {
        const TP = global.TerraPulse;
        const { core, data, presentation } = TP;

        const i18n = presentation.i18nFactory.creerI18n(TP.i18nDictionaries);
        const formatter = presentation.formatterFactory.creerFormateur(i18n);
        const theme = presentation.theme;
        const dom = presentation.dom;
        const badges = presentation.badgesFactory.creerBadges(i18n, theme);

        const sources = presentation.sourcesView.creerVueSources({
            i18n, config: core.config, theme, dom,
        });
        const graphiques = presentation.chartsView.creerVueGraphiques({
            i18n, formatter, theme, config: core.config, dom,
        });
        const interpretations = presentation.interpretationView.creerVueInterpretations({
            i18n, formatter, theme, config: core.config, dom,
        });
        const diagnostic = presentation.diagnosticView.creerVueDiagnostic({
            i18n, config: core.config, badges, dom,
        });
        const tableaux = presentation.tablesView.creerVueTableaux({
            i18n, formatter, config: core.config, badges, dom,
        });
        const filtres = presentation.filtersView.creerVueFiltres({ i18n, dom });

        const fondDeCarte = presentation.basemap.creerFondDeCarte({ i18n });
        const carte = presentation.mapView.creerVueCarte({
            i18n, formatter, theme, core, dom, fondDeCarte,
        });
        const panneauxCarte = presentation.mapPanels.creerPanneauxCarte({
            i18n, formatter, dom,
        });

        const exportation = presentation.exportView.creerVueExport({
            i18n, config: core.config, core, serializer: data.exportSerializer, sources, dom,
        });

        const datasetRepository = data.nasaDatasetRepository.creerDepotDonneesNasa(
            global.TERRAPULSE_DATA);
        const csvRepository = data.csvDatasetRepository.creerDepotCsv();

        const controleur = presentation.appController.creerControleur({
            i18n, config: core.config, core, theme,
            datasetRepository, csvRepository,
            filtres, sources, graphiques, interpretations, diagnostic, tableaux,
            carte, panneauxCarte, exportation, dom,
        });

        controleur.demarrer();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', demarrer);
    } else {
        demarrer();
    }
})(window);
