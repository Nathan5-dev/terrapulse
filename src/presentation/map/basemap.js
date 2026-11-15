/*
 * TerraPulse - fonds de carte Esri et attribution (Presentation).
 * Aucune clé API : les tuiles Esri fonctionnent aussi en file://.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    const FONDS = {
        plan: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            options: { maxZoom: 18 },
            attribution: 'map.attrib.plan',
        },
        satellite: {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            options: { maxZoom: 18 },
            attribution: 'map.attrib.satellite',
        },
    };

    function creerFondDeCarte(options) {
        const { i18n } = options;
        let carte = null;
        let tuiles = null;
        let fond = 'plan';

        function setCarte(map) {
            carte = map;
        }

        function setFond(nom) {
            if (FONDS[nom]) fond = nom;
        }

        /*
         * Recrée la couche de tuiles : nécessaire au changement de fond et au
         * changement de langue, car l'attribution est traduite.
         */
        function rafraichir() {
            if (!carte || typeof L === 'undefined') return;
            const F = FONDS[fond];
            if (tuiles) {
                carte.removeLayer(tuiles);
                tuiles = null;
            }
            tuiles = L.tileLayer(F.url,
                Object.assign({ attribution: i18n.t(F.attribution) }, F.options)).addTo(carte);
            tuiles.bringToBack();
        }

        return { setCarte, setFond, rafraichir, getFond: () => fond };
    }

    TP.presentation.basemap = { creerFondDeCarte, FONDS };
})(window);
