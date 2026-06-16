;(function () {
  'use strict';

  // ===== Translation dictionary (exact, case-sensitive after trim) =====
  var dict = /*__DICT__*/{};

  // Fast lookup: translate a string only on an EXACT (trimmed) dictionary
  // match. Leading/trailing whitespace is preserved on the result so layout
  // (e.g. "Search " followed by an icon) does not shift.
  function translate(text) {
    if (typeof text !== 'string') return text;
    if (text.length === 0 || text.length > 80) return text; // labels are short
    if (text.indexOf('\n') !== -1) return text;             // multi-line => content, not a label
    var trimmed = text.trim();
    if (!trimmed) return text;
    var hit = dict[trimmed];
    if (hit === undefined || hit === trimmed) return text;
    if (trimmed === text) return hit;
    return text.replace(trimmed, hit);                       // keep surrounding whitespace
  }

  // ===== Exclusion guard =====
  // Never translate inside code editors / inputs / scripts, where text is the
  // user's own content (request body, scripts, headers being typed, etc.).
  var EXCLUDE_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1 };
  function isExcludedEl(el) {
    var depth = 0;
    while (el && el.nodeType === 1 && depth < 25) {
      var tag = el.tagName;
      if (EXCLUDE_TAGS[tag]) return true;
      if (el.isContentEditable) return true;
      var cl = el.className;
      if (typeof cl === 'string' && cl) {
        if (cl.indexOf('CodeMirror') !== -1 ||
            cl.indexOf('cm-editor') !== -1 ||
            cl.indexOf('cm-content') !== -1 ||
            cl.indexOf('monaco') !== -1) return true;
      }
      el = el.parentNode;
      depth++;
    }
    return false;
  }

  // ===== Setter / method interception =====
  // This is the robust core: React writes text through these APIs on every
  // (re)render, so translating at write-time survives virtual-DOM reconciliation.
  function patchAccessor(proto, prop, transformValue) {
    if (!proto) return;
    var desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (!desc || !desc.set || !desc.configurable) return;
    var origSet = desc.set;
    var origGet = desc.get;
    Object.defineProperty(proto, prop, {
      configurable: true,
      enumerable: desc.enumerable,
      get: origGet,
      set: function (value) {
        try {
          value = transformValue(this, value);
        } catch (e) { /* never break the host write */ }
        return origSet.call(this, value);
      }
    });
  }

  function textTransformForElement(node, value) {
    if (node && node.nodeType === 1 && !isExcludedEl(node)) {
      return translate(value);
    }
    return value;
  }

  function textTransformForCharData(node, value) {
    if (node && (node.nodeType === 3 || node.nodeType === 4)) {
      if (!isExcludedEl(node.parentNode)) return translate(value);
    }
    return value;
  }

  function install() {
    var Node_ = window.Node, CharacterData_ = window.CharacterData,
        Element_ = window.Element, HTMLElement_ = window.HTMLElement;

    // Element/Node.textContent — React's primary path for single-text children
    if (Node_) {
      patchAccessor(Node_.prototype, 'textContent', textTransformForElement);
      patchAccessor(Node_.prototype, 'nodeValue', textTransformForCharData);
    }
    // Text node data setter
    if (CharacterData_) {
      patchAccessor(CharacterData_.prototype, 'data', textTransformForCharData);
      patchAccessor(CharacterData_.prototype, 'nodeValue', textTransformForCharData);
    }
    // innerText (rarely used by React, but some libs do)
    if (HTMLElement_) {
      patchAccessor(HTMLElement_.prototype, 'innerText', textTransformForElement);
      patchAccessor(HTMLElement_.prototype, 'title', function (node, value) {
        return isExcludedEl(node) ? value : translate(value);
      });
    }

    // Attributes: placeholder / title / aria-label / alt go through setAttribute in React
    if (Element_ && Element_.prototype.setAttribute) {
      var ATTR = { placeholder: 1, title: 1, 'aria-label': 1, alt: 1 };
      var origSetAttr = Element_.prototype.setAttribute;
      Element_.prototype.setAttribute = function (name, value) {
        if (typeof name === 'string' && ATTR[name] && typeof value === 'string' && !isExcludedEl(this)) {
          try { value = translate(value); } catch (e) {}
        }
        return origSetAttr.call(this, name, value);
      };
    }

    // placeholder property setter on inputs/textareas
    var inputProto = window.HTMLInputElement && window.HTMLInputElement.prototype;
    var taProto = window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype;
    var phTransform = function (node, value) { return translate(value); };
    patchAccessor(inputProto, 'placeholder', phTransform);
    patchAccessor(taProto, 'placeholder', phTransform);

    // createTextNode — translate the initial text React passes in
    if (document.createTextNode) {
      var origCreate = document.createTextNode.bind(document);
      document.createTextNode = function (data) {
        try { if (typeof data === 'string') data = translate(data); } catch (e) {}
        return origCreate(data);
      };
    }
  }

  // ===== Fallback: walk existing DOM + observe (covers innerHTML, already-present text) =====
  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      if (!isExcludedEl(node.parentNode)) {
        var t = translate(node.nodeValue);
        if (t !== node.nodeValue) node.nodeValue = t;
      }
      return;
    }
    if (node.nodeType !== 1) return;
    if (EXCLUDE_TAGS[node.tagName] || node.isContentEditable) return;
    var cl = node.className;
    if (typeof cl === 'string' && (cl.indexOf('CodeMirror') !== -1 || cl.indexOf('cm-editor') !== -1 || cl.indexOf('cm-content') !== -1 || cl.indexOf('monaco') !== -1)) return;

    if (node.hasAttribute) {
      ['placeholder', 'title', 'aria-label', 'alt'].forEach(function (a) {
        if (node.hasAttribute(a)) {
          var v = node.getAttribute(a), tv = translate(v);
          if (tv !== v) node.setAttribute(a, tv);
        }
      });
    }
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  function translateAll() {
    try { walk(document.body || document.documentElement); } catch (e) {}
  }

  function startObserver() {
    if (!window.MutationObserver) return;
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') { walk(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    });
    var root = document.body || document.documentElement;
    if (root) obs.observe(root, { childList: true, subtree: true, characterData: true });
  }

  function boot() {
    try { install(); } catch (e) { console.warn('[i18n] install failed:', e); }
    var go = function () { translateAll(); startObserver(); };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', go);
    } else {
      go();
    }
    // Re-sweep for late async content (the setter patch handles the rest live)
    [300, 1000, 3000].forEach(function (ms) { setTimeout(translateAll, ms); });
  }

  try { boot(); } catch (e) { console.warn('[i18n] boot error:', e); }
})();
