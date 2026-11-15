/*
 * TerraPulse - pastilles de niveau de risque (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    const { el } = TP.presentation.dom;

    function creerBadges(i18n, theme) {
        return function badge(niveau) {
            const N = theme.RISK_BADGES[niveau];
            const b = el('span', 'inline-block px-2 py-0.5 rounded-full text-[11px] font-bold',
                `${N.symbole} ${i18n.t('level.' + niveau)}`);
            b.style.background = N.fond;
            b.style.color = N.encre;
            return b;
        };
    }

    TP.presentation.badgesFactory = { creerBadges };
})(window);
