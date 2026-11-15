/*
 * TerraPulse - interprétation rédigée des courbes (Presentation).
 * Les chiffres viennent du domaine ; seule la mise en mots est ici.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerVueInterpretations(options) {
        const { i18n, formatter, theme, config, dom } = options;
        const { VARIABLES, MIN_MOIS_MODELE } = config;
        const { fmt } = formatter;
        const { el } = dom;

        function tendanceTexte(modele, V) {
            if (!modele) return i18n.t('trend.short', { min: MIN_MOIS_MODELE });
            const val = `${modele.penteAn >= 0 ? '+' : '−'}${fmt(Math.abs(modele.penteAn), V.dec)}` +
                ` ± ${fmt(2 * modele.penteAnSe, V.dec)} ${i18n.t('trend.unit', { u: V.unite })}`;
            return i18n.t(modele.significative ? 'trend.sig' : 'trend.ns', { val });
        }

        function rendre(varKey, analyse) {
            const V = VARIABLES[varKey], cible = dom.$(theme.CHART_BINDINGS[varKey].interp);
            dom.vider(cible);

            if (!analyse) {
                cible.append(el('p', '', i18n.t('interp.empty')));
                return;
            }

            const u = V.unite ? ' ' + V.unite : '';
            const lecture = i18n.t('interp.stats', {
                n: analyse.count,
                pluie: varKey === 'precipitation',
                sous: analyse.below,
                moy: fmt(analyse.mean, V.dec) + u,
                max: fmt(analyse.max, V.dec) + u,
                kMax: analyse.maxKey,
                min: fmt(analyse.min, V.dec) + u,
                kMin: analyse.minKey,
                nHors: analyse.outsideCount,
                seuil: fmt(analyse.threshold, analyse.below ? 2 : 1) + u,
                dernier: analyse.lastOutsideKey,
            });

            const niveau = analyse.level;
            let impact = i18n.t(`imp.${analyse.family}.${niveau}`, {
                k: analyse.outsideShare > 0 ? Math.max(2, Math.round(1 / analyse.outsideShare)) : 0,
            });
            if (varKey === 'ndvi' && analyse.model
                && analyse.model.significative && analyse.model.penteAn < 0) {
                impact += i18n.t('imp.ndvi.decline');
            }
            impact += i18n.t(`imp.${analyse.family}.tail`);

            const p1 = el('p');
            p1.append(
                el('strong', 'text-slate-100', i18n.t('interp.read')),
                document.createTextNode(lecture + ' ' + tendanceTexte(analyse.model, V)),
            );
            const p2 = el('p');
            p2.append(
                el('strong', 'text-slate-100', i18n.t('interp.impact')),
                document.createTextNode(impact),
            );
            cible.append(p1, p2);
        }

        return { rendre };
    }

    TP.presentation.interpretationView = { creerVueInterpretations };
})(window);
