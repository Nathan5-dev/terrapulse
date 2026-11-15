/*
 * TerraPulse - primitives statistiques du domaine.
 * Fonctions pures : aucune connaissance de l'interface.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.core = TP.core || {};

    const borne = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    /* Fonction de répartition de la loi normale centrée réduite. */
    function phi(z) {
        const k = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989423 * Math.exp(-z * z / 2);
        const p = d * k * (0.3193815 + k * (-0.3565638 + k * (1.781478 + k * (-1.821256 + k * 1.330274))));
        return z > 0 ? 1 - p : p;
    }

    function quantile(vals, q) {
        const s = [...vals].sort((a, b) => a - b);
        if (!s.length) return NaN;
        const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
        return s[lo] + (s[hi] - s[lo]) * (pos - lo);
    }

    /* Inversion d'une matrice carrée par la méthode de Gauss-Jordan. */
    function inverser(A) {
        const n = A.length;
        const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
        for (let c = 0; c < n; c++) {
            let p = c;
            for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
            if (Math.abs(M[p][c]) < 1e-12) return null;
            [M[c], M[p]] = [M[p], M[c]];
            const piv = M[c][c];
            for (let j = 0; j < 2 * n; j++) M[c][j] /= piv;
            for (let r = 0; r < n; r++) {
                if (r === c) continue;
                const f = M[r][c];
                if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j];
            }
        }
        return M.map(r => r.slice(n));
    }

    /*
     * Ajuste un modèle saisonnier mensuel.
     * lignes : [{ t: indice absolu du mois, y: valeur }]
     * Retourne null si le système n'est pas inversible.
     */
    function ajuster(lignes, avecTendance) {
        const p = 12 + (avecTendance ? 1 : 0), n = lignes.length;
        if (n <= p) return null;
        const tMoy = lignes.reduce((s, r) => s + r.t, 0) / n;

        const vecteur = tt => {
            const x = new Array(p).fill(0);
            x[((tt % 12) + 12) % 12] = 1;
            if (avecTendance) x[12] = tt - tMoy;
            return x;
        };

        const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
        const Xty = new Array(p).fill(0);
        for (const r of lignes) {
            const x = vecteur(r.t);
            for (let i = 0; i < p; i++) {
                if (!x[i]) continue;
                Xty[i] += x[i] * r.y;
                for (let j = 0; j < p; j++) XtX[i][j] += x[i] * x[j];
            }
        }

        const inv = inverser(XtX);
        if (!inv) return null;
        const beta = inv.map(row => row.reduce((s, v, j) => s + v * Xty[j], 0));
        const moyenne = tt => vecteur(tt).reduce((s, v, i) => s + v * beta[i], 0);
        const rss = lignes.reduce((s, r) => s + (r.y - moyenne(r.t)) ** 2, 0);
        const sigma2 = rss / (n - p);

        const prevoir = tt => {
            const x = vecteur(tt);
            let lev = 0;
            for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) lev += x[i] * inv[i][j] * x[j];
            return { mu: moyenne(tt), se: Math.sqrt(sigma2 * (1 + lev)) };
        };

        return {
            n,
            prevoir,
            pente: avecTendance ? beta[12] : 0,
            penteSe: avecTendance ? Math.sqrt(sigma2 * inv[12][12]) : 0,
            sigma: Math.sqrt(sigma2),
        };
    }

    TP.core.stats = { borne, phi, quantile, inverser, ajuster };
})(window);
