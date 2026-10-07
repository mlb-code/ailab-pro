/* AI Lab Pro intake — questionnaire content (single source for the form, the summary and admin).
   Changing a label here changes it everywhere for NEW saves. Keys must stay stable (stored in answers jsonb). */
(function () {
  const PROFILE = [
    { k: 'full_name', label: 'שם מלא', type: 'text', req: true, auto: 'name' },
    { k: 'role_title', label: 'תפקיד', type: 'text', ph: 'למשל: בעלים, מנהל תפעול' },
    { k: 'company', label: 'שם העסק', type: 'text', req: true, auto: 'organization' },
    { k: 'industry', label: 'תחום', type: 'text', ph: 'למשל: נדל"ן, קליניקה, יבוא' },
    { k: 'company_size', label: 'כמה עובדים', type: 'select', opts: ['עד 5', '6 עד 20', '21 עד 100', 'מעל 100'] },
    { k: 'phone', label: 'טלפון', type: 'tel', req: true, auto: 'tel', ltr: true, ph: '050-0000000' },
    { k: 'website', label: 'אתר (לא חובה)', type: 'url', ltr: true, ph: 'example.co.il' },
    { k: 'how_heard', label: 'איך הגעת אליי', type: 'select', opts: ['חיפוש בגוגל', 'לינקדאין', 'המלצה של מישהו', 'פייסבוק או אינסטגרם', 'AI Lab (הקורסים)', 'שיחה עם Claude / ChatGPT', 'אחר'] }
  ];

  const STEPS = [
    { title: 'התהליך', sub: 'שאלון אחד = תהליך אחד בעסק. יש עוד תהליכים? אחרי ההגשה פותחים שאלון נוסף.', fields: [
      { k: 'title', label: 'שם קצר לתהליך', type: 'text', req: true, ph: 'למשל: טיפול בפניות וואטסאפ, הפקת דוח שבועי' },
      { k: 'today', label: 'איך זה עובד היום?', hint: 'מי עושה מה, באילו כלים, וכמה פעמים ביום או בשבוע. אפשר בנקודות.', type: 'textarea' }
    ] },
    { title: 'מה כואב', sub: 'זה החלק שהכי עוזר לי להבין איפה הערך.', fields: [
      { k: 'pains', label: 'מה הבעיה בתהליך היום?', hint: 'אפשר לבחור כמה.', type: 'multi', opts: ['איטי', 'יקר', 'יש שגיאות', 'תלוי באדם אחד', 'לא מתועד', 'לקוחות מחכים', 'אחר'] },
      { k: 'pains_note', label: 'הערה (לא חובה)', type: 'textarea', short: true, ph: 'דוגמה אחת מהשבוע האחרון שווה הרבה' },
      { k: 'hours_week', label: 'כמה שעות בשבוע זה גוזל, בהערכה?', type: 'text', half: true, ph: 'למשל: 10' },
      { k: 'people', label: 'כמה אנשים מעורבים?', type: 'text', half: true, ph: 'למשל: 3' }
    ] },
    { title: 'התוצאה', sub: 'איך נראה העולם אחרי שזה עובד.', fields: [
      { k: 'outcome', label: 'מה התוצאה הרצויה?', type: 'textarea' },
      { k: 'metric', label: 'איך נדע שזה הצליח?', hint: 'מדד אחד מספיק: זמן תגובה, שעות שנחסכו, פחות טעויות.', type: 'textarea', short: true }
    ] },
    { title: 'מערכות ומידע', sub: 'במה משתמשים היום, ואיפה נמצא המידע.', fields: [
      { k: 'systems', label: 'אילו מערכות מעורבות?', hint: 'אפשר לבחור כמה.', type: 'multi', opts: ['וואטסאפ', 'אימייל', 'אקסל / Google Sheets', 'CRM', 'Priority / SAP / חשבשבת', 'אתר', 'טלפוניה', 'Google Drive', 'אחר'] },
      { k: 'systems_note', label: 'פירוט (איזה CRM, איזו מערכת, אחר)', type: 'text' },
      { k: 'data_where', label: 'איפה המידע נמצא היום, ומי יכול לתת גישה?', type: 'textarea', short: true },
      { k: 'sensitive', label: 'יש בתהליך מידע רגיש (פרטי לקוחות, כספים)?', type: 'single', opts: ['כן', 'לא', 'לא בטוח'] }
    ] },
    { title: 'מי ישתמש', sub: 'למי הפתרון, ובאיזה היקף.', fields: [
      { k: 'users', label: 'מי ישתמש בפתרון?', type: 'single', opts: ['עובדים', 'לקוחות', 'שניהם'] },
      { k: 'volume', label: 'היקף: כמה פעולות ביום או בחודש?', type: 'text', ph: 'למשל: 40 פניות ביום' },
      { k: 'imagine', label: 'מה אתה מדמיין?', hint: 'אפשר לבחור כמה, או "לא יודע".', type: 'multi', opts: ['סוכן AI', 'אוטומציה', 'מערכת פנימית', 'אפליקציה', 'לא יודע, תייעץ לי'] }
    ] },
    { title: 'זמנים ותקציב', sub: 'עוזר לי להציע את הגודל הנכון, לא יותר ולא פחות.', fields: [
      { k: 'urgency', label: 'כמה זה דחוף?', type: 'single', opts: ['השבוע', 'החודש', 'ברבעון הקרוב', 'גמיש'] },
      { k: 'budget', label: 'תקציב משוער', hint: 'לסדר גודל: אוטומציה החל מ-₪4,900, סוכן AI החל מ-₪9,900, מערכת פנימית החל מ-₪29,000. לפני מע"מ.', type: 'single', opts: ['עד 5 אלף ₪', '5 עד 10 אלף ₪', '10 עד 30 אלף ₪', '30 עד 60 אלף ₪', 'מעל 60 אלף ₪', 'עדיין לא יודע'] },
      { k: 'deciders', label: 'מי מחליט, ומי עוד צריך להיות מעורב?', type: 'textarea', short: true }
    ] },
    { title: 'קבצים ועוד', sub: 'צילום מסך, דוגמת אקסל או תרשים שווים אלף מילים. לא חובה.', fields: [
      { k: 'files', label: 'קבצים (עד 5, עד 10MB כל אחד)', type: 'files' },
      { k: 'more', label: 'עוד משהו שחשוב שאדע?', type: 'textarea' }
    ] }
  ];

  const ALL = STEPS.flatMap((s, i) => s.fields.map(f => Object.assign({ step: i }, f)));

  function valueText(f, v) {
    if (v == null) return '';
    if (Array.isArray(v)) return v.join(', ');
    return String(v).trim();
  }

  // ordered [{q, a}] stored in questionnaires.summary (emails + admin use it)
  function buildSummary(answers) {
    return ALL.filter(f => f.type !== 'files').map(f => ({ q: f.label, a: valueText(f, answers[f.k]) }));
  }

  window.IntakeQ = { PROFILE, STEPS, ALL, valueText, buildSummary };
})();
