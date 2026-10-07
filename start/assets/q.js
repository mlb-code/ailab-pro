/* /start/q/?id=... — questionnaire wizard with autosave */
(function () {
  const I = window.Intake, Q = window.IntakeQ, C = I.C;
  const app = I.$('#app');
  const id = new URLSearchParams(location.search).get('id');
  const N = Q.STEPS.length; // step N = summary
  const EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'pdf', 'txt', 'csv', 'xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'zip'];
  const MIME = { heic: 'image/heic', heif: 'image/heif', csv: 'text/csv', txt: 'text/plain', pdf: 'application/pdf', zip: 'application/zip',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
  const ls = {
    get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const BK = 'intake_bk_' + id;

  let session, q, answers = {}, atts = [], step = 0;
  let dirty = false, saving = null, saveTimer = null, lastSaved = null, saveFailed = false;

  function msgHtml(text, kind) { return '<div class="msg ' + (kind || 'err') + '" role="alert">' + I.esc(text) + '</div>'; }

  // ------------------------------------------------------------ save
  function setState() {
    const el = I.$('#saveState'); if (!el) return;
    el.classList.toggle('bad', saveFailed);
    if (saveFailed) el.textContent = 'לא נשמר, מנסה שוב…';
    else if (saving || dirty) el.textContent = 'שומר…';
    else if (lastSaved) el.textContent = 'נשמר ✓ ' + lastSaved.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    else el.textContent = '';
  }
  function markDirty() {
    dirty = true;
    ls.set(BK, { answers, ts: Date.now() });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1200);
    setState();
  }
  async function save() {
    clearTimeout(saveTimer);
    if (saving) { await saving; if (!dirty) return true; }
    if (!dirty) return true;
    dirty = false; setState();
    const payload = { title: (answers.title || '').trim().slice(0, 200), answers, summary: Q.buildSummary(answers) };
    saving = (async () => {
      const { data, error } = await I.sb.from('questionnaires').update(payload).eq('id', id).select('updated_at,status').maybeSingle();
      if (error || !data) {
        dirty = true; saveFailed = true;
        if (!error && !data) { dirty = false; saveFailed = false; location.reload(); return false; } // no longer editable (submitted elsewhere)
        saveTimer = setTimeout(save, 5000);
        return false;
      }
      saveFailed = false; lastSaved = new Date(); q.updated_at = data.updated_at;
      if (!dirty) ls.del(BK);
      return true;
    })();
    const ok = await saving; saving = null; setState();
    return ok;
  }
  window.addEventListener('beforeunload', e => { if (dirty || saving) { save(); e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty) save(); });

  // ------------------------------------------------------------ fields
  function fieldHtml(f) {
    const v = answers[f.k];
    const id_ = 'f_' + f.k;
    const req = f.req ? '<span class="req">חובה</span>' : '';
    const hint = f.hint ? '<span class="hint" id="' + id_ + '_h">' + I.esc(f.hint) + '</span>' : '';
    const desc = f.hint ? ' aria-describedby="' + id_ + '_h"' : '';
    if (f.type === 'text') {
      return '<div class="f"><label for="' + id_ + '">' + I.esc(f.label) + req + '</label>' + hint +
        '<input class="in" type="text" id="' + id_ + '" data-k="' + f.k + '" maxlength="' + (f.k === 'title' ? 200 : 500) + '"' + desc +
        (f.ph ? ' placeholder="' + I.esc(f.ph) + '"' : '') + ' value="' + I.esc(v || '') + '"></div>';
    }
    if (f.type === 'textarea') {
      return '<div class="f"><label for="' + id_ + '">' + I.esc(f.label) + req + '</label>' + hint +
        '<textarea class="in' + (f.short ? ' short' : '') + '" id="' + id_ + '" data-k="' + f.k + '" maxlength="8000"' + desc +
        (f.ph ? ' placeholder="' + I.esc(f.ph) + '"' : '') + '>' + I.esc(v || '') + '</textarea></div>';
    }
    if (f.type === 'multi' || f.type === 'single') {
      const multi = f.type === 'multi', sel = multi ? (Array.isArray(v) ? v : []) : v;
      return '<fieldset class="f" style="border:0"><legend class="lbl" style="margin-bottom:8px">' + I.esc(f.label) + '</legend>' + hint +
        '<div class="chips" role="' + (multi ? 'group' : 'radiogroup') + '">' + f.opts.map(o => {
          const on = multi ? sel.indexOf(o) !== -1 : sel === o;
          return '<label class="chip"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + f.k + '" data-k="' + f.k + '" value="' + I.esc(o) + '"' + (on ? ' checked' : '') + '><span>' + I.esc(o) + '</span></label>';
        }).join('') + '</div></fieldset>';
    }
    if (f.type === 'files') {
      return '<div class="f"><span class="lbl">' + I.esc(f.label) + '</span>' +
        '<div class="drop"><p style="margin-bottom:10px">תמונות, PDF, אקסל, וורד או טקסט.</p>' +
        '<label class="btn sm ghost" for="fileIn">בחירת קבצים</label>' +
        '<input type="file" id="fileIn" class="sr" multiple accept=".' + EXT.join(',.') + '"></div>' +
        '<div id="fileMsg"></div><ul class="files" id="fileList"></ul></div>';
    }
    return '';
  }

  function stepHtml(i) {
    const s = Q.STEPS[i];
    let html = '', half = [];
    const flush = () => { if (half.length) { html += '<div class="grid2">' + half.join('') + '</div>'; half = []; } };
    s.fields.forEach(f => { if (f.half) half.push(fieldHtml(f)); else { flush(); html += fieldHtml(f); } });
    flush();
    return '<section class="step"><h2>' + I.esc(s.title) + '</h2><p class="sub">' + I.esc(s.sub) + '</p>' + html + '</section>';
  }

  function summaryHtml(readOnly) {
    let html = '<ul class="sum">';
    Q.STEPS.forEach((s, i) => s.fields.forEach(f => {
      if (f.type === 'files') {
        html += '<li><div class="q">' + I.esc(f.label) + '</div><div class="a' + (atts.length ? '' : ' none') + '">' +
          (atts.length ? atts.map(a => (readOnly ? '<button type="button" class="linkbtn" data-dl="' + I.esc(a.storage_path) + '" data-name="' + I.esc(a.filename) + '">' + I.esc(a.filename) + '</button>' : I.esc(a.filename))).join('<br>') : 'אין') + '</div></li>';
        return;
      }
      const t = Q.valueText(f, answers[f.k]);
      html += '<li><div class="row"><div class="q">' + I.esc(f.sum || f.label) + '</div><span class="spacer"></span>' +
        (readOnly ? '' : '<button type="button" class="linkbtn edit" data-go="' + i + '">עריכה</button>') + '</div>' +
        '<div class="a' + (t ? '' : ' none') + '">' + (t ? I.esc(t) : 'לא נענה') + '</div></li>';
    }));
    return html + '</ul>';
  }

  // ------------------------------------------------------------ render
  function render() {
    const pct = Math.round(((step + 1) / (N + 1)) * 100);
    const label = step < N ? 'שלב ' + (step + 1) + ' מתוך ' + (N + 1) + ' · ' + Q.STEPS[step].title : 'סיכום והגשה';
    let body;
    if (step < N) {
      body = stepHtml(step) +
        '<div class="navbtns">' +
        (step > 0 ? '<button type="button" class="btn ghost" id="prevBtn">→ הקודם</button>' : '<a class="btn ghost" href="/start/" id="exitBtn">שמירה ויציאה</a>') +
        '<button type="button" class="btn acc" id="nextBtn">' + (step === N - 1 ? 'לסיכום ←' : 'הבא ←') + '</button></div>' +
        (step > 0 ? '<p style="margin-top:16px;text-align:center"><a class="linkbtn" href="/start/" id="exitBtn2">שמירה והמשך אחר כך</a></p>' : '');
    } else {
      body = '<section class="step"><h2>סיכום</h2><p class="sub">ככה התשובות יגיעו אליי. אפשר לתקן כל סעיף לפני ההגשה. אחרי ההגשה השאלון נעול לעריכה.</p>' +
        summaryHtml(false) + '<div id="subMsg"></div>' +
        '<div class="navbtns"><button type="button" class="btn ghost" id="prevBtn">→ חזרה</button>' +
        '<button type="button" class="btn acc" id="submitBtn">הגשת השאלון</button></div>' +
        '<p style="margin-top:16px;text-align:center"><a class="linkbtn" href="/start/" id="exitBtn2">שמירה והמשך אחר כך</a></p></section>';
    }
    app.innerHTML = '<div class="progress"><div class="bar" role="progressbar" aria-label="התקדמות" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
      '<div class="lbls"><span>' + I.esc(label) + '</span><span class="savestate" id="saveState" aria-live="polite"></span></div></div>' + body;
    setState();
    bind();
    if (step === N - 1) renderFiles();
    history.replaceState(null, '', '/start/q/?id=' + id + '#s' + (step + 1));
  }

  function go(i) {
    step = Math.max(0, Math.min(N, i));
    if (dirty) save();
    render();
    window.scrollTo(0, 0);
    const first = app.querySelector('.step input:not([type=file]), .step textarea');
    if (first && step < N && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }

  function bind() {
    app.querySelectorAll('[data-k]').forEach(el => {
      const k = el.dataset.k;
      const handler = () => {
        if (el.type === 'checkbox') {
          const f = Q.ALL.find(x => x.k === k);
          if (f && f.none && el.checked) // "no concern" is exclusive with the other options
            app.querySelectorAll('input[data-k="' + k + '"]:checked').forEach(x => { if (x !== el && (el.value === f.none || x.value === f.none)) x.checked = false; });
          answers[k] = Array.from(app.querySelectorAll('input[data-k="' + k + '"]:checked')).map(x => x.value);
        }
        else if (el.type === 'radio') answers[k] = el.value;
        else answers[k] = el.value;
        markDirty();
      };
      el.addEventListener(el.type === 'checkbox' || el.type === 'radio' ? 'change' : 'input', handler);
    });
    const nb = I.$('#nextBtn'), pb = I.$('#prevBtn');
    if (nb) nb.addEventListener('click', () => {
      if (step === 0 && !(answers.title || '').trim()) {
        const t = I.$('#f_title'); t.focus();
        if (!I.$('#titleMsg')) t.insertAdjacentHTML('afterend', '<div id="titleMsg">' + msgHtml('רק שם קצר לתהליך, כדי שנדע על מה מדברים.') + '</div>');
        return;
      }
      go(step + 1);
    });
    if (pb) pb.addEventListener('click', () => go(step - 1));
    app.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
    ['#exitBtn', '#exitBtn2'].forEach(s => { const a = I.$(s); if (a) a.addEventListener('click', async e => { e.preventDefault(); await save(); location.href = '/start/'; }); });
    const fi = I.$('#fileIn'); if (fi) fi.addEventListener('change', () => { upload(Array.from(fi.files)); fi.value = ''; });
    const sb_ = I.$('#submitBtn'); if (sb_) sb_.addEventListener('click', submit);
  }

  // ------------------------------------------------------------ files
  function renderFiles() {
    const ul = I.$('#fileList'); if (!ul) return;
    ul.innerHTML = atts.map(a => '<li><span class="nm">' + I.esc(a.filename) + '</span><span class="sz">' + I.fmtSize(a.size) + '</span>' +
      '<button type="button" class="linkbtn" data-rm="' + a.id + '" aria-label="הסרת ' + I.esc(a.filename) + '">הסרה</button></li>').join('');
    ul.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => removeFile(b.dataset.rm, b)));
    const lbl = app.querySelector('label[for="fileIn"]');
    if (lbl) lbl.hidden = atts.length >= C.MAX_FILES;
  }
  async function upload(files) {
    const box = I.$('#fileMsg'); box.innerHTML = '';
    const errs = [];
    for (const file of files) {
      if (atts.length >= C.MAX_FILES) { errs.push('אפשר לצרף עד ' + C.MAX_FILES + ' קבצים.'); break; }
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (EXT.indexOf(ext) === -1) { errs.push(file.name + ': סוג קובץ לא נתמך.'); continue; }
      if (file.size > C.MAX_FILE_MB * 1048576) { errs.push(file.name + ': גדול מ-' + C.MAX_FILE_MB + 'MB.'); continue; }
      const safe = (file.name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'file') + '.' + ext;
      const rand = Math.random().toString(36).slice(2, 10);
      const path = session.user.id + '/' + id + '/' + rand + '-' + safe;
      box.innerHTML = msgHtml('מעלה ' + file.name + '…', 'info');
      const up = await I.sb.storage.from(C.BUCKET).upload(path, file, { contentType: file.type || MIME[ext] || 'application/octet-stream', upsert: false, cacheControl: '3600' });
      if (up.error) { errs.push(file.name + ': ' + I.errText(up.error)); continue; }
      const { data: row, error } = await I.sb.from('attachments')
        .insert({ questionnaire_id: id, storage_path: path, filename: file.name.slice(0, 255), size: file.size, mime_type: file.type || MIME[ext] || null })
        .select().single();
      if (error) { await I.sb.storage.from(C.BUCKET).remove([path]); errs.push(file.name + ': ' + I.errText(error)); continue; }
      atts.push(row);
      renderFiles();
    }
    box.innerHTML = errs.length ? msgHtml(errs.join(' ')) : '';
    if (!errs.length && files.length) I.toast(files.length === 1 ? 'הקובץ הועלה' : 'הקבצים הועלו');
  }
  async function removeFile(attId, btn) {
    const a = atts.find(x => x.id === attId); if (!a) return;
    btn.disabled = true;
    const { error } = await I.sb.from('attachments').delete().eq('id', attId);
    if (error) { btn.disabled = false; I.$('#fileMsg').innerHTML = msgHtml(I.errText(error)); return; }
    await I.sb.storage.from(C.BUCKET).remove([a.storage_path]);
    atts = atts.filter(x => x.id !== attId);
    renderFiles();
  }
  async function download(path, name) {
    const { data, error } = await I.sb.storage.from(C.BUCKET).createSignedUrl(path, 300, { download: name });
    if (error) { I.toast(I.errText(error)); return; }
    location.href = data.signedUrl;
  }

  // ------------------------------------------------------------ submit
  async function submit() {
    const box = I.$('#subMsg'); box.innerHTML = '';
    if (!(answers.title || '').trim()) { box.innerHTML = msgHtml('חסר שם לתהליך (שלב 1).'); return; }
    const btn = I.$('#submitBtn'); btn.disabled = true; btn.textContent = 'מגיש…';
    const ok = await save();
    if (!ok) { btn.disabled = false; btn.textContent = 'הגשת השאלון'; box.innerHTML = msgHtml('לא הצלחתי לשמור. לבדוק חיבור ולנסות שוב.'); return; }
    const { data, error } = await I.sb.from('questionnaires').update({ status: 'submitted' }).eq('id', id).select().single();
    if (error) { btn.disabled = false; btn.textContent = 'הגשת השאלון'; box.innerHTML = msgHtml(I.errText(error)); return; }
    q = data; ls.del(BK);
    I.track('intake_submit', { questionnaire_id: id });
    app.innerHTML = '<span class="kicker">SUBMITTED</span><h1 class="t">קיבלתי. תודה.</h1>' +
      '<p class="lead">השאלון על <b>' + I.esc(q.title) + '</b> הגיע אליי. אני עובר על התשובות, ואם משהו לא ברור אפנה אליך. אחרי שהתמונה ברורה נדבר על הכיוון.</p>' +
      '<div class="row"><button type="button" class="btn acc" id="anotherBtn">שאלון לתהליך נוסף ←</button><a class="btn ghost" href="/start/">לאזור האישי</a></div>';
    I.$('#anotherBtn').addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      const r = await I.sb.from('questionnaires').insert({ title: '' }).select('id').single();
      if (r.error) { location.href = '/start/'; return; }
      I.track('intake_start', { questionnaire_id: r.data.id });
      location.href = '/start/q/?id=' + r.data.id;
    });
    window.scrollTo(0, 0);
  }

  function renderReadOnly() {
    app.innerHTML = '<span class="kicker">QUESTIONNAIRE</span><h1 class="t">' + I.esc(q.title || 'שאלון') + '</h1>' +
      '<p class="muted" style="margin-bottom:18px"><span class="pill ' + q.status + '">' + I.STATUS[q.status] + '</span> · הוגש ' + I.fmtDate(q.submitted_at, true) + '</p>' +
      (q.admin_status_note ? '<div class="msg info">' + I.esc(q.admin_status_note) + '</div>' : '') +
      '<p class="muted" style="margin-bottom:10px">השאלון הוגש ונעול לעריכה. נזכרת במשהו? אפשר לפתוח שאלון חדש או לכתוב לי בוואטסאפ.</p>' +
      summaryHtml(true) + '<div class="navbtns"><a class="btn ghost" href="/start/">→ לאזור האישי</a></div>';
    app.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => download(b.dataset.dl, b.dataset.name)));
  }

  // ------------------------------------------------------------ boot
  async function boot() {
    if (!I.configured) { I.notConfigured(app); return; }
    session = await I.getSession();
    if (!session) { location.replace('/start/'); return; }
    let profile = null;
    try { profile = await I.getProfile(session.user.id); } catch (e) {}
    I.renderHeader(session, profile, { home: true });
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) { app.innerHTML = msgHtml('לא נמצא שאלון.') + '<a class="btn ghost" href="/start/">לאזור האישי</a>'; return; }
    const [qr, ar] = await Promise.all([
      I.sb.from('questionnaires').select('*').eq('id', id).maybeSingle(),
      I.sb.from('attachments').select('*').eq('questionnaire_id', id).order('created_at')
    ]);
    if (qr.error || !qr.data) { app.innerHTML = msgHtml(qr.error ? I.errText(qr.error) : 'לא נמצא שאלון.') + '<a class="btn ghost" href="/start/">לאזור האישי</a>'; return; }
    q = qr.data; atts = ar.data || [];
    answers = Object.assign({}, q.answers || {});
    if (q.title && !answers.title) answers.title = q.title;
    if (q.status !== 'draft') { renderReadOnly(); return; }
    const bk = ls.get(BK);
    if (bk && bk.answers && bk.ts > Date.parse(q.updated_at) + 1000) { answers = bk.answers; dirty = true; setTimeout(save, 300); }
    const m = /#s(\d+)/.exec(location.hash);
    step = m ? Math.max(0, Math.min(N, +m[1] - 1)) : 0;
    if (step > 0 && !(answers.title || '').trim()) step = 0;
    render();
  }
  boot();
})();
