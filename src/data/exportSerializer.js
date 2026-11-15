/*
 * TerraPulse - sérialisation des exports (Data).
 * Aucun accès au DOM : la présentation se charge du téléchargement.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.data = TP.data || {};

    const COLONNES = [
        'type', 'periode', 'precipitation_mm', 'precipitation_bas', 'precipitation_haut',
        'humidite_sol_pourcent', 'humidite_bas', 'humidite_haut', 'ndvi', 'ndvi_bas', 'ndvi_haut',
        'proba_pluie_sup_seuil', 'proba_humidite_sup_seuil', 'proba_ndvi_inf_seuil',
        'risque_glissement', 'risque_erosion',
    ];

    function serialiserJson(rapport) {
        return JSON.stringify(rapport, null, 2);
    }

    /*
     * lignesEntete : commentaires déjà traduits, sans le préfixe « # ».
     * Retourne un CSV avec BOM UTF-8 et fins de ligne CRLF.
     */
    function serialiserCsv(rapport, lignesEntete) {
        const lignes = lignesEntete.map(l => '# ' + l);
        lignes.push(COLONNES.join(','));
        const ligne = (type, o) => COLONNES
            .map(c => c === 'type' ? type : (o[c] ?? ''))
            .join(',');

        rapport.observations.forEach(o => lignes.push(ligne('observation', o)));
        rapport.previsions.forEach(o => lignes.push(ligne('prevision', o)));
        return '\ufeff' + lignes.join('\r\n') + '\r\n';
    }

    TP.data.exportSerializer = { serialiserJson, serialiserCsv };
})(window);
