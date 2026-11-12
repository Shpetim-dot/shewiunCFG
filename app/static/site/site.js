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
  var tabs = doc.querySelectorAll('#product [role=tab]'), panels = doc.querySelectorAll('#product [role=tabpanel]');
  function selectTab(t) {
    Array.prototype.forEach.call(tabs, function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
    Array.prototype.forEach.call(panels, function (p) { p.hidden = p.id !== t.getAttribute('aria-controls'); });
  }
  Array.prototype.forEach.call(tabs, function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var n;
      if (e.key === 'ArrowRight') n = i + 1;
      else if (e.key === 'ArrowLeft') n = i - 1;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      else return;
      n = (n + tabs.length) % tabs.length; tabs[n].focus(); selectTab(tabs[n]); e.preventDefault();
    });
  });
  if (tabs.length) selectTab(tabs[0]);


  // ---- read-only product demo: local fixtures only; no API or model calls ----
  var demo = doc.getElementById('workspace-preview');
  if (demo) {
    var demoButtons = Array.prototype.slice.call(demo.querySelectorAll('[data-demo-agent]'));
    var conversation = doc.getElementById('demo-conversation');
    var messages = doc.getElementById('demo-chat-scroll');
    var scrollPositions = {}, activeAgent = 'strategist';
    var conversations = {
      strategist: {
        name: 'Strategist', role: 'Planning · project context', knowledge: 'Client brief · draft', permission: 'Read context, suggest a plan',
        messages: [
          ['You', 'We’re preparing a website launch for Northstar Studio. Help me turn the brief into a plan the team can review.'],
          ['Strategist', 'I’d start with the decision we need to make: what belongs in the first release? The brief names three goals: explain the offer, show the work and make it easy to get in touch.'],
          ['Strategist', 'Proposed first release: positioning and audience, three focused project stories, and a short enquiry flow.'],
          ['You', 'What should we check before we commit?'],
          ['Strategist', 'Ask the Researcher to compare the client’s notes with the current website. Keep assumptions separate from confirmed requirements. Then have the Builder turn the agreed scope into a delivery checklist.'],
          ['Strategist', 'The deadline and content owner are still unknown. I’d resolve those before promising a launch date.']
        ]
      },
      researcher: {
        name: 'Researcher', role: 'Research · source review', knowledge: 'Brief + workshop notes · samples', permission: 'Read context, identify evidence gaps',
        messages: [
          ['You', 'Review the launch brief. What do we know, and what are we assuming?'],
          ['Researcher', 'The sample brief says the studio serves small product teams. The workshop notes ask for clearer project stories and a simpler enquiry form. Those are inputs, not proof of customer demand.'],
          ['Researcher', 'Confirmed in the sample brief: three services, two available case studies and one primary contact. The third case study still needs client permission.'],
          ['You', 'What would you ask the client next?'],
          ['Researcher', 'Which service should lead? Who can approve case-study content? What counts as a useful enquiry? I would record the answers with a source and review status in Brain.'],
          ['Researcher', 'Assumption to validate: fewer form fields will improve enquiries. We have no measured baseline yet, so I would not promise a conversion uplift.'],
          ['You', 'Keep the open questions with the plan.'],
          ['Researcher', 'In this example, the handoff contains confirmed inputs, unresolved questions and assumptions. No websites were fetched and no live research ran in this demo.']
        ]
      },
      builder: {
        name: 'Builder', role: 'Delivery · implementation planning', knowledge: 'Proposed release scope · sample', permission: 'Read context, propose a checklist',
        messages: [
          ['You', 'Turn the proposed scope into a checklist we can review.'],
          ['Builder', 'Here’s a suggested sequence: agree the page outline, prepare approved case-study content, build the enquiry flow, then review accessibility and mobile layouts.'],
          ['Builder', 'For each item I’d name an owner, define an acceptance check and attach the relevant context. The missing third case study should stay an open dependency.'],
          ['You', 'What needs a person’s decision?'],
          ['Builder', 'The final scope, client-facing copy and launch approval. A proposed checklist is not a completed implementation. We should verify the actual pages and form before calling the work done.'],
          ['Builder', 'Example acceptance checks: navigation works with a keyboard; the form explains validation errors; the layout fits phone, tablet and desktop widths.'],
          ['You', 'Can you publish it now?'],
          ['Builder', 'Not from this preview. It only illustrates a conversation. In the workspace, connected actions need the correct permissions and any required human approval.']
        ]
      }
    };
    function selectAgent(button) {
      scrollPositions[activeAgent] = messages.scrollTop;
      activeAgent = button.getAttribute('data-demo-agent');
      var data = conversations[activeAgent];
      demoButtons.forEach(function (item) {
        var selected = item === button;
        item.setAttribute('aria-selected', selected ? 'true' : 'false');
        item.tabIndex = selected ? 0 : -1;
      });
      conversation.setAttribute('aria-labelledby', button.id);
      doc.getElementById('demo-agent-name').textContent = data.name;
      doc.getElementById('demo-agent-role').textContent = data.role;
      doc.getElementById('demo-context-knowledge').textContent = data.knowledge;
      doc.getElementById('demo-context-permission').textContent = data.permission;
      messages.replaceChildren();
      var date = doc.createElement('div'); date.className = 'demo-date'; date.textContent = 'EXAMPLE · CLIENT LAUNCH'; messages.appendChild(date);
      data.messages.forEach(function (message) {
        var row = doc.createElement('div'); row.className = 'demo-message' + (message[0] === 'You' ? ' demo-message-user' : '');
        var author = doc.createElement('span'); author.textContent = message[0];
        var text = doc.createElement('p'); text.textContent = message[1];
        row.appendChild(author); row.appendChild(text); messages.appendChild(row);
      });
      messages.scrollTop = scrollPositions[activeAgent] || 0;
    }
    demoButtons.forEach(function (button, index) {
      button.addEventListener('click', function () { selectAgent(button); });
      button.addEventListener('keydown', function (e) {
        var next;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = index + 1;
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = index - 1;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = demoButtons.length - 1;
        else return;
        e.preventDefault();
        next = (next + demoButtons.length) % demoButtons.length;
        demoButtons[next].focus(); selectAgent(demoButtons[next]);
      });
    });
  }

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
