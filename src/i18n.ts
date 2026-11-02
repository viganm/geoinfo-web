// Albanian is authored in index.html and captured from the DOM at boot;
// English lives here. Keys mirror the data-i18n attributes.
export type Lang = 'sq' | 'en';

const en: Record<string, string> = {
  skip: 'Skip to content',
  'nav.label': 'Main',
  'nav.services': 'Services',
  'nav.process': 'How we work',
  'nav.traffic': 'Traffic',
  'nav.arch': 'Architecture &amp; property',
  'nav.partners': 'Partners',
  'nav.contact': 'Contact',
  'lang.label': 'Language',
  'menu.open': 'Open menu',
  'cta.quote': 'Request a quote',

  'hero.t1': 'A clear',
  'hero.t2': 'vision.',
  'hero.lede': 'We measure land to the centimetre and model the traffic that moves across it. Geodesy, cadastre, architecture and traffic engineering for Kosovo.',
  'hero.hint': 'Click the map to measure a distance',
  'hero.clear': 'Clear',
  'ro.mode': 'Polar shot',
  'foot.interval': 'Contour interval',
  'foot.proj': 'Projection',
  'foot.conv': 'Convergence',
  'foot.data': 'Data',

  'intro.statement': 'GeoInfo is your trusted engineering partner. We measure boundaries, terrain and road networks, from a single parcel to an entire city.',
  'v1.name': 'Accuracy',
  'v1.text': 'Precise measurements and data. Every calculation and every report has to be reliable, because the integrity of our work is built on them.',
  'v2.name': 'Expertise',
  'v2.text': 'Professional command of surveying techniques, industry standards and regulations, from the cadastre to traffic modelling.',
  'v3.name': 'Time',
  'v3.text': 'Projects finish on the agreed deadline, without compromising quality. The deadline is part of the accuracy.',

  'legend.title': 'Legend of services',
  'legend.lede': 'Eight fields, twenty-five services. Every symbol on this map is work we do in the field.',
  'g1.t': 'Property surveys',
  'g1.s1': 'Boundary surveys', 'g1.d1': 'We establish property lines and resolve boundary disputes.',
  'g1.s2': 'Topographic surveys', 'g1.d2': 'We map contours and terrain features for planning and design.',
  'g1.s3': 'Title surveys (ALTA/NSPS)', 'g1.d3': 'Detailed property information for title insurance.',
  'g1.s4': 'Parcel subdivision', 'g1.d4': 'We divide land into parcels for development or sale.',
  'g2.t': 'Construction surveys',
  'g2.s1': 'Site layout &amp; staking', 'g2.d1': 'We mark buildings, roads and installations on site from the design plans.',
  'g2.s2': 'As-built surveys', 'g2.d2': 'We record the position of completed structures for registration and compliance.',
  'g2.s3': 'Monitoring surveys', 'g2.d3': 'We track movement of structures, ground and infrastructure over time.',
  'g3.t': 'Engineering &amp; infrastructure',
  'g3.s1': 'Roads &amp; routes', 'g3.d1': 'We plan and map routes for roads, pipelines and other lines.',
  'g3.s2': 'Hydrographic surveys', 'g3.d2': 'We map underwater terrain for bridges, dams, ports and flood management.',
  'g3.s3': 'Underground utilities', 'g3.d3': 'We locate and map pipes, cables and underground conduits.',
  'g4.t': 'Environment &amp; geology',
  'g4.s1': 'Flood zones', 'g4.d1': 'We determine whether a property lies within a flood zone.',
  'g4.s2': 'Erosion control', 'g4.d2': 'We identify erosion-prone areas and recommend protective measures.',
  'g4.s3': 'Mines &amp; quarries', 'g4.d3': 'We map and monitor mining operations and mineral resources.',
  'g5.t': 'Advanced technology',
  'g5.s1': '3D laser scanning', 'g5.d1': 'Detailed 3D models of structures and sites for design, analysis or heritage preservation.',
  'g5.s2': 'Aerial drone surveys', 'g5.d2': 'Aerial imagery and maps for large or hard-to-reach areas.',
  'g5.s3': 'Geodetic surveys', 'g5.d3': 'Large-scale measurement, often for government or scientific purposes.',
  'g6.t': 'Real estate &amp; development',
  'g6.s1': 'Feasibility studies', 'g6.d1': 'We assess how suitable a piece of land is for development.',
  'g6.s2': 'Parcel planning', 'g6.d2': 'Dividing and planning land for residential or commercial development.',
  'g6.s3': 'Property valuation data', 'g6.d3': 'We provide the data needed to determine a property’s value.',
  'g7.t': 'Legal &amp; compliance',
  'g7.s1': 'Boundary disputes', 'g7.d1': 'Evidence and expertise in legal cases involving property lines.',
  'g7.s2': 'Easements', 'g7.d2': 'We define and map easement zones for installations or rights of way.',
  'g7.s3': 'Building permits', 'g7.d3': 'The documentation and measurements required for permits and code compliance.',
  'g8.t': 'Mapping &amp; data',
  'g8.s1': 'GIS mapping', 'g8.d1': 'Maps for Geographic Information Systems, for analysis and planning.',
  'g8.s2': 'Cadastral mapping', 'g8.d2': 'We document property boundaries for public registers.',
  'g8.s3': 'Orthophotos', 'g8.d3': 'Geometrically corrected aerial photographs for accurate mapping.',
  'inset.cap': 'A window onto the Prishtina map. The drawings on top are illustrative.',

  'process.title': 'How we work',
  'process.lede': 'Every survey is a closed traverse: we start from known points, measure, and return to where we began to prove that everything closes.',
  'p1.t': 'Brief', 'p1.d': 'Tell us about the site and the goal. We review the documents: the cadastral plan copy, the ownership certificate and the design, if there is one.',
  'p2.t': 'Control network', 'p2.d': 'We tie into geodetic control points in KOSOVAREF01 using GNSS, so every coordinate sits in the state reference system.',
  'p3.t': 'Field measurement', 'p3.d': 'Leica Geosystems total stations and GNSS RTK, a scanner or a drone. We choose the instrument for the terrain and the accuracy required.',
  'p4.t': 'Processing', 'p4.d': 'We compute, check the traverse closure and errors, then draft in CAD and GIS.',
  'p5.t': 'Delivery', 'p5.d': 'The survey report, maps and files (DWG, SHP, PDF), ready for the cadastre, the municipality or your designer.',

  'traffic.title': 'Traffic engineering &amp; simulation',
  'traffic.lede': 'A road network should carry traffic without long delays, with low accident risk and minimal environmental impact. We model it before it is built.',
  'ptv.title': 'Official PTV Group dealer for Kosovo',
  'ptv.text': 'GeoInfo represents PTV Group in Kosovo. For licences, demonstrations and questions about PTV software, talk to us directly.',
  'ptv.visum': 'Traffic network modelling',
  'ptv.vissim': 'Microscopic simulation',
  'ptv.cta': 'Ask about a licence',
  'sim.aria': 'Traffic simulation on the Prishtina road network',
  'sim.scenario': 'Scenario',
  'sim.now': 'Current state',
  'sim.opt': 'Adaptive signals + ITS',
  'sim.veh': 'Vehicles',
  'sim.speed': 'Avg. speed',
  'sim.delay': 'In queue',
  'sim.fast': 'free flow',
  'sim.slow': 'queue',
  'sim.cap': 'Illustrative simulation on the real road network around Rrethi i Madh, Prishtina. Roads © OpenStreetMap.',
  't1.t': 'Traffic modelling',
  't1.d': 'Traffic models assess movement and its environmental impact. We work with the modern PTV Visum and PTV Vissim software.',
  't1.l1': 'We build, run and maintain traffic models',
  't1.l2': 'We calculate the economic and environmental impact of traffic',
  't1.l3': 'Models for private car travel and public transit lines',
  't1.l4': 'Flow simulations and congestion analysis',
  't2.t': 'Planning &amp; design',
  't2.d': 'We identify problem areas, set objectives and present results clearly for decision makers.',
  't2.l1': 'Urban and rural roads',
  't2.l2': 'Traffic calming and safety',
  't2.l3': 'Cycling and pedestrian space',
  't2.l4': 'Parking, bus and rail terminals',
  't3.t': 'Intelligent traffic systems (ITS)',
  't3.d': 'ITS improves safety, flow and information. We are involved in every phase, from analysis to supervision.',
  't3.l1': 'Strategic traffic management',
  't3.l2': 'Dynamic route guidance',
  't3.l3': 'Parking and traveller information systems',
  't3.l4': 'Electronic ticketing and payment',
  't4.t': 'Road safety',
  't4.d': 'Prevention is always better than cure. Fewer casualties, lower costs and safer cities.',
  't4.l1': 'Road safety plans and policies',
  't4.l2': 'Safety audits and reviews',
  't4.l3': 'Crash statistics and analysis',
  't4.l4': 'Assessing the impact of measures',

  'arch.title': 'Architecture &amp; property',
  'arch.lede': 'Every building starts with an accurately measured parcel. From feasibility to building permit, we take a project from the ground to its form.',
  'a1.t': 'Feasibility study', 'a1.d': 'Can you build here, and how much? Constraints, building lines and the parcel’s potential.',
  'a2.t': 'Architectural design', 'a2.d': 'From concept to building permit documentation, based on our own measurements.',
  'a3.t': 'Parcel planning', 'a3.d': 'Subdividing and adjusting parcels for residential or commercial development.',
  'a4.t': 'Building documentation', 'a4.d': '3D scanning and as-built surveys for renovation, legalisation or registration.',
  'a5.t': 'Property valuation', 'a5.d': 'Measured data for buying, selling, inheritance or a mortgage.',
  'arch.aria': 'Illustration: from parcel to building',
  'arch.cap': 'Illustration: the parcel, the building line and the permitted volume.',

  'partners.title': 'Partners',
  'partners.lede': 'We work with public institutions and companies that need precise data, and with the technology makers whose tools we use every day.',
  'pa1.r': 'Technology partner · official dealer for Kosovo',
  'pa5.r': 'Technology partner · surveying instrument supplier · Hexagon AB',
  'pa6.r': 'Technology partner · Leica instrument supply',
  'pa7.r': 'Private sector · construction',
  'pa2.n': 'Government of Kosovo', 'pa2.r': 'Public institution',
  'pa3.n': 'Municipality of Prishtina', 'pa3.r': 'Public institution',
  'pa4.r': 'Private sector · distribution',

  'contact.title': 'Order a survey',
  'contact.lede': 'Tell us where the site is and what you need. We will reply with a quote.',
  'contact.call': 'Call',
  'form.sheet': 'Order sheet',
  'form.name': 'Full name',
  'form.phone': 'Phone',
  'form.muni': 'Municipality',
  'form.service': 'Service',
  'form.msg': 'Description',
  'form.msg.ph': 'e.g. boundary survey for a parcel in Fushë Kosovë, about 800 m²',
  'form.send': 'Send request',
  'form.note': 'Your request opens in your email app, ready to send.',
  'form.err.name': 'Please enter your name.',
  'form.err.contact': 'Leave us a phone number or a valid email.',

  'footer.sign1': 'A clear vision,',
  'footer.nav': 'Footer',
  'footer.rights': 'All rights reserved.',
  'credits.terrain': 'Terrain',
  'credits.map': 'Cartography',
};

// Strings used from scripts only (not present in the DOM).
const runtime: Record<Lang, Record<string, string>> = {
  sq: {
    'form.muni.pick': 'Zgjidhni komunën',
    'form.service.pick': 'Zgjidhni shërbimin',
    'svc.traffic': 'Inxhinieri trafiku',
    'svc.ptv': 'Licencë PTV (Visum / Vissim)',
    'svc.arch': 'Projektim arkitektonik',
    'svc.other': 'Tjetër',
    'form.ok': 'U hap emaili me kërkesën tuaj. Nëse nuk u hap, na shkruani në muzafer.mustafa@geoinfo-ks.com.',
    'form.subject': 'Kërkesë për ofertë',
    'menu.close': 'Mbyll menynë',
    'menu.open': 'Hap menynë',
    'title': 'GeoInfo — Gjeodezi, kadastër dhe trafik në Kosovë',
  },
  en: {
    'form.muni.pick': 'Choose a municipality',
    'form.service.pick': 'Choose a service',
    'svc.traffic': 'Traffic engineering',
    'svc.ptv': 'PTV licence (Visum / Vissim)',
    'svc.arch': 'Architectural design',
    'svc.other': 'Other',
    'form.ok': 'Your email app opened with the request. If it did not, write to muzafer.mustafa@geoinfo-ks.com.',
    'form.subject': 'Quote request',
    'menu.close': 'Close menu',
    'menu.open': 'Open menu',
    'title': 'GeoInfo — Geodesy, cadastre and traffic in Kosovo',
  },
};

const sq: Record<string, string> = {};
const sqAttr: Record<string, string> = {};
let current: Lang = 'sq';
const listeners = new Set<(l: Lang) => void>();

export function lang(): Lang { return current; }
export function t(key: string): string {
  return runtime[current][key] ?? (current === 'en' ? en[key] : sq[key]) ?? sq[key] ?? key;
}
export function onLang(fn: (l: Lang) => void) { listeners.add(fn); }

function capture() {
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const k = el.dataset.i18n!;
    if (!(k in sq)) sq[k] = el.innerHTML;
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr!.split(';').forEach((pair) => {
      const [attr, k] = pair.split(':');
      if (!(k in sqAttr)) sqAttr[k] = el.getAttribute(attr) ?? '';
    });
  });
}

export function setLang(l: Lang, persist = true) {
  current = l;
  const dict = l === 'en' ? en : sq;
  document.documentElement.lang = l;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const v = dict[el.dataset.i18n!] ?? sq[el.dataset.i18n!];
    if (v != null && el.innerHTML !== v) el.innerHTML = v;
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr!.split(';').forEach((pair) => {
      const [attr, k] = pair.split(':');
      const v = l === 'en' ? en[k] ?? sqAttr[k] : sqAttr[k];
      if (v != null) el.setAttribute(attr, v);
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
  document.title = runtime[l].title;
  if (persist) { try { localStorage.setItem('gi-lang', l); } catch { /* private mode */ } }
  listeners.forEach((fn) => fn(l));
}

export function initI18n() {
  capture();
  const start = document.documentElement.lang === 'en' ? 'en' : 'sq';
  if (start === 'en') setLang('en', false); else current = 'sq';
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang as Lang));
  });
}
