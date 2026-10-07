/* AI Lab Pro intake — shared helpers. Loaded after supabase-js and config.js. */
(function () {
  const C = window.INTAKE_CONFIG || {};
  const configured = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient);
  const sb = configured ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  const STATUS = {
    draft: 'טיוטה', submitted: 'הוגש', reviewed: 'נבדק', proposal_sent: 'נשלחה הצעה', in_progress: 'בביצוע', done: 'הושלם'
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmtDate(iso, withTime) {
    if (!iso) return '';
    try {
      const o = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jerusalem' };
      if (withTime) { o.hour = '2-digit'; o.minute = '2-digit'; }
      return new Intl.DateTimeFormat('he-IL', o).format(new Date(iso));
    } catch (e) { return iso.slice(0, 10); }
  }
  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  let toastTimer;
  function toast(text, ms) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2600);
  }

  function track(name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {} }

  const ERR = {
    questionnaire_locked: 'השאלון כבר הוגש ולא ניתן לשנות אותו.',
    title_required: 'צריך לתת שם לתהליך לפני ההגשה (בשלב הראשון).',
    too_many_questionnaires: 'הגעת למספר המרבי של שאלונים. כתוב למאיר ונפתח עוד.',
    too_many_files: 'אפשר לצרף עד 5 קבצים לשאלון.',
    invalid_status: 'פעולה לא מורשית.'
  };
  function errText(e) {
    const m = (e && (e.message || e.error_description || e.msg)) || String(e || '');
    for (const k in ERR) if (m.indexOf(k) !== -1) return ERR[k];
    if (/rate limit|too many|429|security purposes/i.test(m)) return 'יותר מדי ניסיונות. לחכות דקה ולנסות שוב.';
    if (/expired|invalid.*(otp|token)|token.*(invalid|expired)/i.test(m)) return 'הקוד שגוי או שפג תוקפו. אפשר לבקש קוד חדש.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'אין חיבור לשרת. לבדוק אינטרנט ולנסות שוב.';
    if (/payload too large|exceeded the maximum allowed size|413/i.test(m)) return 'הקובץ גדול מדי (עד 10MB).';
    if (/mime type|invalid_mime/i.test(m)) return 'סוג הקובץ לא נתמך. אפשר תמונה, PDF, אקסל, וורד או טקסט.';
    return 'משהו השתבש. לנסות שוב, ואם זה חוזר לכתוב למאיר בוואטסאפ.';
  }

  async function getSession() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data && data.session;
  }

  async function getProfile(uid) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) throw error;
    return data;
  }

  // header: shows email + logout when signed in
  function renderHeader(session, profile, opts) {
    const nav = $('#ihnav');
    if (!nav) return;
    opts = opts || {};
    let h = '';
    if (session) {
      if (opts.home) h += '<a href="/start/">האזור האישי</a>';
      if (profile && profile.is_admin && !opts.admin) h += '<a href="/start/admin/">אדמין</a>';
      h += '<span class="who">' + esc(session.user.email || '') + '</span>';
      h += '<button type="button" id="logoutBtn">יציאה</button>';
    } else {
      h += '<a href="/">לאתר</a>';
    }
    nav.innerHTML = h;
    const lb = $('#logoutBtn');
    if (lb) lb.addEventListener('click', async () => { try { await sb.auth.signOut(); } catch (e) {} location.href = '/start/'; });
  }

  function notConfigured(root) {
    root.innerHTML = '<span class="kicker">AI LAB PRO</span><h1 class="t">האזור האישי ייפתח בקרוב.</h1>' +
      '<p class="lead">בינתיים אפשר לספר לי על התהליך בוואטסאפ, ואני אשלח לך את השאלון ברגע שהוא פתוח.</p>' +
      '<a class="btn acc" href="https://wa.me/972546500795?text=' + encodeURIComponent('היי מאיר, אשמח למלא שאלון על תהליך בעסק שלי') + '" target="_blank" rel="noopener">וואטסאפ למאיר</a>';
  }

  window.Intake = { C, sb, configured, STATUS, $, $$, esc, fmtDate, fmtSize, toast, track, errText, getSession, getProfile, renderHeader, notConfigured };
})();
