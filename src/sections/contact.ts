import { lang, onLang, t } from '../i18n';

const MUNICIPALITIES = [
  'Prishtinë', 'Deçan', 'Dragash', 'Drenas', 'Ferizaj', 'Fushë Kosovë', 'Gjakovë', 'Gjilan', 'Graçanicë', 'Hani i Elezit',
  'Istog', 'Junik', 'Kaçanik', 'Kamenicë', 'Klinë', 'Kllokot', 'Leposaviq', 'Lipjan', 'Malishevë', 'Mamushë',
  'Mitrovicë', 'Mitrovicë e Veriut', 'Novobërdë', 'Obiliq', 'Partesh', 'Pejë', 'Podujevë', 'Prizren', 'Rahovec', 'Ranillug',
  'Shtërpcë', 'Shtime', 'Skënderaj', 'Suharekë', 'Viti', 'Vushtrri', 'Zubin Potok', 'Zveçan',
];

// Order sheet: validates, then hands a prefilled email to the visitor's mail app.
// Set data-endpoint on the form to POST JSON to a form service instead.
export function initContact() {
  const form = document.getElementById('orderForm') as HTMLFormElement | null;
  if (!form) return;
  const muni = form.querySelector<HTMLSelectElement>('#f-muni')!;
  const svc = form.querySelector<HTMLSelectElement>('#f-service')!;
  const status = document.getElementById('orderStatus')!;
  const no = document.getElementById('orderNo')!;
  const d = new Date();
  no.textContent = `GI-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

  const fillSelects = () => {
    const mv = muni.value, sv = svc.value;
    muni.replaceChildren(new Option(t('form.muni.pick'), ''), ...MUNICIPALITIES.map((m) => new Option(m, m)));
    const groups = [...document.querySelectorAll<HTMLElement>('.lg')].map((g) => ({ id: g.dataset.group!, label: g.querySelector('.lg__title')!.textContent!.trim() }));
    svc.replaceChildren(
      new Option(t('form.service.pick'), ''),
      ...groups.map((g) => new Option(g.label, g.id)),
      new Option(t('svc.traffic'), 'traffic'),
      new Option(t('svc.ptv'), 'ptv'),
      new Option(t('svc.arch'), 'arch'),
      new Option(t('svc.other'), 'other'),
    );
    muni.value = mv; svc.value = sv;
  };
  fillSelects();
  onLang(fillSelects);

  document.querySelectorAll<HTMLAnchorElement>('a[data-service]').forEach((a) => a.addEventListener('click', () => { svc.value = a.dataset.service!; }));

  const field = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
  const mark = (el: HTMLElement, bad: boolean) => el.closest('.field')!.classList.toggle('is-invalid', bad);
  form.addEventListener('input', (e) => { const f = (e.target as HTMLElement).closest('.field'); f?.classList.remove('is-invalid'); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = field('name').value.trim(), phone = field('phone').value.trim(), email = field('email').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneOk = phone.replace(/\D/g, '').length >= 8;
    mark(field('name'), !name);
    mark(field('email'), !(emailOk || phoneOk));
    if (!name) { field('name').focus(); return; }
    if (!(emailOk || phoneOk)) { (phone ? field('email') : field('phone')).focus(); return; }

    const svcLabel = svc.selectedIndex > 0 ? svc.options[svc.selectedIndex].text : '';
    const lines = [
      `${lang() === 'sq' ? 'Emri' : 'Name'}: ${name}`,
      phone && `${lang() === 'sq' ? 'Telefoni' : 'Phone'}: ${phone}`,
      email && `Email: ${email}`,
      muni.value && `${lang() === 'sq' ? 'Komuna' : 'Municipality'}: ${muni.value}`,
      svcLabel && `${lang() === 'sq' ? 'Shërbimi' : 'Service'}: ${svcLabel}`,
      '',
      field('message').value.trim(),
    ].filter((l): l is string => typeof l === 'string');

    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name, phone, email, municipality: muni.value, service: svcLabel, message: field('message').value }) });
        if (!r.ok) throw new Error(String(r.status));
        status.textContent = lang() === 'sq' ? 'Faleminderit. Kërkesa u dërgua, do t’ju kontaktojmë së shpejti.' : 'Thank you. Your request was sent; we will be in touch soon.';
        form.reset();
        return;
      } catch { /* fall through to email */ }
    }
    const subject = `${t('form.subject')}${svcLabel ? ` · ${svcLabel}` : ''}${muni.value ? ` · ${muni.value}` : ''}`;
    window.location.href = `mailto:muzafer.mustafa@geoinfo-ks.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    status.textContent = t('form.ok');
  });
}
