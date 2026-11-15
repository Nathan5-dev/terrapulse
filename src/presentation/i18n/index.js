/*
 * TerraPulse - registre de traduction (Presentation).
 * Langue courante + accès aux dictionnaires chargés avant ce fichier.
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    function creerI18n(dictionnaires) {
        let langue = 'fr';

        const aLangue = l => Object.prototype.hasOwnProperty.call(dictionnaires, l);

        function t(cle, valeurs) {
            let s = dictionnaires[langue][cle];
            if (s === undefined) s = dictionnaires.fr[cle];
            if (s === undefined) return cle;
            return typeof s === 'function' ? s(valeurs || {}) : s;
        }

        function setLangue(l) {
            if (aLangue(l)) langue = l;
            return langue;
        }

        function getLangue() { return langue; }
        function locale() { return dictionnaires[langue].locale; }

        /* Priorité : ancre d'URL, puis choix mémorisé, puis langue du navigateur. */
        function langueInitiale(hash, stockage, langueNavigateur) {
            const h = String(hash || '').replace('#', '').toLowerCase();
            if (aLangue(h)) return h;
            try {
                const memorisee = stockage.getItem('terrapulse-lang');
                if (aLangue(memorisee)) return memorisee;
            } catch (e) { /* stockage indisponible */ }
            return String(langueNavigateur || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
        }

        return {
            t,
            setLangue,
            getLangue,
            locale,
            langueInitiale,
            langues: Object.keys(dictionnaires),
        };
    }

    TP.presentation.i18nFactory = { creerI18n };
})(window);
