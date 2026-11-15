/*
 * TerraPulse - contrôleur du tableau de bord (Presentation).
 * Il lit les filtres, appelle le cas d'utilisation du domaine et pilote les vues.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerControleur(options) {
        const {
            i18n, config, core, theme, datasetRepository, csvRepository,
            filtres, sources, graphiques, interpretations, diagnostic, tableaux,
            carte, panneauxCarte, exportation, dom,
        } = options;

        let dataset = null;
        let dernierRendu = null;
        let donneesCarte = null;
        let cartePrete = false;

        function demarrer() {
            i18n.setLangue(i18n.langueInitiale(
                global.location.hash, global.localStorage, global.navigator.language));
            appliquerTheme(lireTheme());

            donneesCarte = datasetRepository.mapData ? datasetRepository.mapData() : null;
            dataset = datasetRepository.load();

            lierEvenements();
            sources.appliquerTextes();
            if (core.dataset.aDesDonnees(dataset)) initialiserFiltres();
            sources.rendre(dataset);
            rendre();

            cartePrete = carte.initialiser(donneesCarte);
            if (cartePrete && donneesCarte) panneauxCarte.rendre(donneesCarte);
            majBoutonTheme();
        }

        function lireTheme() {
            try { return global.localStorage.getItem('terrapulse-theme') || 'dark'; }
            catch (e) { return 'dark'; }
        }

        function appliquerTheme(themeNom) {
            document.documentElement.dataset.theme = themeNom;
            theme.setMode(themeNom);
        }

        function majBoutonTheme() {
            const clair = document.documentElement.dataset.theme === 'light';
            const bouton = dom.$('btnTheme');
            const label = i18n.t(clair ? 'theme.dark' : 'theme.light');
            bouton.setAttribute('aria-pressed', String(clair));
            bouton.title = label;
            bouton.setAttribute('aria-label', label);
            dom.$('themeIcon').textContent = clair ? '🌙' : '☀️';
            dom.$('themeLabel').textContent = label;
        }

        function initialiserFiltres() {
            const bornes = filtres.initialiser(dataset);
            if (!bornes) return;
            filtres.definirSeuilHumidite(
                core.dataset.seuilHumiditeDefaut(dataset, bornes.debut, bornes.fin));
        }

        function rendre() {
            const aDonnees = core.dataset.aDesDonnees(dataset);
            dom.$('noData').classList.toggle('hidden', aDonnees);
            if (!aDonnees) {
                dernierRendu = null;
                return;
            }

            const f = filtres.lire();
            if (!f.debut || !f.fin) return;

            const tb = core.dashboard.construireTableauDeBord({ dataset, filtres: f });
            dernierRendu = tb;

            const g = i18n.t('gran.' + tb.gran);
            const seuilDe = {
                precipitation: tb.seuils.pluie,
                humidity: tb.seuils.hum,
                ndvi: tb.seuils.ndvi,
            };

            for (const k of config.VAR_KEYS) {
                const B = theme.CHART_BINDINGS[k];

                dom.$(B.sub).textContent = (k === 'ndvi' && tb.ndvi16)
                    ? i18n.t('sub.ndvi.16')
                    : i18n.t('sub.' + k, { g });

                // Le seuil de pluie est mensuel : on ne le trace qu'au pas mensuel.
                const seuilGraphe = (k === 'precipitation' && tb.gran !== 'month')
                    ? null : seuilDe[k];

                graphiques.dessiner(k, tb.labels, tb.labelsObs.length, tb.series[k], tb.prevSurGraphe, seuilGraphe);
                interpretations.rendre(k,
                    core.analyze.analyser(k, tb.mensuel[k], tb.prev.modeles[k], seuilDe[k]));
            }

            filtres.majNotes(dataset.base, tb.gran);
            diagnostic.rendre(tb.prev, tb.horizon, tb.mensuel);
            carte.afficherSaison(tb.prev);
            tableaux.rendrePrevision(tb.prev);
            tableaux.rendreObservations(tb.labelsObs, tb.series, tb.gran);
        }

        function changerLangue(langue) {
            if (!i18n.langues.includes(langue)) return;

            i18n.setLangue(langue);
            try { global.localStorage.setItem('terrapulse-lang', langue); } catch (e) { /* stockage indisponible */ }

            sources.appliquerTextes();
            majBoutonTheme();
            sources.rendre(dataset);
            rendre();
            carte.rafraichirTextes();
            if (cartePrete && donneesCarte) panneauxCarte.rendre(donneesCarte);
        }

        function chargerCsv(fichier) {
            const lecteur = new FileReader();
            lecteur.onload = ev => {
                const resultat = csvRepository.parse(ev.target.result, fichier.name);
                sources.statutCsv(resultat.count, fichier.name);
                if (!resultat.count) return;

                dataset = resultat.dataset;
                initialiserFiltres();
                sources.rendre(dataset);
                rendre();
            };
            lecteur.readAsText(fichier, 'UTF-8');
        }

        function lierEvenements() {
            filtres.lier(rendre);

            document.querySelectorAll('.tp-lang').forEach(b => {
                b.addEventListener('click', () => changerLangue(b.dataset.lang));
            });

            dom.$('btnTheme').addEventListener('click', () => {
                const prochain = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
                appliquerTheme(prochain);
                try { global.localStorage.setItem('terrapulse-theme', prochain); } catch (e) { /* stockage indisponible */ }
                majBoutonTheme();
                rendre();
            });

            dom.$('btnCsv').addEventListener('click', () => exportation.exporterCsv(dernierRendu, dataset));
            dom.$('btnJson').addEventListener('click', () => exportation.exporterJson(dernierRendu, dataset));
            dom.$('btnPdf').addEventListener('click', () => exportation.exporterPdf(dernierRendu, dataset));

            dom.$('csvFileInput').addEventListener('change', e => {
                const fichier = e.target.files[0];
                if (fichier) chargerCsv(fichier);
            });
        }

        return { demarrer };
    }

    TP.presentation.appController = { creerControleur };
})(window);
