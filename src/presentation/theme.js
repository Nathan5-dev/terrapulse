/*
 * TerraPulse - constantes visuelles (Presentation).
 * Couleurs, badges et palettes ne remontent jamais dans le domaine.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    const COLORS = {
        grid: '#334155',
        axis: '#94a3b8',
        ink: '#cbd5e1',
        seuil: '#e2e8f0',
        cross: '#64748b',
    };

    const CHART_BINDINGS = {
        precipitation: { canvas: 'chartRain', interp: 'interpRain', sub: 'subRain', color: '#3987e5', type: 'bar' },
        humidity: { canvas: 'chartHum', interp: 'interpHum', sub: 'subHum', color: '#d95926', type: 'line' },
        ndvi: { canvas: 'chartNdvi', interp: 'interpNdvi', sub: 'subNdvi', color: '#199e70', type: 'line' },
    };

    const RISK_BADGES = [
        { symbole: '●', fond: '#0ca30c', encre: '#ffffff' },
        { symbole: '▲', fond: '#fab219', encre: '#0b0b0b' },
        { symbole: '◆', fond: '#d03b3b', encre: '#ffffff' },
    ];

    const MAP_PALETTES = {
        indice: ['#fde8d7', '#f9b98d', '#ee7a3c', '#bf4514', '#7a2606'],
        pente: ['#cde2fb', '#86b6ef', '#3987e5', '#1c5cab', '#0d366b'],
        ndvi: ['#e3f3da', '#b0dc9c', '#63b35d', '#22803a', '#0b4f20'],
    };

    TP.presentation.theme = { COLORS, CHART_BINDINGS, RISK_BADGES, MAP_PALETTES };
})(window);
