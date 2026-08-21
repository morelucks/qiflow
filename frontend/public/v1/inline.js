/*! QiFlow Inline Checkout v1 — https://qiflow.io/docs/inline
 *  Opens QiFlow hosted checkout in a modal (or popup) on your page.
 *  Usage:
 *    <script src="https://app.qiflow.io/v1/inline.js"></script>
 *    QiFlow.inline({ paymentCode: 'pay_…', onSuccess(p){…}, onClose(){…} }).open();
 *    QiFlow.inline({ key: 'qiflow_pk_live_…', amount: 12.5, currency: 'QI', reference: 'order-1' }).open();
 */
(function (global) {
  'use strict';

  var script = document.currentScript;
  var ORIGIN = (function () {
    try {
      return new URL(script && script.src ? script.src : global.location.href).origin;
    } catch (e) {
      return global.location.origin;
    }
  })();

  function noop() {}
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }
  function b64(obj) {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    } catch (e) {
      return '';
    }
  }

  function buildUrl(opts) {
    if (opts.paymentCode) {
      return ORIGIN + '/pay/' + encodeURIComponent(opts.paymentCode) + '?embed=1';
    }
    if (!opts.key || opts.amount == null) {
      throw new Error('QiFlow.inline: pass either { paymentCode } or { key, amount }.');
    }
    var q = new URLSearchParams();
    q.set('pk', String(opts.key));
    q.set('amount', String(opts.amount));
    if (opts.currency) q.set('currency', String(opts.currency));
    if (opts.description) q.set('description', String(opts.description));
    if (opts.reference) q.set('reference', String(opts.reference));
    if (opts.metadata && typeof opts.metadata === 'object') q.set('metadata', b64(opts.metadata));
    return ORIGIN + '/pay/inline?' + q.toString();
  }

  var STYLE_ID = 'qiflow-inline-style';
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      '.qiflow-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(13,10,34,.72);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .18s ease}' +
      '.qiflow-overlay.qiflow-open{opacity:1}' +
      '.qiflow-frame{width:100%;max-width:480px;height:min(720px,calc(100vh - 32px));border:0;border-radius:20px;background:#0D0A22;box-shadow:0 20px 60px rgba(0,0,0,.5);transform:translateY(8px);transition:transform .18s ease}' +
      '.qiflow-open .qiflow-frame{transform:none}' +
      '@media (max-width:480px){.qiflow-overlay{padding:0}.qiflow-frame{max-width:none;height:100vh;border-radius:0}}' +
      '@media (prefers-reduced-motion:reduce){.qiflow-overlay,.qiflow-frame{transition:none}}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function inline(userOpts) {
    var opts = assign(
      { mode: 'modal', autoCloseMs: 2000, onSuccess: noop, onClose: noop, onError: noop, onStatus: noop, onFailed: noop },
      userOpts || {}
    );
    var url = buildUrl(opts);
    var overlay = null,
      iframe = null,
      popup = null,
      prevFocus = null,
      prevOverflow = '',
      closed = true,
      done = false,
      timer = null;

    function onMessage(ev) {
      if (ev.origin !== ORIGIN) return;
      var d = ev.data;
      if (!d || d.source !== 'qiflow') return;
      switch (d.type) {
        case 'status':
          opts.onStatus(d.status, d);
          break;
        case 'completed':
          if (done) break;
          done = true;
          opts.onSuccess({ paymentCode: d.paymentCode, status: d.status, txHash: d.txHash, amount: d.amount, currency: d.currency });
          if (opts.autoCloseMs !== false) timer = setTimeout(close, opts.autoCloseMs);
          break;
        case 'failed':
          opts.onFailed({ paymentCode: d.paymentCode, status: d.status, txHash: d.txHash });
          break;
        case 'error':
          opts.onError({ code: d.code, message: d.message });
          break;
        case 'close':
          close();
          break;
      }
    }
    function onKey(ev) {
      if (ev.key === 'Escape') close();
    }

    function openModal() {
      ensureStyles();
      prevFocus = document.activeElement;
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      overlay = document.createElement('div');
      overlay.className = 'qiflow-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'QiFlow checkout');
      iframe = document.createElement('iframe');
      iframe.className = 'qiflow-frame';
      iframe.title = 'QiFlow checkout';
      iframe.setAttribute('allow', 'clipboard-write');
      iframe.src = url;
      overlay.appendChild(iframe);
      overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay) close();
      });
      document.body.appendChild(overlay);
      requestAnimationFrame(function () {
        overlay.classList.add('qiflow-open');
      });
      iframe.addEventListener('load', function () {
        try {
          iframe.focus();
        } catch (e) {}
      });
    }

    function openPopup() {
      var w = 480,
        h = 720,
        left = Math.max(0, (global.screen.width - w) / 2),
        top = Math.max(0, (global.screen.height - h) / 2);
      popup = global.open(url, 'qiflow_checkout', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes');
      if (!popup) {
        opts.onError({ code: 'POPUP_BLOCKED', message: 'Popup was blocked. Allow popups for this site or use modal mode.' });
        return false;
      }
      timer = setInterval(function () {
        if (popup && popup.closed) close();
      }, 500);
      return true;
    }

    function open() {
      if (!closed) return handle;
      closed = false;
      done = false;
      global.addEventListener('message', onMessage);
      document.addEventListener('keydown', onKey);
      if (opts.mode === 'popup') {
        if (!openPopup()) closed = true;
      } else {
        openModal();
      }
      return handle;
    }

    function close() {
      if (closed) return;
      closed = true;
      global.removeEventListener('message', onMessage);
      document.removeEventListener('keydown', onKey);
      if (timer) {
        clearTimeout(timer);
        clearInterval(timer);
        timer = null;
      }
      if (overlay) {
        overlay.classList.remove('qiflow-open');
        var el = overlay;
        overlay = null;
        iframe = null;
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 180);
        document.body.style.overflow = prevOverflow;
        try {
          if (prevFocus && prevFocus.focus) prevFocus.focus();
        } catch (e) {}
      }
      if (popup && !popup.closed) {
        try {
          popup.close();
        } catch (e) {}
      }
      popup = null;
      opts.onClose();
    }

    var handle = { open: open, close: close, url: url };
    return handle;
  }

  var api = { inline: inline, version: '1.0.0', origin: ORIGIN };
  // Convenience: QiFlow.open(opts) === QiFlow.inline(opts).open()
  api.open = function (o) {
    return inline(o).open();
  };
  global.QiFlow = assign(global.QiFlow || {}, api);
})(window);
