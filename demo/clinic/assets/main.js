/* קו תנועה · אתר הדגמה. בלי ספריות חיצוניות ובלי קריאות רשת. */
(function () {
  /* כתובת ה-Web App של Google Apps Script (מסתיימת ב-/exec). ריק = מצב הדגמה, בלי שליחה לרשת */
  var LEADS_URL = '';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* כותרת: קו תחתון אחרי גלילה */
  var head = document.querySelector('.site-head');
  function onScrollHead() { if (head) head.classList.toggle('scrolled', window.scrollY > 8); onScrollFloat(); }

  /* בטלפון: הכפתור הצף והתג מופיעים רק אחרי גלילה, כדי לא לכסות את כפתורי ההירו */
  var floatEls = document.querySelectorAll('.wa-float, .demo-badge');
  function onScrollFloat() { var s = window.scrollY > 240; for (var i = 0; i < floatEls.length; i++) floatEls[i].classList.toggle('show', s); }

  /* מצב הדגמה (יש תג): לחיצה על וואטסאפ לא פותחת מספר שלא קיים, אלא מציגה הודעה */
  if (document.querySelector('.demo-badge')) {
    var toast = document.createElement('div'); toast.className = 'demo-toast'; toast.setAttribute('role', 'status'); toast.textContent = 'זה אתר הדגמה. באתר אמיתי הכפתור פותח את הוואטסאפ של העסק.'; document.body.appendChild(toast);
    var toastT;
    var waLinks = document.querySelectorAll('a[href*="wa.me"]');
    for (var w = 0; w < waLinks.length; w++) waLinks[w].addEventListener('click', function (e) { e.preventDefault(); toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('show'); }, 3200); });
  }

  /* תפריט נייד */
  var btn = document.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'סגירת התפריט' : 'פתיחת התפריט');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { btn.click(); btn.focus(); }
    });
  }

  /* חשיפה עדינה בגלילה */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }

  /* קו התנועה: קו אחד שמתפתל בשוליים, עובר צד במרווחים שבין הסקשנים, ונמתח עם הגלילה */
  var main = document.querySelector('main');
  var NS = 'http://www.w3.org/2000/svg';
  var holder, path, dot, len = 0;
  function buildLine() {
    if (!main) return;
    if (!holder) {
      holder = document.createElement('div');
      holder.className = 'flowline';
      holder.setAttribute('aria-hidden', 'true');
      var svg = document.createElementNS(NS, 'svg');
      path = document.createElementNS(NS, 'path');
      dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', '4');
      svg.appendChild(path); svg.appendChild(dot);
      holder.appendChild(svg);
      main.insertBefore(holder, main.firstChild);
    }
    var W = main.clientWidth, H = main.scrollHeight;
    holder.querySelector('svg').setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var m = W < 700 ? 7 : Math.max(18, Math.min(56, (W - 1180) / 2 - 10));
    var R = W - m, L = m;           /* ב-RTL מתחילים מימין */
    var secs = main.querySelectorAll(':scope > section');
    var d = 'M ' + R + ' 0', side = R, y = 0;
    secs.forEach(function (s, i) {
      if (i === 0) return;
      var top = s.offsetTop;
      var prev = secs[i - 1];
      var pb = parseFloat(getComputedStyle(prev).paddingBottom) || 0;
      var pt = parseFloat(getComputedStyle(s).paddingTop) || 0;
      /* המעבר לצד השני קורה רק בתוך הריווח שבין הסקשנים, לא מעל טקסט */
      var y1 = top - Math.max(24, pb * 0.75), y2 = top + Math.max(24, pt * 0.75);
      var gap = y2 - y1;
      var other = side === R ? L : R;
      d += ' L ' + side + ' ' + y1;
      d += ' C ' + side + ' ' + (y1 + gap * .55) + ', ' + other + ' ' + (y2 - gap * .55) + ', ' + other + ' ' + y2;
      side = other; y = y2;
    });
    d += ' L ' + side + ' ' + H;
    path.setAttribute('d', d);
    len = path.getTotalLength();
    path.style.strokeDasharray = len + ' ' + len;
    progress();
  }
  function progress() {
    if (!path || !len) return;
    var H = main.scrollHeight;
    var p = Math.min(1, Math.max(0, (window.scrollY + window.innerHeight * 0.75 - main.offsetTop) / H));
    if (reduce) p = 1;
    path.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
    var pt = path.getPointAtLength(len * p);
    dot.setAttribute('cx', pt.x.toFixed(1)); dot.setAttribute('cy', pt.y.toFixed(1));
    dot.style.opacity = p >= 1 ? 0 : .9;
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { onScrollHead(); progress(); ticking = false; });
  }, { passive: true });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(buildLine, 150); });
  window.addEventListener('load', buildLine);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildLine);
  buildLine(); onScrollHead();

  /* טופס: הדגמה בלבד, בלי שליחה לרשת */
  var form = document.getElementById('lead-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (f) {
        var bad = f.type === 'checkbox' ? !f.checked : !f.value.trim();
        if (f.name === 'phone' && !bad) bad = f.value.replace(/\D/g, '').length < 9;
        f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        var er = document.getElementById(f.id + '-err');
        if (er) er.textContent = bad ? (f.dataset.err || 'שדה חובה') : '';
        if (bad && ok) { f.focus(); ok = false; }
      });
      if (!ok) return;
      var msg = document.getElementById('form-msg');
      function done() { msg.classList.add('show'); msg.focus(); form.reset(); }
      if (!LEADS_URL) { done(); return; }
      if (form.website && form.website.value) { done(); return; }   /* מלכודת בוטים */
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v); });
      data.source = location.pathname;
      var sb = form.querySelector('[type=submit]'); var orig = sb.textContent;
      sb.disabled = true; sb.textContent = 'שולח…';
      fetch(LEADS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j.success) throw new Error(j.error || 'err'); done(); if (window.gtag) gtag('event', 'generate_lead'); })
        .catch(function () {
          var fail = document.getElementById('form-fail');
          if (fail) { fail.classList.add('show'); fail.focus(); }
        })
        .then(function () { sb.disabled = false; sb.textContent = orig; });
    });
  }

  /* שנה בפוטר */
  var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
})();
