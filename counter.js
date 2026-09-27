(() => {
  'use strict';
  if (window.__vipinCounterLoaded) return;
  window.__vipinCounterLoaded = true;
  const config = window.VIPIN_COUNTER;
  const widget = document.querySelector('[data-visit-counter]');
  if (!widget || !config?.endpoint || !config.origins?.includes(location.origin)) return;
  let endpoint;
  try {
    endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) return;
  } catch { return; }
  const base = endpoint.origin;
  const visitorKey = 'vipinshri-visitor-v1';
  const preferenceKey = 'vipinshri-counter-optout';
  const validId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const privacySignal = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  let optedOut = privacySignal, storageAvailable = true;
  try { optedOut ||= localStorage.getItem(preferenceKey) === '1'; } catch { storageAvailable = false; }
  const views = widget.querySelector('[data-page-views]');
  const visitors = widget.querySelector('[data-unique-visitors]');
  const period = widget.querySelector('[data-counter-period]');
  const preference = widget.querySelector('[data-counter-preference]');
  const preferenceNote = widget.querySelector('[data-counter-preference-note]');
  widget.hidden = false;
  const formatter = new Intl.NumberFormat('en-IN');
  function render(data) {
    if (!Number.isSafeInteger(data.pageViews) || data.pageViews < 0 || !Number.isSafeInteger(data.uniqueVisitors) || data.uniqueVisitors < 0 || data.uniqueVisitors > data.pageViews) throw new Error('Invalid counts');
    const date = data.since === null ? null : new Date(data.since);
    if (date && Number.isNaN(date.getTime())) throw new Error('Invalid date');
    views.textContent = formatter.format(data.pageViews);
    visitors.textContent = formatter.format(data.uniqueVisitors);
    period.textContent = date ? 'Since ' + date.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'}) : 'Counting starts with the first visit';
  }
  async function request(path, options = {}) {
    const response = await fetch(base + path, {...options, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(5000)});
    if (response.status === 204) return null;
    if (!response.ok) throw new Error('Counter unavailable');
    return response.json();
  }
  function unavailable() { views.textContent = '—'; visitors.textContent = '—'; period.textContent = 'Visitor totals temporarily unavailable'; }
  function showPreference() {
    preference.disabled = privacySignal || !storageAvailable;
    preference.textContent = optedOut ? 'Include my future visits' : 'Exclude my future visits';
    preferenceNote.textContent = privacySignal ? 'Your browser privacy preference is respected; your visits are excluded.' : !storageAvailable ? 'Browser storage is unavailable. Page views can be counted, but unique visitors cannot be identified.' : optedOut ? 'Your future visits on this browser are excluded.' : 'Your visits on this browser are included.';
  }
  preference.addEventListener('click', () => {
    try {
      localStorage.setItem(preferenceKey, optedOut ? '0' : '1');
      optedOut = !optedOut;
      // Preserve the random ID when opting out so opting back in does not
      // create a second unique browser. No further visit is sent on this page.
    } catch { storageAvailable = false; }
    showPreference();
  });
  showPreference();
  let started = false;
  async function start() {
    if (started || document.visibilityState !== 'visible') return;
    started = true;
    if (optedOut) {
      try { render(await request('/stats')); } catch { unavailable(); }
      return;
    }
    let visitorId = null;
    try {
      const getId = () => {
        let id = localStorage.getItem(visitorKey);
        if (!validId.test(id || '')) { id = crypto.randomUUID(); localStorage.setItem(visitorKey, id); }
        return id;
      };
      // Serialize creation across tabs where Web Locks is supported.
      visitorId = navigator.locks ? await navigator.locks.request(visitorKey, getId) : getId();
    } catch { visitorId = null; storageAvailable = false; showPreference(); }
    const payload = JSON.stringify({eventId: crypto.randomUUID(), visitorId, path: location.pathname});
    try {
      let data;
      try {
        data = await request('/visit', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: payload});
      } catch {
        // A single retry uses the SAME event ID, including after a lost response.
        if (optedOut) throw new Error('Opted out');
        data = await request('/visit', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: payload});
      }
      if (data) render(data); else render(await request('/stats'));
    } catch {
      try { render(await request('/stats')); } catch { unavailable(); }
    }
  }
  document.addEventListener('visibilitychange', start);
  start();
})();
