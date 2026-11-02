import { gsap } from 'gsap';
import { printPlates, svgEl, View, M_PER_UNIT, type MapData, type Box } from './plates';
import { unitToGK, llToUnit, elevAt, bearing, dms, group, fmtDist } from './geo';
import { roll } from '../lib/roll';
import { lang, onLang } from '../i18n';

const CITY: [number, number] = [42.6629, 21.1655];

const SHOW_SUBURBS = new Set(['Arbëri', 'Dardania', 'Ulpianë', 'Sofali', 'Kodra e Trimave', 'Bregu i Diellit', 'Tophane', 'Kalabria', 'Mati 1', 'Prishtina e Re', 'Çamëria', 'Velani', 'Lakrishtë', 'Zona Industriale']);
const RENAME: Record<string, string> = { 'Gračanica': 'Graçanicë', 'Gračanka': 'Graçankë', 'Çagllavicë (Prishtinë)': 'Çagllavicë', 'Çagllavicë (Graçanicë)': '' };

interface Ctx {
  d: MapData;
  host: HTMLElement;
  view: View;
  labels: SVGSVGElement;
  survey: SVGSVGElement;
  measure: SVGSVGElement;
  reduced: boolean;
}

export async function initSheet(reduced: boolean) {
  const host = document.getElementById('heroMap');
  if (!host) return;
  const d = (await import('../data/map-data.json')).default as unknown as MapData;
  host.classList.add('mapview');

  // buildings exist only for the city centre; at sheet scale they read as a cut-out block
  const { plates, setBox } = printPlates(d, host, { buildings: false });
  const labels = svgEl('svg', { class: 'plate p-label' }, host);
  const survey = svgEl('svg', { class: 'plate p-survey' }, host);
  const measure = svgEl('svg', { class: 'plate p-measure' }, host);
  const view = new View();
  const ctx: Ctx = { d, host, view, labels, survey, measure, reduced };

  const layout = () => {
    const cw = host.clientWidth, ch = host.clientHeight;
    const narrow = cw < 700;
    // metres per screen pixel: ~14 m on a phone, ~8.5 m on a wide screen
    const mpp = narrow ? 13 : gsap.utils.clamp(8, 11, 11 - (cw - 900) * 0.004);
    const upp = mpp / M_PER_UNIT;
    const w = cw * upp, h = ch * upp;
    const [fx, fy] = llToUnit(d.proj, CITY[0], CITY[1]);
    const ax = narrow ? 0.5 : 0.6, ay = narrow ? 0.66 : 0.5;
    const box: Box = {
      x: gsap.utils.clamp(0, d.view[0] - w, fx - w * ax),
      y: gsap.utils.clamp(0, d.view[1] - h, fy - h * ay),
      w, h,
    };
    view.set(box, cw, ch);
    setBox(box);
    drawLabels(ctx);
    drawTicks(ctx);
    drawScale(ctx);
    traverse.restart();
    redrawMeasure();
  };

  const traverse = makeTraverse(ctx);
  const { redraw: redrawMeasure } = makeProbe(ctx);

  let rto = 0;
  new ResizeObserver(() => { clearTimeout(rto); rto = window.setTimeout(layout, 120); }).observe(host);
  layout();
  onLang(() => { drawLabels(ctx); drawScale(ctx); redrawMeasure(); });

  intro(plates, reduced, () => traverse.start());
}

/* ---------------- print sequence: plates come into register ---------------- */
function intro(plates: Record<string, SVGSVGElement>, reduced: boolean, done: () => void) {
  const order = [plates.veg, plates.hydro, plates.contour, plates.black];
  const rest = document.querySelectorAll('#heroMap .p-label, #heroTicks');
  if (reduced) { done(); return; }
  const offs = [[-7, 5], [6, -4], [-4, -6], [5, 4]];
  const tl = gsap.timeline({ delay: 0.15, onComplete: done });
  order.forEach((p, i) => {
    tl.fromTo(p, { opacity: 0, x: offs[i][0], y: offs[i][1] }, { opacity: 1, duration: 0.5, ease: 'power2.out' }, i * 0.26)
      .to(p, { x: 0, y: 0, duration: 0.7, ease: 'expo.out' }, i * 0.26 + 0.32);
  });
  tl.fromTo(rest, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 1.15);
}

/* ---------------- labels in screen space, set like a map ---------------- */
function drawLabels(c: Ctx) {
  const { d, view, labels } = c;
  labels.replaceChildren();
  labels.setAttribute('width', String(view.cw));
  labels.setAttribute('height', String(view.ch));
  const placed: [number, number, number, number][] = [];
  const free = (x: number, y: number, w: number, h: number) => {
    if (x < 6 || y < 12 || x + w > view.cw - 6 || y + h > view.ch - 6) return false;
    return placed.every(([a, b, cw, chh]) => x > a + cw + 8 || x + w + 8 < a || y > b + chh + 4 || y + h + 4 < b);
  };
  const put = (txt: string, cls: string, x: number, y: number, size: number, track: number, opts: { anchor?: 'start' | 'middle'; rot?: number; force?: boolean } = {}) => {
    const w = txt.length * size * (0.62 + track);
    const lx = opts.anchor === 'start' ? x : x - w / 2;
    if (!opts.force && !free(lx, y - size, w, size * 1.3)) return null;
    placed.push([lx, y - size, w, size * 1.3]);
    const tEl = svgEl('text', { class: cls, x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': opts.anchor ?? 'middle' }, labels);
    if (opts.rot) tEl.setAttribute('transform', `rotate(${opts.rot} ${x.toFixed(1)} ${y.toFixed(1)})`);
    tEl.textContent = txt;
    return tEl;
  };
  const city = d.places.find((p) => p.k === 'city');
  if (city) { const [x, y] = view.toScreen(city.x, city.y); put('PRISHTINË', 'city', x, y + 4, 15, 0.32, { force: true }); }
  for (const p of d.places.filter((q) => q.k === 'town')) {
    const n = RENAME[p.n] ?? p.n; if (!n) continue;
    const [x, y] = view.toScreen(p.x, p.y); put(n.toUpperCase(), 'town', x, y, 11.5, 0.16);
  }
  // relief and hydro names
  {
    const [gx, gy] = llToUnit(d.proj, 42.676, 21.228); const [x, y] = view.toScreen(gx, gy);
    put('GËRMIA', 'relief', x, y, 11, 0.5, { rot: -18 });
    const [lx, ly] = llToUnit(d.proj, 42.6235, 21.241); const [x2, y2] = view.toScreen(lx, ly);
    put(lang() === 'sq' ? 'Liqeni i Badovcit' : 'Badovc Lake', 'hydro', x2, y2, 11, 0.06);
  }
  for (const h of d.hydroLabels) {
    const [x, y] = view.toScreen(h.x, h.y); const n = RENAME[h.n] ?? h.n;
    put(n, 'hydro', x, y - 4, 11, 0.06, { rot: h.a });
  }
  for (const p of d.places.filter((q) => q.k === 'suburb' && SHOW_SUBURBS.has(q.n))) {
    const [x, y] = view.toScreen(p.x, p.y); put(p.n.toUpperCase(), 'suburb', x, y, 9.5, 0.08);
  }
  for (const p of d.places.filter((q) => q.k === 'village')) {
    const n = RENAME[p.n] ?? p.n; if (!n) continue;
    const [x, y] = view.toScreen(p.x, p.y); put(n, 'village', x, y, 10, 0.02);
  }
  for (const s of d.spots) {
    const [x, y] = view.toScreen(s.x, s.y);
    if (put(String(s.h), 'spot', x + 5, y + 3, 9, 0, { anchor: 'start' })) svgEl('circle', { class: 'spot-dot', cx: x.toFixed(1), cy: y.toFixed(1), r: 1.8 }, labels);
  }
}

/* ---------------- neatline ticks with KOSOVAREF01 grid values ---------------- */
function drawTicks(c: Ctx) {
  const box = document.getElementById('heroTicks');
  if (!box) return;
  const { view, d, host } = c;
  box.replaceChildren();
  const band = host.offsetLeft;
  const tl = unitToGK(d.proj, view.vb.x, view.vb.y);
  const br = unitToGK(d.proj, view.vb.x + view.vb.w, view.vb.y + view.vb.h);
  const km = view.cw < 700 ? 2000 : 1000;
  const mk = (cls: string, css: Partial<CSSStyleDeclaration>, html?: string) => {
    const n = document.createElement('div'); n.className = cls; Object.assign(n.style, css);
    if (html) n.innerHTML = html; box.appendChild(n); return n;
  };
  for (let e = Math.ceil(tl[0] / km) * km; e < br[0]; e += km) {
    const sx = band + ((e - tl[0]) / (br[0] - tl[0])) * view.cw;
    const s = String(Math.round(e / 1000));
    const lab = `${s.slice(0, -2)}<b>${s.slice(-2)}</b>`;
    mk('tick tick--top', { left: `${sx}px` }, lab);
    mk('tick tick--bottom', { left: `${sx}px` }, lab);
    mk('tick-mark tick-mark--v', { left: `${sx}px`, top: `${band - 6}px` });
    mk('tick-mark tick-mark--v', { left: `${sx}px`, top: `${band + view.ch}px` });
  }
  const crossesE: number[] = [], crossesN: number[] = [];
  for (let n = Math.ceil(br[1] / km) * km; n < tl[1]; n += km) {
    const sy = band + ((tl[1] - n) / (tl[1] - br[1])) * view.ch;
    const s = String(Math.round(n / 1000));
    const lab = `${s.slice(0, -2)}<b>${s.slice(-2)}</b>`;
    mk('tick tick--left', { top: `${sy}px` }, lab);
    mk('tick tick--right', { top: `${sy}px` }, lab);
    mk('tick-mark tick-mark--h', { top: `${sy}px`, left: `${band - 6}px` });
    mk('tick-mark tick-mark--h', { top: `${sy}px`, left: `${band + view.cw}px` });
    crossesN.push(sy);
  }
  for (let e = Math.ceil(tl[0] / km) * km; e < br[0]; e += km) crossesE.push(band + ((e - tl[0]) / (br[0] - tl[0])) * view.cw);
  // grid crosses inside the map face, every other intersection
  crossesE.forEach((x, i) => crossesN.forEach((y, j) => { if ((i + j) % 2 === 0) mk('cross', { left: `${x}px`, top: `${y}px` }); }));
}

function drawScale(c: Ctx) {
  const mpp = c.view.upp * M_PER_UNIT;
  const target = (c.view.cw < 700 ? 120 : 170) * mpp;
  const nice = [250, 500, 1000, 2000, 2500, 5000].reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
  const bar = document.getElementById('scalebar');
  if (!bar) return;
  bar.style.width = `${(nice / mpp).toFixed(1)}px`;
  const sep = lang() === 'sq' ? ',' : '.';
  const f = (m: number) => (m >= 1000 ? `${String(m / 1000).replace('.', sep)}` : String(m));
  const unit = nice >= 1000 ? 'km' : 'm';
  document.getElementById('sbMid')!.textContent = f(nice / 2);
  document.getElementById('sbEnd')!.textContent = `${f(nice)} ${unit}`;
}

/* ---------------- live traverse: station shoots, readout resolves ---------------- */
function makeTraverse(c: Ctx) {
  const ro = {
    st: document.getElementById('roStation')!, hz: document.getElementById('roHz')!, v: document.getElementById('roV')!,
    sd: document.getElementById('roSD')!, e: document.getElementById('roE')!, n: document.getElementById('roN')!, h: document.getElementById('roH')!,
  };
  // stations around the city edge, targets as bearings/distances in metres
  const STATIONS: { ll: [number, number]; shots: [number, number][] }[] = [
    { ll: [42.6672, 21.1905], shots: [[318, 520], [24, 610], [96, 470], [168, 540], [236, 455]] },
    { ll: [42.6475, 21.1785], shots: [[290, 640], [355, 520], [62, 590], [140, 470], [210, 560]] },
    { ll: [42.6790, 21.1575], shots: [[250, 480], [320, 560], [40, 500], [110, 610], [180, 450]] },
  ];
  let si = 0;
  let tl: gsap.core.Timeline | null = null;
  let started = false;
  const onScreen = { v: true };
  new IntersectionObserver(([e]) => { onScreen.v = e.isIntersecting; if (tl) onScreen.v ? tl.resume() : tl.pause(); }).observe(c.host);

  const build = () => {
    const { d, view, survey } = c;
    survey.replaceChildren();
    survey.setAttribute('width', String(view.cw));
    survey.setAttribute('height', String(view.ch));
    const st = STATIONS[si % STATIONS.length];
    let [sx0, sy0] = llToUnit(d.proj, st.ll[0], st.ll[1]);
    let reach = 1;
    // on a narrow sheet, set up in the clear band between the copy and the readout
    if (view.cw < 700) {
      const mr = c.host.getBoundingClientRect();
      const copy = document.querySelector('.hero__copy')!.getBoundingClientRect();
      const roTop = document.getElementById('readout')!.getBoundingClientRect().top;
      const top = copy.bottom - mr.top + 30, bottom = roTop - mr.top - 30;
      const sy = bottom > top ? (top + bottom) / 2 : view.ch * 0.6;
      const sx = view.cw * [0.74, 0.28, 0.7][si % 3];
      [sx0, sy0] = view.toData(sx, sy);
      reach = gsap.utils.clamp(0.35, 0.8, ((bottom - top) / 2 - 12) * view.upp * M_PER_UNIT / 640);
    }
    const sGK = unitToGK(d.proj, sx0, sy0);
    const sH = elevAt(d.elev, sx0, sy0) + 1.55; // instrument height
    const [px, py] = view.toScreen(sx0, sy0);
    const g = svgEl('g', {}, survey);
    const bound = svgEl('path', { class: 'bound', d: '' }, g);
    const rays = svgEl('g', {}, g);
    const dims = svgEl('g', {}, g);
    const pulse = svgEl('circle', { class: 'pulse', cx: px, cy: py, r: 6 }, g);
    const stn = svgEl('g', { class: 'station', transform: `translate(${px.toFixed(1)} ${py.toFixed(1)})` }, g);
    svgEl('path', { d: 'M0 -11 9.5 6H-9.5Z' }, stn);
    svgEl('circle', { cx: 0, cy: 1.2, r: 1.8 }, stn);
    const stLbl = svgEl('text', { class: 'dim', x: (px + 12).toFixed(1), y: (py - 8).toFixed(1) }, g);
    const stName = `ST-${String(4 + (si % STATIONS.length) * 3).padStart(2, '0')}`;
    stLbl.textContent = stName;

    const upm = 1 / M_PER_UNIT;
    const pts = st.shots.map(([brg, dist0]) => {
      const dist = dist0 * reach;
      const r = (brg * Math.PI) / 180;
      const ux = sx0 + Math.sin(r) * dist * upm, uy = sy0 - Math.cos(r) * dist * upm;
      const gkp = unitToGK(d.proj, ux, uy);
      const H = elevAt(d.elev, ux, uy) + 0.12;
      const hd = Math.hypot(gkp[0] - sGK[0], gkp[1] - sGK[1]);
      const dh = H - sH;
      return { s: view.toScreen(ux, uy), gk: gkp, H, hz: bearing(sGK, gkp), v: 90 - (Math.atan2(dh, hd) * 180) / Math.PI, sd: Math.hypot(hd, dh) };
    });

    tl?.kill();
    tl = gsap.timeline({ paused: !onScreen.v, onComplete: () => { si++; build(); } });
    tl.call(() => { roll(ro.st, stName, 400, c.reduced); });
    tl.fromTo(stn, { scale: 0.2, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' });
    tl.fromTo(stLbl, { opacity: 0 }, { opacity: 1, duration: 0.3 }, '<0.2');
    tl.fromTo(pulse, { attr: { r: 6 }, opacity: 0.9 }, { attr: { r: 46 }, opacity: 0, duration: 1.4, ease: 'power2.out', repeat: -1 }, 0);

    const shotEls: SVGCircleElement[] = [];
    pts.forEach((p, i) => {
      const ray = svgEl('line', { class: 'ray', x1: px, y1: py, x2: px, y2: py }, rays);
      const dot = svgEl('circle', { class: 'shot', cx: p.s[0], cy: p.s[1], r: 3.6, opacity: 0 }, rays);
      shotEls.push(dot);
      tl!.to(ray, { attr: { x2: p.s[0], y2: p.s[1] }, duration: 0.55, ease: 'power3.inOut' }, `+=${i === 0 ? 0.25 : 0.5}`)
        .set(dot, { opacity: 1 })
        .call(() => {
          dot.classList.add('hit');
          roll(ro.hz, dms(p.hz), 650, c.reduced);
          roll(ro.v, dms(p.v), 650, c.reduced);
          roll(ro.sd, `${p.sd.toFixed(3).padStart(8, '0')} m`, 650, c.reduced);
          roll(ro.e, group(p.gk[0]), 800, c.reduced);
          roll(ro.n, group(p.gk[1]), 800, c.reduced);
          roll(ro.h, `${p.H.toFixed(2)} m`, 800, c.reduced);
        })
        .fromTo(dot, { attr: { r: 7 } }, { attr: { r: 3.6 }, duration: 0.4, ease: 'power2.out' })
        .to(ray, { opacity: 0.35, duration: 0.6 }, '+=0.35')
        .call(() => dot.classList.remove('hit'));
    });
    // close the boundary through the measured points, annotate the legs
    const dPath = `M${pts.map((p) => `${p.s[0].toFixed(1)} ${p.s[1].toFixed(1)}`).join('L')}Z`;
    bound.setAttribute('d', dPath);
    const len = bound.getTotalLength();
    tl.fromTo(bound, { strokeDasharray: `0 ${len}`, fillOpacity: 0 }, { strokeDasharray: `${len} 0`, duration: 1.3, ease: 'power2.inOut' }, '+=0.2')
      .to(bound, { fillOpacity: 1, duration: 0.6 }, '-=0.3');
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const dist = Math.hypot(q.gk[0] - p.gk[0], q.gk[1] - p.gk[1]);
      let ang = (Math.atan2(q.s[1] - p.s[1], q.s[0] - p.s[0]) * 180) / Math.PI;
      if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
      const mx = (p.s[0] + q.s[0]) / 2, my = (p.s[1] + q.s[1]) / 2;
      const tx = svgEl('text', { class: 'dim', x: mx.toFixed(1), y: (my - 5).toFixed(1), 'text-anchor': 'middle', transform: `rotate(${ang.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)})`, opacity: 0 }, dims);
      tx.textContent = `${dist.toFixed(2)} m`;
    });
    // shoelace area in GK metres
    let A = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; A += p.gk[0] * q.gk[1] - q.gk[0] * p.gk[1]; });
    const cx = pts.reduce((a, p) => a + p.s[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p.s[1], 0) / pts.length;
    const area = svgEl('text', { class: 'dim', x: cx.toFixed(1), y: (cy + 18).toFixed(1), 'text-anchor': 'middle', opacity: 0, 'font-weight': 700 }, dims);
    const ha = Math.abs(A / 2) / 10000;
    area.textContent = `P = ${ha.toFixed(2)} ha`;
    tl.to(dims.children, { opacity: 1, duration: 0.4, stagger: 0.08 }, '-=0.4');
    tl.to(g, { opacity: 0, duration: 0.6, ease: 'power1.in' }, '+=3.2');
  };

  return {
    start() { started = true; build(); },
    restart() { if (started) build(); },
  };
}

/* ---------------- probe: reticle, live coordinates, click to measure ---------------- */
function makeProbe(c: Ctx) {
  const probe = document.getElementById('probe')!;
  const px = probe.querySelector<HTMLElement>('.probe__x')!, py = probe.querySelector<HTMLElement>('.probe__y')!;
  const tag = probe.querySelector<HTMLElement>('.probe__tag')!;
  const tE = tag.querySelector('.probe__e')!, tN = tag.querySelector('.probe__n')!, tH = tag.querySelector('.probe__h')!;
  const clear = document.getElementById('measureClear') as HTMLButtonElement;
  const pts: [number, number][] = [];
  const fine = matchMedia('(pointer: fine)').matches;

  const redraw = () => {
    const { measure, view, d } = c;
    measure.replaceChildren();
    measure.setAttribute('width', String(view.cw));
    measure.setAttribute('height', String(view.ch));
    if (!pts.length) { clear.hidden = true; return; }
    clear.hidden = false;
    const sp = pts.map(([x, y]) => view.toScreen(x, y));
    const dd = `M${sp.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`;
    svgEl('path', { class: 'mline-under', d: dd }, measure);
    svgEl('path', { class: 'mline', d: dd }, measure);
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = unitToGK(d.proj, ...pts[i - 1]), b = unitToGK(d.proj, ...pts[i]);
      const m = Math.hypot(b[0] - a[0], b[1] - a[1]); total += m;
      const [x0, y0] = sp[i - 1], [x1, y1] = sp[i];
      const tx = svgEl('text', { x: ((x0 + x1) / 2 + 6).toFixed(1), y: ((y0 + y1) / 2 - 6).toFixed(1) }, measure);
      tx.textContent = `${fmtDist(m, lang())} · ${dms(bearing(a, b)).replace(/″$/, '″')}`;
    }
    sp.forEach(([x, y]) => svgEl('circle', { class: 'mpt', cx: x.toFixed(1), cy: y.toFixed(1), r: 4.2 }, measure));
    if (pts.length > 1) {
      const [lx, ly] = sp[sp.length - 1];
      const tt = svgEl('text', { class: 'total', x: (lx + 8).toFixed(1), y: (ly + 16).toFixed(1) }, measure);
      tt.textContent = `Σ ${fmtDist(total, lang())}`;
    }
  };

  clear.addEventListener('click', (e) => { e.stopPropagation(); pts.length = 0; redraw(); });
  if (!fine) return { redraw };

  const map = c.host;
  map.classList.add('is-probing');
  let raf = 0;
  const move = (ev: PointerEvent) => {
    const r = map.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) { probe.classList.remove('is-on'); return; }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      probe.classList.add('is-on');
      px.style.transform = `translateY(${y}px)`;
      py.style.transform = `translateX(${x}px)`;
      const flip = x > r.width - 170;
      tag.style.transform = `translate(${flip ? x - 160 : x + 14}px, ${y + 14}px)`;
      const [ux, uy] = c.view.toData(x, y);
      const [E, N] = unitToGK(c.d.proj, ux, uy);
      tE.textContent = `E ${group(E, 1)}`;
      tN.textContent = `N ${group(N, 1)}`;
      tH.textContent = `H ${elevAt(c.d.elev, ux, uy).toFixed(1)} m`;
    });
  };
  // the map sits under the copy; listen on the sheet and ignore UI hits
  const sheet = map.parentElement!;
  sheet.addEventListener('pointermove', (ev) => {
    const t = ev.target as HTMLElement;
    if (t.closest('.hero__copy, .readout, .measure-hint')) { probe.classList.remove('is-on'); return; }
    move(ev);
  });
  sheet.addEventListener('pointerleave', () => probe.classList.remove('is-on'));
  sheet.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    if (t.closest('.hero__copy, .readout, .measure-hint, a, button')) return;
    const r = map.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    if (pts.length >= 8) pts.shift();
    pts.push(c.view.toData(x, y));
    redraw();
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pts.length) { pts.length = 0; redraw(); } });
  return { redraw };
}
