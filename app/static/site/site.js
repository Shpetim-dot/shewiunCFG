/* Shewiun public site. No dependencies, no inline scripts (the CSP forbids them), no third-party requests.
   Analytics is first-party and only runs after the visitor accepted it: it counts page views and button
   clicks per day at /api/events. It sends no IP address, no cookie and no identifier. */
(function () {
  'use strict';
  var doc = document, KEY = 'shewiun_consent_v1';
  doc.documentElement.classList.add('js');

  function consent() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: the choice just is not remembered */ } }

  // ---- analytics (consent gated) ----
  function track(name) {
    if (consent() !== 'all' || !name) return;
    var body = JSON.stringify({ name: name });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/api/events', new Blob([body], { type: 'application/json' }))) return;
    } catch (e) { /* fall through to fetch */ }
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
  }
  doc.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-track]') : null;
    if (el) track(el.getAttribute('data-track'));
  });

  // ---- cookie / analytics banner ----
  var banner = doc.getElementById('consent');
  function show() { if (banner) banner.hidden = false; }
  function choose(v) {
    setConsent(v);
    if (banner) banner.hidden = true;
    if (v === 'all') track(doc.body.getAttribute('data-view') || 'landing_view');
  }
  if (banner) {
    banner.querySelector('[data-consent=all]').addEventListener('click', function () { choose('all'); });
    banner.querySelector('[data-consent=essential]').addEventListener('click', function () { choose('essential'); });
    if (!consent()) show();
  }
  Array.prototype.forEach.call(doc.querySelectorAll('[data-open-consent]'), function (b) { b.addEventListener('click', show); });
  if (consent() === 'all') track(doc.body.getAttribute('data-view'));

  // ---- mobile menu ----
  var mb = doc.querySelector('.menu-btn'), nav = doc.getElementById('nav');
  if (mb && nav) {
    mb.addEventListener('click', function () { var o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { nav.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
  }

  // ---- product tabs ----
  var tabs = doc.querySelectorAll('[role=tab]'), panels = doc.querySelectorAll('[role=tabpanel]');
  function selectTab(t) {
    Array.prototype.forEach.call(tabs, function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
    Array.prototype.forEach.call(panels, function (p) { p.hidden = p.id !== t.getAttribute('aria-controls'); });
  }
  Array.prototype.forEach.call(tabs, function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
      if (n < 0) return; n = (n + tabs.length) % tabs.length; tabs[n].focus(); selectTab(tabs[n]); e.preventDefault();
    });
  });
  if (tabs.length) selectTab(tabs[0]);

  // ---- FAQ analytics ----
  Array.prototype.forEach.call(doc.querySelectorAll('.faq details'), function (d) { d.addEventListener('toggle', function () { if (d.open) track('faq_open'); }); });

  // ---- sticky mobile CTA gets room at the bottom of the page ----
  if (doc.querySelector('.sticky-cta')) doc.body.classList.add('has-sticky');

  // ---- contact form: same rules as the server (app/site.py validate) ----
  var form = doc.getElementById('contact-form');
  if (form) {
    form.setAttribute('novalidate', '');
    var ts = form.querySelector('[name=ts]'); if (ts) ts.value = String(Date.now());
    var q = new URLSearchParams(location.search).get('error');
    var top = doc.getElementById('form-msg');
    var msgs = { rate: 'Too many messages from this connection. Please try again in an hour.', fast: 'That was very fast. Please check your details and send again.', invalid: 'Please check the highlighted fields.' };
    if (q && top && msgs[q]) { top.textContent = msgs[q]; top.hidden = false; }
    var EMAIL = /^[^@\s<>"',;]{1,64}@[^@\s<>"',;]{1,190}\.[A-Za-z]{2,}$/;
    var rules = {
      name: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your name.'; },
      email: function (v) { return EMAIL.test(v.trim()) ? '' : 'Please enter a valid e-mail address.'; },
      message: function (v) { return v.trim().length >= 10 ? '' : 'Please tell us a little more (at least 10 characters).'; },
      consent: function (v, el) { return el.checked ? '' : 'Please confirm that we may use your details to answer you.'; }
    };
    var setErr = function (name, text) {
      var el = form.elements[name], out = doc.getElementById('err-' + name);
      if (!el || !out) return;
      out.textContent = text; el.setAttribute('aria-invalid', text ? 'true' : 'false');
    };
    var check = function (name) { var el = form.elements[name], text = rules[name](el.value || '', el); setErr(name, text); return !text; };
    Object.keys(rules).forEach(function (n) { form.elements[n].addEventListener('blur', function () { check(n); }); form.elements[n].addEventListener('input', function () { if (form.elements[n].getAttribute('aria-invalid') === 'true') check(n); }); });
    form.addEventListener('submit', function (e) {
      var bad = Object.keys(rules).filter(function (n) { return !check(n); });
      if (bad.length) { e.preventDefault(); form.elements[bad[0]].focus(); return; }
      if (!window.fetch) return; // no fetch: the normal form post still works
      e.preventDefault();
      var btn = form.querySelector('button[type=submit]'), msg = doc.getElementById('form-msg');
      btn.disabled = true; btn.textContent = 'Sending…'; msg.hidden = true;
      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      fetch('/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) { track('contact_sent'); location.href = '/thank-you'; return; }
          var errs = (res.j && res.j.errors) || {};
          Object.keys(errs).forEach(function (k) { if (k === 'form') { msg.textContent = errs[k]; msg.hidden = false; } else setErr(k, errs[k]); });
          if (!Object.keys(errs).length) { msg.textContent = 'Something went wrong. Please try again or write to us directly.'; msg.hidden = false; }
          btn.disabled = false; btn.textContent = 'Send message';
        })
        .catch(function () { msg.textContent = 'We could not reach the server. Please try again in a moment.'; msg.hidden = false; btn.disabled = false; btn.textContent = 'Send message'; });
    });
  }
})();
