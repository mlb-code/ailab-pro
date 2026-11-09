/* וואטסאפ: מדידה + בר דביק (09.11.2026). משותף לדף הבית ולכל הדפים. */
(function () {
  // כל לחיצה על wa.me של מאיר: Contact בפיקסל + cta_click ב-GA4.
  // הקישורים נפתחים בלשונית חדשה (target=_blank), כך שהדף לא נפרק והאירועים יוצאים לפני המעבר.
  // לא מעכבים עם setTimeout + window.open: חוסם החלונות של iOS/כרום חוסם window.open שלא צמוד ללחיצה.
  function sectionOf(a) {
    if (a.dataset.cta) return a.dataset.cta;
    var s = a.closest('section[id],header,nav,footer,form');
    return (s && (s.id || s.tagName.toLowerCase())) || 'page';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me/972546500795"]');
    if (!a) return;
    var sec = sectionOf(a), prod = a.dataset.product || '';
    var label = prod || (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    try { if (window.fbq) fbq('track', 'Contact', { content_name: prod || sec }); } catch (_) {}
    try { if (window.gtag) gtag('event', 'cta_click', { cta_section: sec, cta_label: label, transport_type: 'beacon' }); } catch (_) {}
  }, true);

  // בר דביק (מובייל) / כפתור צף (דסקטופ): אחרי מסך אחד של גלילה, נעלם כשהטופס על המסך או כשמקלידים.
  var bar = document.getElementById('wabar');
  if (!bar) return;
  var seat = document.getElementById('seat'), nearForm = false, typing = false;
  function upd() { bar.classList.toggle('on', window.scrollY > window.innerHeight * 0.9 && !nearForm && !typing); }
  addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd);
  if (seat && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { nearForm = es[0].isIntersecting; upd(); }, { rootMargin: '0px 0px -8% 0px' }).observe(seat);
  }
  document.addEventListener('focusin', function (e) { if (e.target.matches('input,select,textarea')) { typing = true; upd(); } });
  document.addEventListener('focusout', function () { typing = false; setTimeout(upd, 60); });
  upd();
})();
