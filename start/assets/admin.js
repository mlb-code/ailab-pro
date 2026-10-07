/* /start/admin/ — Meir only (profiles.is_admin). RLS enforces it server-side; this page just hides the UI. */
(function () {
  const I = window.Intake, Q = window.IntakeQ, C = I.C;
  const app = I.$('#app');
  let session, me, rows = [], profiles = [], current = null, tab = 'q';

  function msgHtml(text, kind) { return '<div class="msg ' + (kind || 'err') + '" role="alert">' + I.esc(text) + '</div>'; }
  const who = p => p ? (p.company || p.full_name || p.email || '') : '';

  function shell() {
    app.innerHTML = '<span class="kicker">ADMIN</span><h1 class="t" style="font-size:clamp(1.6rem,4vw,2.2rem)">שאלונים ולקוחות</h1>' +
      '<div class="tabs" role="tablist"><button type="button" role="tab" data-tab="q" aria-selected="' + (tab === 'q') + '">שאלונים</button>' +
      '<button type="button" role="tab" data-tab="c" aria-selected="' + (tab === 'c') + '">לקוחות</button></div><div id="tabBody"></div>';
    app.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; shell(); }));
    if (tab === 'q') renderQTab(); else renderClients();
  }

  // ------------------------------------------------------------ questionnaires tab
  function renderQTab() {
    const tb = I.$('#tabBody');
    const opts = '<option value="">כל הסטטוסים</option><option value="!draft">כל מה שהוגש</option>' +
      Object.keys(I.STATUS).map(k => '<option value="' + k + '">' + I.STATUS[k] + '</option>').join('');
    tb.innerHTML = '<div class="adm"><div><div class="filters">' +
      '<label class="sr" for="fStatus">סינון לפי סטטוס</label><select class="in" id="fStatus">' + opts + '</select>' +
      '<label class="sr" for="fSearch">חיפוש</label><input class="in" id="fSearch" type="search" placeholder="חיפוש: עסק, שם, תהליך"></div>' +
      '<ul class="alist" id="alist"></ul></div><div id="detail" class="card"><p class="muted">בוחרים שאלון מהרשימה.</p></div></div>';
    I.$('#fStatus').value = sessionStorage.getItem('adm_f') || '!draft';
    I.$('#fStatus').addEventListener('change', () => { try { sessionStorage.setItem('adm_f', I.$('#fStatus').value); } catch (e) {} renderList(); });
    I.$('#fSearch').addEventListener('input', renderList);
    renderList();
    const m = /#q=([0-9a-f-]{36})/i.exec(location.hash);
    if (m) openQ(m[1]); else if (current) openQ(current);
  }

  function renderList() {
    const st = I.$('#fStatus').value, term = I.$('#fSearch').value.trim().toLowerCase();
    const list = rows.filter(r => {
      if (st === '!draft' && r.status === 'draft') return false;
      if (st && st !== '!draft' && r.status !== st) return false;
      if (!term) return true;
      const p = r.profiles || {};
      return [r.title, p.company, p.full_name, p.email].some(x => (x || '').toLowerCase().indexOf(term) !== -1);
    });
    const ul = I.$('#alist');
    ul.innerHTML = list.length ? list.map(r => '<li><button type="button" data-id="' + r.id + '"' + (r.id === current ? ' aria-current="true"' : '') + '>' +
      '<span class="l1"><b>' + I.esc(r.title || 'ללא שם') + '</b><span class="pill ' + r.status + '">' + I.STATUS[r.status] + '</span></span>' +
      '<span class="l2">' + I.esc(who(r.profiles)) + ' · ' + I.fmtDate(r.submitted_at || r.updated_at) + '</span></button></li>').join('')
      : '<li class="muted">אין שאלונים בסינון הזה.</li>';
    ul.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => {
      openQ(b.dataset.id);
      if (matchMedia('(max-width:900px)').matches) I.$('#detail').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  async function openQ(qid) {
    current = qid;
    history.replaceState(null, '', '/start/admin/#q=' + qid);
    I.$$('#alist [data-id]').forEach(b => b.setAttribute('aria-current', b.dataset.id === qid ? 'true' : 'false'));
    const d = I.$('#detail');
    d.innerHTML = '<p class="muted">טוען…</p>';
    const [qr, ar, nr, er] = await Promise.all([
      I.sb.from('questionnaires').select('*').eq('id', qid).maybeSingle(),
      I.sb.from('attachments').select('*').eq('questionnaire_id', qid).order('created_at'),
      I.sb.from('questionnaire_notes').select('*').eq('questionnaire_id', qid).maybeSingle(),
      I.sb.from('events').select('type,payload,created_at').eq('questionnaire_id', qid).order('created_at', { ascending: false }).limit(30)
    ]);
    if (qr.error || !qr.data) { d.innerHTML = msgHtml(qr.error ? I.errText(qr.error) : 'לא נמצא.'); return; }
    const q = qr.data;
    const { data: p } = await I.sb.from('profiles').select('*').eq('id', q.user_id).maybeSingle();
    const summary = (Array.isArray(q.summary) && q.summary.length) ? q.summary : Q.buildSummary(q.answers || {});
    const atts = ar.data || [];
    const pr = p || {};
    const kv = [['שם', pr.full_name], ['תפקיד', pr.role_title], ['עסק', pr.company], ['תחום', pr.industry], ['גודל', pr.company_size],
      ['טלפון', pr.phone], ['מייל', pr.email], ['אתר', pr.website], ['איך הגיע', pr.how_heard]];
    const wa = (pr.phone || '').replace(/\D/g, '').replace(/^0/, '972');
    d.innerHTML =
      '<div class="row" style="margin-bottom:6px"><span class="pill ' + q.status + '">' + I.STATUS[q.status] + '</span><span class="muted">' +
      (q.submitted_at ? 'הוגש ' + I.fmtDate(q.submitted_at, true) : 'טיוטה, עודכן ' + I.fmtDate(q.updated_at, true)) + '</span></div>' +
      '<h2 class="t">' + I.esc(q.title || 'ללא שם') + '</h2>' +
      '<div class="row" style="margin:10px 0 18px"><button type="button" class="btn acc sm" id="copyMd">העתק ל-Claude</button>' +
      (pr.email ? '<a class="btn ghost sm" href="mailto:' + I.esc(pr.email) + '">מייל</a>' : '') +
      (wa.length > 8 ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/' + wa + '">וואטסאפ</a>' : '') + '</div>' +
      '<div id="copyBox"></div>' +
      '<h3 style="font-size:1.05rem;margin:8px 0">הלקוח</h3><dl class="kv">' + kv.map(x => '<dt>' + x[0] + '</dt><dd>' + I.esc(x[1] || '') + '</dd>').join('') + '</dl>' +
      '<h3 style="font-size:1.05rem;margin:22px 0 4px">תשובות</h3><ul class="sum">' +
      summary.map(it => '<li><div class="q">' + I.esc(it.q) + '</div><div class="a' + ((it.a || '').trim() ? '' : ' none') + '">' + I.esc((it.a || '').trim() || 'לא נענה') + '</div></li>').join('') + '</ul>' +
      '<h3 style="font-size:1.05rem;margin:22px 0 8px">קבצים</h3>' +
      (atts.length ? '<ul class="files">' + atts.map(a => '<li><span class="nm">' + I.esc(a.filename) + '</span><span class="sz">' + I.fmtSize(a.size) + '</span><button type="button" class="linkbtn" data-dl="' + I.esc(a.storage_path) + '" data-name="' + I.esc(a.filename) + '">הורדה</button></li>').join('') + '</ul>' : '<p class="muted">אין קבצים.</p>') +
      '<h3 style="font-size:1.05rem;margin:24px 0 8px">סטטוס</h3>' +
      '<div class="f"><label for="stSel" class="sr">סטטוס</label><select class="in" id="stSel">' + Object.keys(I.STATUS).map(k => '<option value="' + k + '"' + (k === q.status ? ' selected' : '') + '>' + I.STATUS[k] + '</option>').join('') + '</select></div>' +
      '<div class="f"><label for="stNote">הערה שהלקוח רואה באזור האישי (לא חובה)</label><textarea class="in short" id="stNote" maxlength="2000">' + I.esc(q.admin_status_note || '') + '</textarea></div>' +
      '<button type="button" class="btn sm" id="stSave">שמירת סטטוס</button>' +
      '<h3 style="font-size:1.05rem;margin:24px 0 8px">הערות פנימיות (רק אתה רואה)</h3>' +
      '<div class="f"><label for="notes" class="sr">הערות פנימיות</label><textarea class="in" id="notes" maxlength="20000">' + I.esc((nr.data && nr.data.admin_notes) || '') + '</textarea></div>' +
      '<button type="button" class="btn sm" id="notesSave">שמירת הערות</button>' +
      '<div id="detMsg"></div>' +
      '<h3 style="font-size:1.05rem;margin:24px 0 8px">יומן</h3><ul class="ev">' +
      ((er.data || []).map(e => '<li>' + I.fmtDate(e.created_at, true) + ' · ' + I.esc(e.type) + (e.payload && e.payload.to ? ' → ' + I.esc(I.STATUS[e.payload.to] || e.payload.to) : '') + (e.payload && e.payload.reason ? ' (' + I.esc(e.payload.reason) + ')' : '') + '</li>').join('') || '<li>ריק</li>') + '</ul>';

    I.$$('[data-dl]', d).forEach(b => b.addEventListener('click', async () => {
      const r = await I.sb.storage.from(C.BUCKET).createSignedUrl(b.dataset.dl, 300, { download: b.dataset.name });
      if (r.error) { I.toast(I.errText(r.error)); return; }
      window.open(r.data.signedUrl, '_blank', 'noopener');
    }));
    I.$('#copyMd').addEventListener('click', async () => {
      let md = null;
      const r = await I.sb.rpc('questionnaire_markdown', { p_id: qid });
      if (!r.error && r.data) md = r.data;
      if (!md) md = localMarkdown(q, pr, summary, atts);
      try { await navigator.clipboard.writeText(md); I.toast('הועתק. להדביק בשיחה עם Claude.'); }
      catch (e) {
        I.$('#copyBox').innerHTML = '<div class="f"><label for="mdBox">להעתקה ידנית (⌘C)</label><textarea class="in" id="mdBox" readonly style="min-height:220px">' + I.esc(md) + '</textarea></div>';
        I.$('#mdBox').select();
      }
    });
    I.$('#stSave').addEventListener('click', async e => {
      const b = e.currentTarget; b.disabled = true;
      const r = await I.sb.from('questionnaires').update({ status: I.$('#stSel').value, admin_status_note: I.$('#stNote').value.trim() || null }).eq('id', qid).select('id,title,status,created_at,updated_at,submitted_at,user_id').single();
      b.disabled = false;
      if (r.error) { I.$('#detMsg').innerHTML = msgHtml(I.errText(r.error)); return; }
      const i = rows.findIndex(x => x.id === qid); if (i !== -1) rows[i] = Object.assign(rows[i], r.data);
      I.toast('הסטטוס נשמר'); renderList(); openQ(qid);
    });
    I.$('#notesSave').addEventListener('click', async e => {
      const b = e.currentTarget; b.disabled = true;
      const r = await I.sb.from('questionnaire_notes').upsert({ questionnaire_id: qid, admin_notes: I.$('#notes').value });
      b.disabled = false;
      if (r.error) { I.$('#detMsg').innerHTML = msgHtml(I.errText(r.error)); return; }
      I.toast('ההערות נשמרו');
    });
  }

  function localMarkdown(q, p, summary, atts) {
    let md = '# שאלון תהליך: ' + (q.title || '(ללא שם)') + '\n\n## הלקוח\n' +
      [['שם', p.full_name], ['תפקיד', p.role_title], ['עסק', p.company], ['תחום', p.industry], ['גודל', p.company_size], ['טלפון', p.phone], ['מייל', p.email], ['אתר', p.website], ['איך הגיע', p.how_heard]]
        .map(x => '- ' + x[0] + ': ' + (x[1] || '')).join('\n') + '\n\n## תשובות\n\n';
    summary.forEach(it => { md += '### ' + it.q + '\n' + ((it.a || '').trim() || '(לא נענה)') + '\n\n'; });
    if (atts.length) md += '## קבצים מצורפים\n' + atts.map(a => '- ' + a.filename + ' (' + I.fmtSize(a.size) + ')').join('\n') + '\n\n';
    return md + '---\nסטטוס: ' + I.STATUS[q.status] + ' · מזהה: ' + q.id + '\n';
  }

  // ------------------------------------------------------------ clients tab
  function renderClients() {
    const count = {};
    rows.forEach(r => { count[r.user_id] = (count[r.user_id] || 0) + 1; });
    I.$('#tabBody').innerHTML = '<div class="card tscroll"><table class="ctable"><thead><tr><th>שם</th><th>עסק</th><th>תחום</th><th>גודל</th><th>טלפון</th><th>מייל</th><th>איך הגיע</th><th>שאלונים</th><th>נרשם</th></tr></thead><tbody>' +
      (profiles.map(p => '<tr><td>' + I.esc(p.full_name || '') + (p.is_admin ? ' <span class="pill">אדמין</span>' : '') + '</td><td>' + I.esc(p.company || '') + '</td><td>' + I.esc(p.industry || '') + '</td><td>' + I.esc(p.company_size || '') +
        '</td><td dir="ltr">' + I.esc(p.phone || '') + '</td><td dir="ltr">' + I.esc(p.email || '') + '</td><td>' + I.esc(p.how_heard || '') + '</td><td>' + (count[p.id] || 0) + '</td><td>' + I.fmtDate(p.created_at) + '</td></tr>').join('') ||
        '<tr><td colspan="9" class="muted">אין עדיין לקוחות.</td></tr>') + '</tbody></table></div>';
  }

  // ------------------------------------------------------------ boot
  async function boot() {
    if (!I.configured) { I.notConfigured(app); return; }
    session = await I.getSession();
    if (!session) { location.replace('/start/'); return; }
    try { me = await I.getProfile(session.user.id); } catch (e) {}
    I.renderHeader(session, me, { home: true, admin: true });
    if (!me || !me.is_admin) { app.innerHTML = msgHtml('הדף הזה למאיר בלבד.') + '<a class="btn ghost" href="/start/">לאזור האישי</a>'; return; }
    const [qr, pr] = await Promise.all([
      I.sb.from('questionnaires').select('id,title,status,created_at,updated_at,submitted_at,user_id,profiles(full_name,company,email)').order('updated_at', { ascending: false }),
      I.sb.from('profiles').select('*').order('created_at', { ascending: false })
    ]);
    if (qr.error) { app.innerHTML = msgHtml(I.errText(qr.error)); return; }
    rows = qr.data || []; profiles = pr.data || [];
    shell();
    window.addEventListener('hashchange', () => {
      const m = /#q=([0-9a-f-]{36})/i.exec(location.hash);
      if (m && m[1] !== current) { if (tab !== 'q') { tab = 'q'; shell(); } else openQ(m[1]); }
    });
  }
  boot();
})();
