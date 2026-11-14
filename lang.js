'use strict';

/* Shared EN/ES toggle for instructional text across every page on the site.
   Elements carrying data-en (and optionally data-es) get their innerHTML
   swapped; the choice is remembered in localStorage so it holds across pages
   (and across the matching game's in-page tabs, which share this document). */

(function () {
  var STORAGE_KEY = 'site-lang';

  function readLang() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'es' ? 'es' : 'en';
    } catch (e) {
      return 'en';
    }
  }

  function writeLang(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* storage unavailable */ }
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (el) {
      var es = el.getAttribute('data-es');
      el.innerHTML = lang === 'es' && es ? es : el.getAttribute('data-en');
    });
    document.querySelectorAll('[data-en-placeholder]').forEach(function (el) {
      var es = el.getAttribute('data-es-placeholder');
      el.setAttribute('placeholder', lang === 'es' && es ? es : el.getAttribute('data-en-placeholder'));
    });
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      var active = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    document.dispatchEvent(new CustomEvent('sitelangchange', { detail: { lang: lang } }));
  }

  // A page's own script can read window.siteLang.get() for a handful of
  // JS-rendered strings (dynamic text is otherwise out of scope for this
  // toggle) and listen for 'sitelangchange' to refresh them immediately.
  window.siteLang = {
    get: readLang,
    set: function (lang) { writeLang(lang); applyLang(lang); },
  };

  function init() {
    applyLang(readLang());
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.siteLang.set(btn.getAttribute('data-lang'));
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
