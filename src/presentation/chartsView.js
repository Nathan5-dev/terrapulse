/*
 * TerraPulse - graphiques Chart.js (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerVueGraphiques(options) {
        const { i18n, formatter, theme, config, dom } = options;
        const { VARIABLES } = config;
        const { CHART_BINDINGS, COLORS } = theme;
        const { fmt } = formatter;
        const charts = {};

        const reticule = {
            id: 'reticule',
            afterDatasetsDraw(chart) {
                const actifs = chart.tooltip && chart.tooltip.getActiveElements
                    ? chart.tooltip.getActiveElements() : [];
                if (!actifs.length) return;
                const x = actifs[0].element.x, { top, bottom } = chart.chartArea, ctx = chart.ctx;
                ctx.save();
                ctx.strokeStyle = COLORS.cross;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x, bottom);
                ctx.stroke();
                ctx.restore();
            },
        };

        function dessiner(varKey, labels, nbObs, serie, prev, seuil) {
            if (typeof Chart === 'undefined') return;

            const B = CHART_BINDINGS[varKey], V = VARIABLES[varKey];
            const hist = labels.map((k, i) => (i < nbObs && serie.has(k)) ? serie.get(k) : null);
            const dense = nbObs > 150;

            const datasets = [{
                label: i18n.t('ds.obs'), role: 'obs', type: B.type, data: hist,
                borderColor: B.color, backgroundColor: B.type === 'bar' ? B.color : 'transparent',
                borderWidth: B.type === 'bar' ? 0 : 2, borderRadius: dense ? 0 : 3,
                pointRadius: dense ? 0 : 2.5, pointHoverRadius: 5, pointBackgroundColor: B.color,
                tension: 0, spanGaps: true, order: 3,
            }];

            if (prev.length) {
                const vide = () => new Array(labels.length).fill(null);
                const med = vide(), bas = vide(), haut = vide();
                prev.forEach((m, j) => {
                    med[nbObs + j] = m[varKey].mu;
                    bas[nbObs + j] = m[varKey].bas;
                    haut[nbObs + j] = m[varKey].haut;
                });

                // Pour les courbes, on raccorde la prévision au dernier point observé.
                if (B.type === 'line') {
                    let d = nbObs - 1;
                    while (d >= 0 && hist[d] === null) d--;
                    if (d >= 0) med[d] = bas[d] = haut[d] = hist[d];
                }

                const ligne = { type: 'line', pointRadius: 0, pointHoverRadius: 0, tension: 0, spanGaps: true };
                datasets.push(
                    {
                        ...ligne, label: i18n.t('ds.med'), role: 'med', data: med, borderColor: B.color,
                        borderWidth: 2, borderDash: [6, 4], pointRadius: 2.5, pointHoverRadius: 5,
                        pointBackgroundColor: '#1e293b', pointBorderColor: B.color, order: 1,
                    },
                    { ...ligne, label: 'bas', role: 'bas', data: bas, borderWidth: 0, order: 4 },
                    {
                        ...ligne, label: i18n.t('ds.band'), role: 'haut', data: haut, borderWidth: 0,
                        backgroundColor: B.color + '40', fill: '-1', order: 4,
                    },
                );
            }

            if (seuil !== null) {
                const valeur = fmt(seuil, V.dec === 3 ? 2 : 1) + (V.unite ? ' ' + V.unite : '');
                datasets.push({
                    type: 'line', label: i18n.t('ds.thr', { v: valeur }),
                    role: 'seuil', data: labels.map(() => seuil), borderColor: COLORS.seuil, borderWidth: 1,
                    borderDash: [2, 4], pointRadius: 0, pointHoverRadius: 0, order: 0,
                });
            }

            if (charts[varKey]) charts[varKey].destroy();
            charts[varKey] = new Chart(dom.$(B.canvas), {
                type: B.type,
                data: { labels, datasets },
                plugins: [reticule],
                options: {
                    responsive: true, maintainAspectRatio: false, animation: false, locale: i18n.locale(),
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            display: datasets.length > 1,
                            labels: {
                                color: COLORS.ink, boxWidth: 16, boxHeight: 8, font: { size: 11 },
                                filter: item => datasets[item.datasetIndex].role !== 'bas',
                                sort: (a, b) => a.datasetIndex - b.datasetIndex,
                            },
                        },
                        tooltip: {
                            filter: item => item.dataset.role !== 'bas' && item.raw !== null,
                            callbacks: {
                                label(ctx) {
                                    const u = V.unite ? ' ' + V.unite : '';
                                    if (ctx.dataset.role === 'haut') {
                                        const b = ctx.chart.data.datasets.find(d => d.role === 'bas').data[ctx.dataIndex];
                                        return ' ' + i18n.t('tip.band', {
                                            a: fmt(b, V.dec),
                                            b: fmt(ctx.raw, V.dec),
                                            u,
                                        });
                                    }
                                    if (ctx.dataset.role === 'seuil') return ' ' + ctx.dataset.label;
                                    return ` ${fmt(ctx.raw, V.dec)}${u} — ${ctx.dataset.label}`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            ticks: { color: COLORS.axis, maxTicksLimit: 12, maxRotation: 0, font: { size: 11 } },
                            grid: { display: false }, border: { color: COLORS.grid },
                        },
                        y: {
                            beginAtZero: B.type === 'bar',
                            ticks: { color: COLORS.axis, font: { size: 11 } },
                            grid: { color: COLORS.grid }, border: { display: false },
                            title: { display: !!V.unite, text: V.unite, color: COLORS.axis, font: { size: 11 } },
                        },
                    },
                },
            });
        }

        return { dessiner };
    }

    TP.presentation.chartsView = { creerVueGraphiques };
})(window);
