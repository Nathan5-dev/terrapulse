/*
 * TerraPulse - modèle de prévision (Domain/Core).
 * Saisonnalité mensuelle + tendance linéaire, avec intervalle à 80 %.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const { VAR_KEYS, VARIABLES, Z80, MIN_MOIS_MODELE } = TP.core.config;
    const { idxMois, cleMois } = TP.core.dates;
    const { ajuster, borne, phi } = TP.core.stats;

    /*
     * Apprend une variable sur une série mensuelle.
     * La tendance n'est conservée que si elle est statistiquement nette
     * (|pente| > 2 erreurs standard) : sur 5 ans, extrapoler une pente
     * incertaine donnerait des prévisions fausses.
     */
    function apprendre(serieMensuelle) {
        const lignes = [...serieMensuelle].map(([k, y]) => ({ t: idxMois(k), y }));
        if (lignes.length < MIN_MOIS_MODELE) return null;

        const complet = ajuster(lignes, true);
        if (!complet) return null;
        const significative = complet.penteSe > 0 && Math.abs(complet.pente) > 2 * complet.penteSe;
        const retenu = significative ? complet : (ajuster(lignes, false) || complet);

        return {
            n: lignes.length,
            prevoir: retenu.prevoir,
            significative,
            penteAn: complet.pente * 12,
            penteAnSe: complet.penteSe * 12,
        };
    }

    function prevoirTout(mensuel, horizon, seuils) {
        const modeles = {};
        for (const k of VAR_KEYS) modeles[k] = apprendre(mensuel[k]);
        if (VAR_KEYS.some(k => !modeles[k])) return { modeles, mois: [] };

        const dernier = Math.max(...VAR_KEYS.map(k => Math.max(...[...mensuel[k].keys()].map(idxMois))));
        const mois = [];

        for (let h = 1; h <= horizon; h++) {
            const tt = dernier + h;
            const ligne = { periode: cleMois(tt) };

            for (const k of VAR_KEYS) {
                const { mu, se } = modeles[k].prevoir(tt);
                const V = VARIABLES[k];
                ligne[k] = {
                    mu: borne(mu, V.min, V.max),
                    bas: borne(mu - Z80 * se, V.min, V.max),
                    haut: borne(mu + Z80 * se, V.min, V.max),
                    muBrut: mu,
                    se,
                };
            }

            const probabilite = (k, seuil, auDessus) => {
                const z = (seuil - ligne[k].muBrut) / ligne[k].se;
                return auDessus ? 1 - phi(z) : phi(z);
            };

            ligne.pPluie = probabilite('precipitation', seuils.pluie, true);
            ligne.pHum = probabilite('humidity', seuils.hum, true);
            ligne.pNdvi = probabilite('ndvi', seuils.ndvi, false);

            // Glissement : sol déjà saturé ET fortes pluies.
            // Érosion : fortes pluies sur un couvert végétal affaibli.
            ligne.glissement = (ligne.pPluie >= 0.5 && ligne.pHum >= 0.5) ? 2
                : (ligne.pPluie >= 0.5 || ligne.pHum >= 0.5) ? 1 : 0;
            ligne.erosion = (ligne.pPluie >= 0.5 && ligne.pNdvi >= 0.5) ? 2
                : (ligne.pPluie >= 0.5 || (ligne.pNdvi >= 0.5 && ligne.pPluie >= 0.25)) ? 1 : 0;

            mois.push(ligne);
        }

        return { modeles, mois };
    }

    TP.core.forecast = { apprendre, prevoirTout };
})(window);
