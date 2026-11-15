/*
 * TerraPulse - diagnostic de risque (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerVueDiagnostic(options) {
        const { i18n, config, badges, dom } = options;
        const { VAR_KEYS, MIN_MOIS_MODELE } = config;
        const { el } = dom;

        function rendre(prev, horizon, mensuel) {
            const corps = dom.$('diagBody');
            dom.vider(corps);

            if (!prev.mois.length) {
                const n = Math.min(...VAR_KEYS.map(k => mensuel[k].size));
                dom.$('diagIntro').textContent = '';
                corps.append(el('p', 'text-sm text-amber-200',
                    i18n.t('diag.unavailable', { n, min: MIN_MOIS_MODELE })));
                return;
            }

            dom.$('diagIntro').textContent = i18n.t('diag.intro', {
                h: horizon,
                a: prev.mois[0].periode,
                b: prev.mois[prev.mois.length - 1].periode,
            });

            for (const [cle, id] of [['glissement', 'landslide'], ['erosion', 'erosion']]) {
                const pire = Math.max(...prev.mois.map(m => m[cle]));
                const concernes = prev.mois
                    .filter(m => m[cle] === pire && pire > 0)
                    .map(m => m.periode);

                const bloc = el('div', 'rounded-xl bg-slate-900 border border-slate-700 p-3');
                const tete = el('div', 'flex items-center justify-between gap-2 mb-1');
                tete.append(
                    el('span', 'text-sm font-semibold text-white', i18n.t('diag.' + id)),
                    badges(pire),
                );
                bloc.append(tete, el('p', 'text-xs text-slate-400', i18n.t(`diag.${id}.cause`)));
                bloc.append(el('p', 'text-xs text-slate-200 mt-1', pire === 0
                    ? i18n.t('diag.none')
                    : i18n.t('diag.months', {
                        m: concernes.join(', '),
                        action: i18n.t(`diag.${id}.action`),
                    })));
                corps.append(bloc);
            }
        }

        return { rendre };
    }

    TP.presentation.diagnosticView = { creerVueDiagnostic };
})(window);
