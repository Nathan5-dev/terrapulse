/*
 * TerraPulse - accès DOM et téléchargement (Presentation).
 */
(function (global) {
    'use strict';
    const TP = global.TerraPulse = global.TerraPulse || {};
    TP.presentation = TP.presentation || {};

    const $ = id => document.getElementById(id);

    function el(tag, cls, texte) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (texte !== undefined) e.textContent = texte;
        return e;
    }

    function vider(e) {
        e.replaceChildren();
    }

    function telecharger(nom, contenu, type) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([contenu], { type }));
        a.download = nom;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    TP.presentation.dom = { $, el, vider, telecharger };
})(window);
