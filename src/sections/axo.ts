import { gsap } from 'gsap';
import { svgEl } from '../map/plates';
import { lang, onLang } from '../i18n';

type P3 = [number, number, number];
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;

// Isometric drawing: parcel -> building line -> permitted volume, scrubbed by scroll.
export function initAxo(reduced: boolean) {
  const svg = document.getElementById('axoSvg') as unknown as SVGSVGElement | null;
  if (!svg) return;
  const K = 9.2, OX = 360, OY = 300;
  const iso = ([x, y, z]: P3): [number, number] => [OX + (x - y) * C30 * K, OY + (x + y) * S30 * K - z * K];
  const pd = (pts: P3[], close = true) => `M${pts.map((p) => iso(p).map((v) => v.toFixed(1)).join(' ')).join('L')}${close ? 'Z' : ''}`;
  const L = (sq: string, en: string) => (lang() === 'sq' ? sq : en);
  const num = (v: number, d = 2) => v.toFixed(d).replace('.', lang() === 'sq' ? ',' : '.');

  const parcel: P3[] = [[-18, -15, 0], [19, -16, 0], [20, 15, 0], [-19, 16, 0]];
  const area = Math.abs(parcel.reduce((a, p, i) => { const q = parcel[(i + 1) % 4]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  const b = { x0: -12, x1: 12, y0: -10, y1: 9 };
  const FLOORS = 5, FH = 3.2, HMAX = FLOORS * FH;

  let state = { parcel: 0, setback: 0, h: 0, dims: 0 };
  const build = () => {
    svg.replaceChildren();
    const ground = svgEl('g', {}, svg);
    for (let i = -30; i <= 30; i += 5) {
      svgEl('path', { class: 'ground', d: pd([[i, -30, 0], [i, 30, 0]], false) }, ground);
      svgEl('path', { class: 'ground', d: pd([[-30, i, 0], [30, i, 0]], false) }, ground);
    }
    // gentle terrain contours under the plot
    const cont = svgEl('g', {}, svg);
    for (let k = 0; k < 4; k++) {
      const pts: P3[] = [];
      for (let t = 0; t <= 24; t++) { const x = -30 + t * 2.5; pts.push([x, -26 + k * 7 + Math.sin(t / 3.4 + k) * 2.6, 0]); }
      svgEl('path', { class: 'contour', d: pd(pts, false) }, cont);
    }
    // street along the front edge
    svgEl('path', { d: pd([[-30, 20, 0], [30, 20, 0], [30, 27, 0], [-30, 27, 0]]), fill: '#e3e6df', stroke: 'none' }, svg);
    svgEl('path', { d: pd([[-30, 23.5, 0], [30, 23.5, 0]], false), fill: 'none', stroke: 'var(--ink-3)', 'stroke-width': 0.8, 'stroke-dasharray': '6 5' }, svg);
    const street = svgEl('text', { class: 'tag', x: iso([24, 23.5, 0])[0], y: iso([24, 23.5, 0])[1] + 4, 'text-anchor': 'middle' }, svg);
    street.textContent = L('Rruga', 'Street');
    // trees
    const trees = svgEl('g', { class: 'tree' }, svg);
    [[-24, -8], [-25, 6], [25, -10], [26, 4], [-10, -24], [8, -25]].forEach(([x, y]) => { const [sx, sy] = iso([x, y, 0]); svgEl('circle', { cx: sx, cy: sy - 6, r: 9 }, trees); });

    const pEl = svgEl('path', { class: 'parcel', d: pd(parcel) }, svg);
    const plen = pEl.getTotalLength();
    pEl.style.strokeDasharray = state.parcel < 1 ? `${plen * state.parcel} ${plen}` : '';
    pEl.style.fillOpacity = String(Math.max(0, state.parcel * 2 - 1));
    if (state.parcel > 0.95) parcel.forEach((p) => { const [x, y] = iso(p); svgEl('circle', { class: 'stone', cx: x, cy: y, r: 4.5 }, svg); });

    const sb: P3[] = [[b.x0 - 2, b.y0 - 2, 0], [b.x1 + 2, b.y0 - 2, 0], [b.x1 + 2, b.y1 + 2, 0], [b.x0 - 2, b.y1 + 2, 0]];
    if (state.setback > 0) {
      const s = svgEl('path', { class: 'setback', d: pd(sb), opacity: state.setback }, svg);
      void s;
      const [tx, ty] = iso([b.x1 + 2, b.y1 + 6, 0]);
      const t = svgEl('text', { x: tx + 4, y: ty + 12, opacity: state.setback }, svg);
      t.textContent = `${L('Vija e ndërtimit', 'Building line')} ${num(16 - (b.y1 + 2))} m`;
    }

    // building
    const h = state.h * HMAX;
    if (h > 0.05) {
      const { x0, x1, y0, y1 } = b;
      svgEl('path', { class: 'face-r', d: pd([[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]]) }, svg);
      svgEl('path', { class: 'face-l', d: pd([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]]) }, svg);
      const fl = svgEl('g', {}, svg);
      for (let f = 1; f * FH < h; f++) {
        const z = f * FH;
        svgEl('path', { class: 'floor', d: pd([[x0, y1, z], [x1, y1, z], [x1, y0, z]], false) }, fl);
      }
      for (let f = 0; f * FH + 1 < h; f++) {
        const z0 = f * FH + 0.9, z1 = Math.min(h - 0.3, f * FH + 2.5);
        if (z1 <= z0) continue;
        for (let x = x0 + 1.5; x < x1 - 1; x += 3) svgEl('path', { class: 'win', d: pd([[x, y1, z0], [x + 1.6, y1, z0], [x + 1.6, y1, z1], [x, y1, z1]]) }, fl);
        for (let y = y0 + 1.5; y < y1 - 1; y += 3) svgEl('path', { class: 'win', d: pd([[x1, y, z0], [x1, y + 1.6, z0], [x1, y + 1.6, z1], [x1, y, z1]]), opacity: 0.55 }, fl);
      }
      svgEl('path', { class: 'face-top', d: pd([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]]) }, svg);
    }

    if (state.dims > 0) {
      const g = svgEl('g', { opacity: state.dims }, svg);
      const { x0, x1, y0, y1 } = b;
      // height
      const a = iso([x1 + 3, y0, 0]), c = iso([x1 + 3, y0, HMAX]);
      svgEl('path', { class: 'dimline', d: `M${a[0]} ${a[1]}L${c[0]} ${c[1]}M${a[0] - 4} ${a[1]}h8M${c[0] - 4} ${c[1]}h8` }, g);
      const ht = svgEl('text', { x: c[0] + 8, y: (a[1] + c[1]) / 2 }, g);
      ht.textContent = `H = ${num(HMAX)} m · P+${FLOORS - 1}`;
      // width
      const w0 = iso([x0, y1 + 4, 0]), w1 = iso([x1, y1 + 4, 0]);
      svgEl('path', { class: 'dimline', d: `M${w0[0]} ${w0[1]}L${w1[0]} ${w1[1]}` }, g);
      const wt = svgEl('text', { x: (w0[0] + w1[0]) / 2, y: (w0[1] + w1[1]) / 2 + 16, 'text-anchor': 'middle' }, g);
      wt.textContent = `${num(x1 - x0)} m`;
      const tag = svgEl('text', { class: 'tag', x: iso(parcel[0])[0] - 10, y: iso(parcel[0])[1] - 14, 'text-anchor': 'end' }, g);
      tag.textContent = `${L('Parcela', 'Parcel')} P-01 · ${num(area, 0)} m²`;
      const fp = (x1 - x0) * (y1 - y0);
      const t2 = svgEl('text', { x: iso(parcel[0])[0] - 10, y: iso(parcel[0])[1] + 2, 'text-anchor': 'end' }, g);
      t2.textContent = `${L('Shfrytëzimi', 'Coverage')} ${num((fp / area) * 100, 0)} %`;
    }
  };

  if (reduced) { state = { parcel: 1, setback: 1, h: 1, dims: 1 }; build(); onLang(build); return; }
  build();
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '#axo', start: 'top 80%', end: 'bottom 35%', scrub: 0.7 },
    onUpdate: build,
  });
  tl.to(state, { parcel: 1, duration: 0.3, ease: 'power1.inOut' })
    .to(state, { setback: 1, duration: 0.12 })
    .to(state, { h: 1, duration: 0.45, ease: 'power2.out' })
    .to(state, { dims: 1, duration: 0.13 });
  onLang(build);
}
