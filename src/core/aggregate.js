/*
 * TerraPulse - agrégation temporelle (Domain/Core).
 * Renvoie une Map « clé de période -> valeur ».
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const { cleDe, joursDansMois } = TP.core.dates;

    /*
     * observations : [{ d: 'AAAA-MM-JJ', v: nombre }]
     * how : 'sum' pour la pluie, 'mean' pour les autres variables.
     */
    function agreger(observations, varKey, gran, debut, fin, base) {
        const acc = new Map();
        for (const o of observations) {
            if (o.d < debut || o.d > fin) continue;
            const k = cleDe(o.d, gran);
            const a = acc.get(k) || { s: 0, n: 0 };
            a.s += o.v;
            a.n++;
            acc.set(k, a);
        }

        const res = new Map();
        const somme = TP.core.config.VARIABLES[varKey].how === 'sum';
        for (const [k, a] of acc) {
            // Pluie mensuelle issue de données journalières : on ne garde que les mois complets.
            if (somme && gran === 'month' && base === 'day'
                && a.n < joursDansMois(+k.slice(0, 4), +k.slice(5, 7))) continue;
            res.set(k, somme ? a.s : a.s / a.n);
        }
        return res;
    }

    TP.core.aggregate = { agreger };
})(window);
