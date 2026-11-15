/*
 * TerraPulse - carte Leaflet (Presentation).
 * Chaque cellule de 231 m porte une pente, un NDVI et un indice de vulnérabilité.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerVueCarte(options) {
        const { i18n, formatter, theme, core, dom, fondDeCarte } = options;
        const { fmt } = formatter;
        const { el, vider } = dom;
        const { classeDe } = core.mapLayers;

        const etat = {
            cellules: [],
            couche: 'indice',
            donnees: null,
            prete: false,
        };

        function initialiser(C) {
            const section = dom.$('sectionCarte');
            if (!C || typeof L === 'undefined') {
                const msg = el('p', 'text-sm text-amber-200');
                msg.dataset.i18n = !C ? 'map.nodata' : 'map.nolib';
                msg.textContent = i18n.t(msg.dataset.i18n);
                const cible = dom.$('carte');
                if (cible) cible.replaceWith(msg);
                if (section) {
                    section.querySelectorAll('.tp-couche, .tp-fond, #communesTable, #communesTitre')
                        .forEach(e => e.classList.add('hidden'));
                }
                return false;
            }

            etat.donnees = C;
            const G = C.grille, R = C.rayon_sinusoidal;
            const versLatLon = (x, y) => {
                const lat = y / R;
                return [lat * 180 / Math.PI, x / (R * Math.cos(lat)) * 180 / Math.PI];
            };

            const carte = L.map('carte', { preferCanvas: true, scrollWheelZoom: false, zoomSnap: 0.25 });
            fondDeCarte.setCarte(carte);
            carte.attributionControl.setPrefix('Leaflet');

            // Une cellule = un quadrilatère (la grille sinusoïdale MODIS n'est pas
            // alignée sur les méridiens).
            for (let p = 0; p < C.indice.length; p++) {
                if (C.indice[p] === null) continue;       // lac ou donnée absente
                const r = Math.floor(p / G.ncols), c = p % G.ncols;
                const x0 = G.xll + c * G.cs, x1 = x0 + G.cs;
                const y1 = G.yll + (G.nrows - r) * G.cs, y0 = y1 - G.cs;
                const poly = L.polygon(
                    [versLatLon(x0, y1), versLatLon(x1, y1), versLatLon(x1, y0), versLatLon(x0, y0)],
                    { stroke: false, fillOpacity: 0.72 },
                ).addTo(carte);

                // Contenu construit au survol, donc dans la langue courante.
                poly.bindTooltip(() => {
                    const boite = el('div');
                    const ligne = ([gras, reste]) => {
                        const d = el('div');
                        d.append(el('strong', '', gras), document.createTextNode(' ' + reste));
                        boite.append(d);
                    };
                    ligne(i18n.t('map.tip.indice', {
                        v: fmt(C.indice[p], 2),
                        c: i18n.t('layer.indice.classes')[classeDe('indice', C.indice[p])],
                    }));
                    ligne(i18n.t('map.tip.pente', { v: fmt(C.pente[p], 1) + '°' }));
                    ligne(i18n.t('map.tip.ndvi', { v: fmt(C.ndvi[p], 2) }));
                    ligne(i18n.t('map.tip.alt', { v: fmt(C.altitude[p], 0) + ' m' }));
                    return boite;
                }, { sticky: true });

                etat.cellules.push({ p, poly });
            }

            for (const com of C.communes || []) {
                const anneau = com.anneau.map(([lon, lat]) => [lat, lon]);
                L.polygon(anneau, { color: '#0f172a', weight: 2.5, fill: false, interactive: false }).addTo(carte);
                L.polygon(anneau, {
                    color: '#ffffff', weight: 1, fill: false, interactive: false, dashArray: '4 4',
                }).addTo(carte).bindTooltip(com.nom, {
                    permanent: true, direction: 'center', className: 'tp-commune',
                });
            }

            if (etat.cellules.length) {
                carte.fitBounds(
                    L.latLngBounds(etat.cellules.map(o => o.poly.getBounds())),
                    { padding: [4, 4] },
                );
            }

            section.querySelectorAll('.tp-couche').forEach(b => b.addEventListener('click', () => {
                section.querySelectorAll('.tp-couche').forEach(x =>
                    x.setAttribute('aria-pressed', String(x === b)));
                etat.couche = b.dataset.couche;
                colorer();
            }));

            section.querySelectorAll('.tp-fond').forEach(b => b.addEventListener('click', () => {
                section.querySelectorAll('.tp-fond').forEach(x =>
                    x.setAttribute('aria-pressed', String(x === b)));
                fondDeCarte.setFond(b.dataset.fond);
                fondDeCarte.rafraichir();
            }));

            etat.prete = true;
            rafraichirTextes();
            return true;
        }

        /* Tout ce qui est texte dans la carte : refait au changement de langue. */
        function rafraichirTextes() {
            if (!etat.prete) return;
            fondDeCarte.rafraichir();
            colorer();
        }

        function colorer() {
            if (!etat.prete || !etat.donnees) return;
            const C = etat.donnees;
            const couleurs = theme.MAP_PALETTES[etat.couche];

            for (const { p, poly } of etat.cellules) {
                const v = C[etat.couche][p];
                poly.setStyle(v === null
                    ? { fillOpacity: 0 }
                    : { fillOpacity: 0.72, fillColor: couleurs[classeDe(etat.couche, v)] });
            }

            dom.$('carteSousTitre').textContent = i18n.t('map.sub', {
                t: i18n.t('layer.' + etat.couche),
            });

            const legende = dom.$('carteLegende');
            vider(legende);
            i18n.t(`layer.${etat.couche}.classes`).forEach((nom, i) => {
                const item = el('span', 'inline-flex items-center');
                const sw = el('span', 'tp-swatch');
                sw.style.background = couleurs[i];
                item.append(sw, document.createTextNode(nom));
                legende.append(item);
            });
        }

        /* Relie la carte (où) à la prévision (quand). */
        function afficherSaison(prev) {
            const cible = dom.$('carteSaison');
            if (!cible) return;
            vider(cible);
            if (!prev.mois.length) return;

            const pire = Math.max(...prev.mois.map(m => m.glissement));
            const moisPire = prev.mois.filter(m => m.glissement === pire).map(m => m.periode);
            cible.append(el('strong', 'text-white', i18n.t('map.where')));
            cible.append(document.createTextNode(pire === 0
                ? i18n.t('map.season.none')
                : i18n.t('map.season', {
                    m: moisPire.join(', '),
                    l: i18n.t('level.' + pire),
                })));
        }

        return {
            initialiser,
            rafraichirTextes,
            afficherSaison,
            estPrete: () => etat.prete,
        };
    }

    TP.presentation.mapView = { creerVueCarte };
})(window);
