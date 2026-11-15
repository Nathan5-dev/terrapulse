/*
 * TerraPulse - utilitaires de dates, entièrement en UTC.
 * Toutes les dates échangées sont des chaînes ISO « AAAA-MM-JJ ».
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const pad = n => String(n).padStart(2, '0');
    const utc = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
    const iso = t0 => new Date(t0).toISOString().slice(0, 10);

    // m = 1..12
    const joursDansMois = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

    const lundi = d => {
        const t0 = utc(d);
        return iso(t0 - ((new Date(t0).getUTCDay() + 6) % 7) * 864e5);
    };

    const idxMois = cle => (+cle.slice(0, 4)) * 12 + (+cle.slice(5, 7) - 1);
    const cleMois = idx => `${Math.floor(idx / 12)}-${pad(idx % 12 + 1)}`;

    function cleDe(d, gran) {
        if (gran === 'day') return d;
        if (gran === 'week') return lundi(d);
        if (gran === 'month') return d.slice(0, 7);
        return d.slice(0, 4);
    }

    const aujourdHui = () => new Date().toISOString().slice(0, 10);

    TP.core.dates = { pad, utc, iso, joursDansMois, lundi, idxMois, cleMois, cleDe, aujourdHui };
})(window);
