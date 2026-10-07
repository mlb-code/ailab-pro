/* /start/ — login, profile, personal area */
(function () {
  const I = window.Intake, Q = window.IntakeQ, C = I.C;
  const app = I.$('#app');
  const ss = {
    get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  let session = null, profile = null;

  function mount(id) {
    app.innerHTML = '';
    app.appendChild(document.getElementById(id).content.cloneNode(true));
    window.scrollTo(0, 0);
  }
  function msg(el, text, kind) { el.innerHTML = text ? '<div class="msg ' + (kind || 'err') + '" role="alert">' + I.esc(text) + '</div>' : ''; }

  const ICONS = {
    google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
    apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#0F1A26" d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.65zM14.1 5.85c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.6-2.66 1.37-.58.67-1.09 1.76-.95 2.8 1.01.08 2.05-.52 2.67-1.28z"/></svg>'
  };

  // ------------------------------------------------------------ login
  function showLogin(errText) {
    mount('tpl-login');
    I.renderHeader(null);
    const box = I.$('#oauthBox'), loginMsg = I.$('#loginMsg');
    const providers = [];
    if (C.GOOGLE_ENABLED) providers.push(['google', 'כניסה עם Google']);
    if (C.APPLE_ENABLED) providers.push(['apple', 'כניסה עם Apple']);
    box.innerHTML = providers.map(p => '<button type="button" class="btn block" data-p="' + p[0] + '">' + ICONS[p[0]] + '<span>' + p[1] + '</span></button>').join('');
    I.$('#orLine').hidden = providers.length === 0;
    box.addEventListener('click', async e => {
      const b = e.target.closest('button[data-p]'); if (!b) return;
      b.disabled = true;
      ss.set('intake_login', b.dataset.p);
      const { error } = await I.sb.auth.signInWithOAuth({ provider: b.dataset.p, options: { redirectTo: location.origin + '/start/' } });
      if (error) { b.disabled = false; msg(loginMsg, I.errText(error)); }
    });
    if (errText) msg(loginMsg, 'הכניסה לא הושלמה: ' + errText);

    const emailForm = I.$('#emailForm'), codeForm = I.$('#codeForm'), emailIn = I.$('#email'), codeIn = I.$('#code');
    let cooldown = 0, timer = null;
    function startCooldown() {
      cooldown = 60; const rb = I.$('#resendBtn'); rb.disabled = true;
      clearInterval(timer);
      timer = setInterval(() => {
        cooldown--; rb.textContent = cooldown > 0 ? 'שליחת קוד חדש (' + cooldown + ')' : 'שליחת קוד חדש';
        if (cooldown <= 0) { clearInterval(timer); rb.disabled = false; }
      }, 1000);
    }
    function showCode(email) {
      emailForm.hidden = true; codeForm.hidden = false;
      I.$('#codeSent').innerHTML = 'שלחתי קוד בן 6 ספרות אל <b dir="ltr">' + I.esc(email) + '</b>.';
      codeIn.value = ''; codeIn.focus();
    }
    async function send(email) {
      const { error } = await I.sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
      ss.set('intake_otp_email', email);
      startCooldown();
    }
    emailForm.addEventListener('submit', async e => {
      e.preventDefault(); msg(loginMsg, '');
      const email = emailIn.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg(loginMsg, 'כתובת המייל לא נראית תקינה.'); emailIn.focus(); return; }
      const btn = I.$('#sendBtn'); btn.disabled = true; btn.textContent = 'שולח…';
      try { await send(email); showCode(email); }
      catch (err) { msg(loginMsg, I.errText(err)); }
      finally { btn.disabled = false; btn.textContent = 'שלחו לי קוד כניסה'; }
    });
    codeIn.addEventListener('input', () => {
      codeIn.value = codeIn.value.replace(/\D/g, '').slice(0, 6);
      if (codeIn.value.length === 6) codeForm.requestSubmit ? codeForm.requestSubmit() : codeForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    codeForm.addEventListener('submit', async e => {
      e.preventDefault(); msg(loginMsg, '');
      const email = ss.get('intake_otp_email'), token = codeIn.value.trim();
      if (!/^\d{6}$/.test(token)) { msg(loginMsg, 'הקוד צריך להיות 6 ספרות.'); return; }
      const btn = I.$('#verifyBtn'); if (btn.disabled) return;
      btn.disabled = true; btn.textContent = 'בודק…';
      try {
        const { data, error } = await I.sb.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
        ss.del('intake_otp_email');
        ss.set('intake_login', 'email');
        await enter(data.session);
      } catch (err) { msg(loginMsg, I.errText(err)); btn.disabled = false; btn.textContent = 'כניסה'; codeIn.select(); }
    });
    I.$('#resendBtn').addEventListener('click', async () => {
      msg(loginMsg, '');
      try { await send(ss.get('intake_otp_email')); msg(loginMsg, 'נשלח קוד חדש.', 'ok'); }
      catch (err) { msg(loginMsg, I.errText(err)); }
    });
    I.$('#changeEmail').addEventListener('click', () => {
      ss.del('intake_otp_email'); codeForm.hidden = true; emailForm.hidden = false; emailIn.focus();
    });
    const pending = ss.get('intake_otp_email');
    if (pending) { emailIn.value = pending; showCode(pending); }
  }

  // ------------------------------------------------------------ after sign in
  async function enter(s) {
    session = s;
    const m = ss.get('intake_login');
    if (m) { I.track('intake_login', { method: m }); ss.del('intake_login'); }
    if (/[?&#](code|access_token|error)=/.test(location.href)) history.replaceState(null, '', '/start/');
    try {
      profile = await I.getProfile(session.user.id);
      if (!profile) {
        await I.sb.from('profiles').insert({ id: session.user.id });
        profile = await I.getProfile(session.user.id);
      }
    } catch (err) {
      app.innerHTML = '<div class="msg err">' + I.esc(I.errText(err)) + '</div>'; return;
    }
    I.renderHeader(session, profile);
    if (!profile || !profile.onboarded_at) showProfile(true);
    else showDash();
  }

  // ------------------------------------------------------------ profile
  function showProfile(first) {
    mount('tpl-profile');
    if (!first) { I.$('#pTitle').textContent = 'הפרטים שלך'; I.$('#pLead').textContent = 'אפשר לעדכן בכל זמן.'; I.$('#pCancel').hidden = false; I.$('#pSave').textContent = 'שמירה'; }
    const meta = (session.user.user_metadata || {});
    const wrap = I.$('#pFields');
    wrap.innerHTML = Q.PROFILE.map(f => {
      let v = profile[f.k] || (f.k === 'full_name' ? (meta.full_name || meta.name || '') : '');
      const req = f.req ? '<span class="req">חובה</span>' : '';
      const id = 'p_' + f.k;
      let input;
      if (f.type === 'select') {
        const opts = f.opts.slice(); if (v && opts.indexOf(v) === -1) opts.push(v);
        input = '<select class="in" id="' + id + '" name="' + f.k + '"><option value="">בחירה</option>' + opts.map(o => '<option' + (o === v ? ' selected' : '') + '>' + I.esc(o) + '</option>').join('') + '</select>';
      } else {
        input = '<input class="in' + (f.ltr ? ' ltr' : '') + '" id="' + id + '" name="' + f.k + '" type="' + (f.type === 'url' ? 'text' : f.type) + '"' +
          (f.auto ? ' autocomplete="' + f.auto + '"' : '') + (f.type === 'tel' ? ' inputmode="tel"' : '') + (f.type === 'url' ? ' inputmode="url"' : '') +
          (f.ph ? ' placeholder="' + I.esc(f.ph) + '"' : '') + ' value="' + I.esc(v) + '" maxlength="200">';
      }
      return '<div class="f"><label for="' + id + '">' + I.esc(f.label) + req + '</label>' + input + '</div>';
    }).join('');
    I.$('#pCancel').addEventListener('click', showDash);
    I.$('#profileForm').addEventListener('submit', async e => {
      e.preventDefault();
      const box = I.$('#profileMsg'); msg(box, '');
      if (I.$('#hp').value) { showDash(); return; } // bot
      const row = {};
      for (const f of Q.PROFILE) row[f.k] = (I.$('#p_' + f.k).value || '').trim() || null;
      const missing = Q.PROFILE.filter(f => f.req && !row[f.k]);
      if (missing.length) { msg(box, 'חסר: ' + missing.map(f => f.label).join(', ')); I.$('#p_' + missing[0].k).focus(); return; }
      if (!/^\+?[0-9][0-9\s\-]{7,18}$/.test(row.phone)) { msg(box, 'מספר הטלפון לא נראה תקין.'); I.$('#p_phone').focus(); return; }
      if (!profile.onboarded_at) row.onboarded_at = new Date().toISOString();
      const btn = I.$('#pSave'); btn.disabled = true;
      const { data, error } = await I.sb.from('profiles').update(row).eq('id', session.user.id).select().single();
      btn.disabled = false;
      if (error) { msg(box, I.errText(error)); return; }
      profile = data;
      I.toast('הפרטים נשמרו');
      showDash();
    });
    const firstEmpty = Q.PROFILE.find(f => !I.$('#p_' + f.k).value);
    if (firstEmpty && first) I.$('#p_' + firstEmpty.k).focus();
  }

  // ------------------------------------------------------------ dashboard
  async function showDash() {
    mount('tpl-dash');
    const first = (profile.full_name || '').trim().split(/\s+/)[0];
    I.$('#hello').textContent = first ? 'שלום ' + first + '.' : 'שלום.';
    I.$('#editProfile').addEventListener('click', () => showProfile(false));
    I.$('#newQ').addEventListener('click', newQuestionnaire);
    const list = I.$('#qlist');
    list.innerHTML = '<li class="muted">טוען…</li>';
    const { data, error } = await I.sb.from('questionnaires')
      .select('id,title,status,created_at,updated_at,submitted_at,admin_status_note')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    if (error) { list.innerHTML = ''; msg(I.$('#dashMsg'), I.errText(error)); return; }
    if (!data.length) {
      list.innerHTML = '<li class="empty"><b>עוד אין שאלונים.</b> מתחילים מתהליך אחד שגוזל זמן או עצבים. למשל:' +
        '<ul><li>מענה לפניות בוואטסאפ ובטלפון</li><li>הפקת הצעות מחיר או דוחות</li><li>מעקב גבייה ותזכורות</li><li>קליטת הזמנות והעברה למערכת</li></ul>' +
        '<p class="muted" style="margin-top:10px">בערך 10 דקות. אפשר לשמור באמצע.</p></li>';
      return;
    }
    list.innerHTML = data.map(q => {
      const draft = q.status === 'draft';
      const when = draft ? 'עודכן ' + I.fmtDate(q.updated_at, true) : 'הוגש ' + I.fmtDate(q.submitted_at || q.updated_at);
      return '<li class="qitem"><div class="tt"><h3>' + I.esc(q.title || 'שאלון ללא שם') + '</h3>' +
        '<div class="meta"><span class="pill ' + q.status + '">' + I.STATUS[q.status] + '</span> · ' + when + '</div>' +
        (q.admin_status_note ? '<div class="note">' + I.esc(q.admin_status_note) + '</div>' : '') + '</div>' +
        '<div class="acts row">' +
        (draft ? '<button type="button" class="linkbtn" data-del="' + q.id + '">מחיקה</button>' : '') +
        '<a class="btn sm ' + (draft ? 'acc' : 'ghost') + '" href="/start/q/?id=' + q.id + '">' + (draft ? 'המשך מילוי' : 'צפייה') + '</a></div></li>';
    }).join('');
    list.addEventListener('click', async e => {
      const b = e.target.closest('[data-del]'); if (!b) return;
      if (!confirm('למחוק את הטיוטה? אי אפשר לשחזר.')) return;
      b.disabled = true;
      try {
        const { data: files } = await I.sb.from('attachments').select('storage_path').eq('questionnaire_id', b.dataset.del);
        if (files && files.length) await I.sb.storage.from(C.BUCKET).remove(files.map(f => f.storage_path));
        const { error: de } = await I.sb.from('questionnaires').delete().eq('id', b.dataset.del);
        if (de) throw de;
        I.toast('הטיוטה נמחקה'); showDash();
      } catch (err) { b.disabled = false; msg(I.$('#dashMsg'), I.errText(err)); }
    });
  }

  async function newQuestionnaire(e) {
    const btn = e.currentTarget; btn.disabled = true;
    const { data, error } = await I.sb.from('questionnaires').insert({ title: '' }).select('id').single();
    if (error) { btn.disabled = false; msg(I.$('#dashMsg'), I.errText(error)); return; }
    I.track('intake_start', { questionnaire_id: data.id });
    location.href = '/start/q/?id=' + data.id;
  }

  // ------------------------------------------------------------ boot
  async function boot() {
    if (!I.configured) { I.notConfigured(app); return; }
    const p = new URLSearchParams(location.search + '&' + location.hash.replace(/^#/, ''));
    const err = p.get('error_description');
    let s = null;
    try { s = await I.getSession(); } catch (e) {}
    if (s) await enter(s);
    else showLogin(err);
  }
  boot();
})();
