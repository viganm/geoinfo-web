import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { contours } from 'd3-contour';
import { printPlates, svgEl, View, M_PER_UNIT, type MapData, type Box } from '../map/plates';
import { llToUnit, unitToGK, unitToLL, elevAt, group } from '../map/geo';
import { createCadastre, fromUV, toUV, boxCorners, m2u, M_UNIT, type Cadastre, type OBB } from '../map/cadastre';
import { lang, onLang } from '../i18n';

type Pt = [number, number];
interface SceneCtx { g: SVGGElement; view: View; d: MapData; at: (mx: number, my: number) => Pt; mpp: number; tl: gsap.core.Timeline; L: (k: string) => string; pick?: unknown; cad?: Cadastre }
interface Scene {
  ll: [number, number]; mpp: number; draw: (c: SceneCtx) => void;
  /** Optional: frame the scene on real geometry. spanM is the width the drawing needs. */
  setup?: (cad: Cadastre, d: MapData) => { center: [number, number]; spanM: number; data: unknown } | null;
}

const words: Record<string, [string, string]> = {
  parcel: ['Parcela', 'Parcel'],
  area: ['S', 'A'],
  stake: ['Piketa', 'Stake'],
  asbuilt: ['As-built', 'As-built'],
  axis: ['Aksi i rrugës', 'Road axis'],
  water: ['Ujësjellës', 'Water main'],
  sewer: ['Kanalizim', 'Sewer'],
  power: ['Kabllo elektrike', 'Power cable'],
  flood: ['Zona e përmbytshme', 'Flood zone'],
  level: ['Niveli i ujit', 'Water level'],
  trig: ['Pikë trigonometrike', 'Trig point'],
  flight: ['Linja e fluturimit', 'Flight line'],
  lot: ['Ngastra', 'Lot'],
  claimA: ['Pretendimi A', 'Claim A'],
  claimB: ['Pretendimi B', 'Claim B'],
  truth: ['Kufiri i matur', 'Surveyed boundary'],
  ease: ['Servitut kalimi', 'Right of way'],
  access: ['Rrugë hyrëse', 'Access road'],
  layers: ['Shtresat GIS', 'GIS layers'],
  lContour: ['Konturet', 'Contours'],
  lHydro: ['Hidrografia', 'Hydrography'],
  lRoads: ['Rrugët, ndërtesat', 'Roads, buildings'],
  lVeg: ['Pyjet', 'Forest'],
  tile: ['Ortofoto 500 m', 'Orthophoto 500 m'],
};

const fmt = (v: number, dec = 2) => v.toFixed(dec).replace('.', lang() === 'sq' ? ',' : '.');
const ptsD = (p: Pt[], close = true) => `M${p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}${close ? 'Z' : ''}`;

function text(g: SVGGElement, x: number, y: number, s: string, cls = '', anchor = 'middle', rot = 0) {
  const n = svgEl('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor, class: cls }, g);
  if (rot) n.setAttribute('transform', `rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`);
  n.textContent = s;
  return n;
}
function legLabel(g: SVGGElement, a: Pt, b: Pt, s: string, off = -6) {
  const raw = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  let ang = raw;
  if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
  const flip = ang === raw ? 1 : -1;
  const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
  const mx = (a[0] + b[0]) / 2 + (nx / nl) * off * flip, my = (a[1] + b[1]) / 2 + (ny / nl) * off * flip;
  return text(g, mx, my + 3, s, '', 'middle', ang);
}
function draw(tl: gsap.core.Timeline, el: SVGGeometryElement, dur = 1, pos: gsap.Position = '>') {
  const len = el.getTotalLength();
  tl.fromTo(el, { strokeDasharray: `0 ${len + 1}` }, { strokeDasharray: `${len + 1} 0`, duration: dur, ease: 'power2.inOut', onComplete: () => { el.style.strokeDasharray = ''; } }, pos);
}
const pop = (tl: gsap.core.Timeline, els: Element[] | Element, pos: gsap.Position = '>') =>
  tl.fromTo(els, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', transformBox: 'fill-box' }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)', stagger: 0.07 }, pos);
const fade = (tl: gsap.core.Timeline, els: Element[] | Element | HTMLCollection | NodeListOf<Element>, pos: gsap.Position = '>') =>
  tl.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.45, stagger: 0.05 }, pos);

const SCENES: Record<string, Scene> = {
  property: {
    ll: [42.6588, 21.1598], mpp: 0.3,
    // a single house: parcel bounded halfway to the neighbours and short of the street
    setup(cad, d) {
      const [tx, ty] = llToUnit(d.proj, 42.6588, 21.1598);
      const p = cad.pickParcel(tx, ty, { minA: 140, maxA: 520, minRect: 0.82, minMargin: 3 });
      if (!p) return null;
      const span = Math.max(p.box.u1 - p.box.u0, p.box.v1 - p.box.v0) * M_UNIT;
      const [cx, cy] = fromUV(p.b.obb, (p.box.u0 + p.box.u1) / 2, (p.box.v0 + p.box.v1) / 2);
      return { center: [cx, cy], spanM: span * 1.75, data: p };
    },
    draw({ g, tl, d, view, L, pick, cad }) {
      const p = pick as NonNullable<ReturnType<Cadastre['pickParcel']>>;
      const S = (q: Pt) => view.toScreen(q[0], q[1]);
      const o = p.b.obb;
      // the neighbouring parcels of the block, as the cadastral plan shows them
      const nb = svgEl('g', {}, g);
      for (const b of cad!.near(p.b.cx, p.b.cy, 90)) {
        const bi = cad!.blds.indexOf(b);
        if (bi === p.bi || b.area < 40) continue;
        const [bu, bv] = toUV(o, b.cx, b.cy);
        if (bu > p.box.u0 && bu < p.box.u1 && bv > p.box.v0 && bv < p.box.v1) continue;
        svgEl('path', { class: 'nb', d: ptsD(boxCorners(b.obb, cad!.fitParcel(bi, 7)).map(S)) }, nb);
      }
      const house = svgEl('path', { class: 'fp-main', d: ptsD(p.b.pts.map(S)) }, g);
      const corners = boxCorners(o, p.box);
      const sc = corners.map(S);
      const fill = svgEl('path', { class: 'b-fill', d: ptsD(sc) }, g);
      const line = svgEl('path', { class: 'b-line', d: ptsD(sc) }, g);
      // label in the widest yard
      const yards: [number, number, number][] = [
        [p.box.u1 - o.hw, (o.hw + p.box.u1) / 2, 0], [-o.hw - p.box.u0, (p.box.u0 - o.hw) / 2, 0],
        [p.box.v1 - o.hh, 0, (o.hh + p.box.v1) / 2], [-o.hh - p.box.v0, 0, (p.box.v0 - o.hh) / 2],
      ];
      const yard = yards.sort((a, b) => b[0] - a[0])[0];
      const [lx, ly] = S(fromUV(o, yard[1], yard[2]));
      // topographic shots in the yard, heights from the terrain model; kept off the boundary and the label
      const shots = svgEl('g', {}, g);
      const placed: Pt[] = [[lx - 20, ly], [lx + 20, ly]];
      const edge = m2u(2.2);
      const nU = 4, nV = 3;
      for (let i = 0; i <= nU; i++) for (let j = 0; j <= nV; j++) {
        const u = p.box.u0 + ((p.box.u1 - p.box.u0) * (i + 0.5)) / (nU + 1), v = p.box.v0 + ((p.box.v1 - p.box.v0) * (j + 0.5)) / (nV + 1);
        if (Math.abs(u) < o.hw + m2u(1.5) && Math.abs(v) < o.hh + m2u(1.5)) continue;
        if (u - p.box.u0 < edge || p.box.u1 - u < edge || v - p.box.v0 < edge || p.box.v1 - v < edge) continue;
        const q = fromUV(o, u, v), [sx, sy] = S(q);
        if (placed.some(([a, b]) => Math.abs(a - sx) < 58 && Math.abs(b - sy) < 22)) continue;
        placed.push([sx, sy]);
        const c = svgEl('g', {}, shots);
        svgEl('path', { d: `M${sx - 3} ${sy}h6M${sx} ${sy - 3}v6`, stroke: 'var(--ink)', 'stroke-width': 1 }, c);
        text(c, sx + 4, sy - 3, elevAt(d.elev, q[0], q[1]).toFixed(2), '', 'start').setAttribute('font-size', '8.5');
      }
      const legs = svgEl('g', {}, g);
      corners.forEach((a, i) => {
        const b = corners[(i + 1) % 4];
        legLabel(legs, sc[i], sc[(i + 1) % 4], `${fmt(Math.hypot(b[0] - a[0], b[1] - a[1]) * M_UNIT)} m`, -9);
      });
      const stones = sc.map(([x, y]) => svgEl('circle', { class: 'stone', cx: x, cy: y, r: 5 }, g));
      const lbl = svgEl('g', {}, g);
      text(lbl, lx, ly - 4, `${L('parcel')} P-01`, 'lbl');
      text(lbl, lx, ly + 10, `${L('area')} = ${fmt(p.area, 0)} m²`);
      fade(tl, nb.children, 0);
      fade(tl, house, 0.1);
      fade(tl, shots.children, 0.3);
      draw(tl, line, 1.4, 0.5);
      fade(tl, fill, '-=0.5');
      pop(tl, stones, '-=1.1');
      stones.forEach((s, i) => tl.call(() => s.classList.add('on'), [], 0.8 + i * 0.25));
      fade(tl, legs.children, '-=0.3');
      fade(tl, lbl, '-=0.2');
    },
  },
  construction: {
    ll: [42.6634, 21.1676], mpp: 0.15,
    // staking out one building: grid axes, corner stakes and batter-board offsets on its real footprint
    setup(cad, d) {
      const [tx, ty] = llToUnit(d.proj, 42.6634, 21.1676);
      const p = cad.pickParcel(tx, ty, { minA: 260, maxA: 1100, minRect: 0.9, minMargin: 4 });
      if (!p) return null;
      const o = p.b.obb;
      return { center: [o.cx, o.cy], spanM: (Math.max(o.hw, o.hh) * 2 * M_UNIT + 26) * 1.0, data: p };
    },
    draw({ g, tl, view, L, pick, d }) {
      const p = pick as NonNullable<ReturnType<Cadastre['pickParcel']>>;
      const o = p.b.obb;
      const S = (u: number, v: number) => { const q = fromUV(o, u, v); return view.toScreen(q[0], q[1]); };
      const ext = m2u(8), off = m2u(2);
      const plot = svgEl('path', { class: 'nb', d: ptsD(boxCorners(o, p.box).map((q) => view.toScreen(q[0], q[1]))) }, g);
      const fp = svgEl('path', { class: 'fp-main', d: ptsD(p.b.pts.map((q) => view.toScreen(q[0], q[1]))) }, g);
      const axes = svgEl('g', {}, g);
      [-o.hw, 0, o.hw].forEach((u, i) => {
        const a = S(u, -o.hh - ext), b = S(u, o.hh + ext);
        svgEl('path', { class: 'off', d: ptsD([a, b], false) }, axes);
        svgEl('circle', { cx: a[0], cy: a[1], r: 8, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 1 }, axes);
        text(axes, a[0], a[1] + 3.5, 'ABC'[i], 'lbl');
      });
      [-o.hh, o.hh].forEach((v, i) => {
        const a = S(-o.hw - ext, v), b = S(o.hw + ext, v);
        svgEl('path', { class: 'off', d: ptsD([a, b], false) }, axes);
        svgEl('circle', { cx: a[0], cy: a[1], r: 8, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 1 }, axes);
        text(axes, a[0], a[1] + 3.5, String(i + 1), 'lbl');
      });
      const board = svgEl('path', { class: 'board', d: ptsD([S(-o.hw - off, -o.hh - off), S(o.hw + off, -o.hh - off), S(o.hw + off, o.hh + off), S(-o.hw - off, o.hh + off)]) }, g);
      const cs: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const stakes = cs.map(([su, sv]) => {
        const [x, y] = S(su * o.hw, sv * o.hh);
        return svgEl('path', { class: 'stake', d: `M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10` }, g);
      });
      const dims = svgEl('g', {}, g);
      legLabel(dims, S(-o.hw, -o.hh - off), S(o.hw, -o.hh - off), `${fmt(o.hw * 2 * M_UNIT)} m`, -10);
      legLabel(dims, S(o.hw + off, -o.hh), S(o.hw + off, o.hh), `${fmt(o.hh * 2 * M_UNIT)} m`, 10);
      // real grid coordinates of corner C2
      const c2 = fromUV(o, o.hw, o.hh);
      const [E, N] = unitToGK(d.proj, c2[0], c2[1]);
      const [tx, ty] = S(o.hw, o.hh);
      const flip = tx + 170 > view.cw, side = flip ? -12 : 12, an = flip ? 'end' : 'start';
      const tag = svgEl('g', {}, g);
      text(tag, tx + side, ty + 18, `${L('stake')} C2`, 'lbl', an);
      text(tag, tx + side, ty + 32, `E ${group(E, 3)}`, '', an);
      text(tag, tx + side, ty + 46, `N ${group(N, 3)}`, '', an);
      fade(tl, plot, 0);
      fade(tl, axes.children, 0.1);
      draw(tl, fp, 1.1, 0.4);
      draw(tl, board, 1, '-=0.3');
      pop(tl, stakes, '-=0.4');
      fade(tl, dims.children);
      fade(tl, tag.children, '-=0.2');
    },
  },
  infra: {
    ll: [42.6598, 21.1722], mpp: 1.15,
    draw({ g, at, tl, L, mpp, view }) {
      const a = at(-260, -90), c1 = at(-120, -110), c2 = at(40, 160), b = at(250, 120);
      const dAx = `M${a[0]} ${a[1]}C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}`;
      const axis = svgEl('path', { class: 'axis', d: dAx }, g);
      const len = axis.getTotalLength();
      const edgeOff = 7 / mpp;
      const edges = svgEl('g', {}, g);
      const util = svgEl('g', {}, g);
      const sample = (off: number) => {
        const out: Pt[] = [];
        for (let s = 0; s <= len; s += 6) {
          const p = axis.getPointAtLength(s), q = axis.getPointAtLength(Math.min(len, s + 1));
          const nx = -(q.y - p.y), ny = q.x - p.x, nl = Math.hypot(nx, ny) || 1;
          out.push([p.x + (nx / nl) * off, p.y + (ny / nl) * off]);
        }
        return out;
      };
      svgEl('path', { d: ptsD(sample(edgeOff), false), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.2 }, edges);
      svgEl('path', { d: ptsD(sample(-edgeOff), false), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.2 }, edges);
      const uW = svgEl('path', { class: 'u-water', d: ptsD(sample(edgeOff + 4 / mpp), false) }, util);
      const uS = svgEl('path', { class: 'u-sewer', d: ptsD(sample(-edgeOff - 3 / mpp), false) }, util);
      const uP = svgEl('path', { class: 'u-power', d: ptsD(sample(edgeOff + 8 / mpp), false) }, util);
      const ticks = svgEl('g', {}, g);
      const stepM = 50, stepPx = stepM / mpp;
      for (let s = 0, k = 0; s <= len; s += stepPx, k++) {
        const p = axis.getPointAtLength(s), q = axis.getPointAtLength(Math.min(len, s + 1));
        const nx = -(q.y - p.y), ny = q.x - p.x, nl = Math.hypot(nx, ny) || 1;
        const ux = nx / nl, uy = ny / nl;
        svgEl('path', { class: 'chain', d: `M${p.x - ux * 9} ${p.y - uy * 9}L${p.x + ux * 9} ${p.y + uy * 9}` }, ticks);
        if (k % 2 === 0) {
          const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
          text(ticks, p.x - ux * (edgeOff + 18), p.y - uy * (edgeOff + 18) + 3, `0+${String(k * stepM).padStart(3, '0')}`, '', 'middle', ang > 90 || ang < -90 ? ang + 180 + 90 : ang + 90);
        }
      }
      const key = svgEl('g', {}, g);
      const [kx, ky] = [18, view.ch - 18 - 3 * 16];
      svgEl('rect', { x: kx - 8, y: ky - 12, width: 150, height: 4 * 16 + 8, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 1 }, key);
      [['u-water', L('water')], ['u-sewer', L('sewer')], ['u-power', L('power')], ['axis', L('axis')]].forEach(([cls, s], i) => {
        svgEl('path', { class: cls, d: `M${kx} ${ky + i * 16}h26` }, key);
        text(key, kx + 34, ky + i * 16 + 3.5, s, '', 'start');
      });
      draw(tl, axis, 1.6, 0);
      fade(tl, edges.children, '-=0.8');
      fade(tl, ticks.children, '-=0.6');
      draw(tl, uW, 1.1, '-=0.2'); draw(tl, uS, 1.1, '<0.15'); draw(tl, uP, 1.1, '<0.15');
      fade(tl, key.children, '-=0.6');
    },
  },
  environment: {
    ll: [42.6590, 21.1020], mpp: 11,
    draw({ g, tl, d, view, L, at }) {
      const e = d.elev;
      const vals = e.v;
      const toS = (gx: number, gy: number): Pt => view.toScreen(e.ox + gx * e.sx, e.oy + gy * e.sx);
      const [cx, cy] = view.toData(...at(0, 0));
      const base = Math.round(elevAt(e, cx, cy));
      const levels = [base - 3, base, base + 3, base + 6, base + 9];
      const gen = contours().size([e.w, e.h]).thresholds(levels);
      const W = view.cw, H = view.ch;
      const frame = `M-20 -20H${W + 20}V${H + 20}H-20Z`;
      const polys = gen(vals).map((c) => {
        let dd = frame;
        for (const poly of c.coordinates) for (const ring of poly) dd += ptsD(ring.map(([x, y]) => toS(x, y)));
        return { z: c.value, d: dd };
      });
      const flood = svgEl('path', { class: 'flood', d: polys[0].d }, g);
      const tagG = svgEl('g', {}, g);
      const [lx, ly] = at(-260, 300);
      text(tagG, lx, ly, L('flood'), 'lbl', 'start');
      const lv = text(tagG, lx, ly + 15, `${L('level')} ${polys[0].z} m`, '', 'start');
      tl.fromTo(flood, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0);
      fade(tl, tagG.children, 0.2);
      polys.forEach((p, i) => {
        if (!i) return;
        tl.call(() => { flood.setAttribute('d', p.d); lv.textContent = `${L('level')} ${p.z} m`; }, [], 0.6 + i * 0.9);
        tl.fromTo(flood, { fillOpacity: 0.45 }, { fillOpacity: 1, duration: 0.8, ease: 'power2.out' }, 0.6 + i * 0.9);
      });
    },
  },
  advanced: {
    ll: [42.6700, 21.2420], mpp: 11,
    draw({ g, tl, d, view, at, L }) {
      const spots = d.spots.map((s) => ({ ...s, p: view.toScreen(s.x, s.y) })).filter(({ p }) => p[0] > 24 && p[1] > 24 && p[0] < view.cw - 24 && p[1] < view.ch - 24);
      const net = svgEl('g', {}, g);
      const tris = svgEl('g', {}, g);
      // geodetic network: each trig point tied to its nearest neighbours
      const edges = new Set<string>();
      spots.forEach((a, i) => {
        spots.map((b, j) => ({ j, dd: Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1]) })).filter((o) => o.j !== i).sort((x, y) => x.dd - y.dd).slice(0, 3)
          .forEach(({ j }) => {
            const k = [i, j].sort().join('-'); if (edges.has(k)) return; edges.add(k);
            const b = spots[j];
            svgEl('path', { class: 'tri', d: ptsD([a.p, b.p], false) }, net);
            const ga = unitToGK(d.proj, a.x, a.y), gb = unitToGK(d.proj, b.x, b.y);
            legLabel(net, a.p, b.p, `${fmt(Math.hypot(gb[0] - ga[0], gb[1] - ga[1]) / 1000, 3)} km`, -7);
          });
      });
      spots.forEach((s) => {
        const tg = svgEl('g', { class: 'trig', transform: `translate(${s.p[0].toFixed(1)} ${s.p[1].toFixed(1)})` }, tris);
        svgEl('path', { d: 'M0 -9 8 5H-8Z' }, tg); svgEl('circle', { cx: 0, cy: 0.6, r: 1.6 }, tg);
        text(tg, 11, 4, `${s.h}`, '', 'start');
      });
      // photogrammetry block flown by drone over the western slope
      const fl = svgEl('g', {}, g);
      const foot = svgEl('g', {}, g);
      const X0 = -3100, X1 = -1300, Y0 = -2500, Y1 = -1500, n = 7;
      const [bx0, by0] = at(X0, Y1), [bx1, by1] = at(X1, Y0);
      svgEl('rect', { x: bx0, y: by0, width: bx1 - bx0, height: by1 - by0, fill: 'none', stroke: 'var(--hydro)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, g);
      for (let i = 0; i < n; i++) {
        const y = Y0 + ((i + 0.5) * (Y1 - Y0)) / n;
        const a = at(X0 + 60, y), b = at(X1 - 60, y);
        const ln = svgEl('path', { class: 'fl', d: ptsD(i % 2 ? [b, a] : [a, b], false) }, fl);
        draw(tl, ln, 0.28, i ? '>' : 0.5);
        for (let k = 0; k < 9; k++) {
          const [fx, fy] = at(X0 + 100 + (k * (X1 - X0 - 200)) / 8, y);
          svgEl('rect', { class: 'foot', x: fx - 9, y: fy - 7, width: 18, height: 14 }, foot);
        }
      }
      const key = svgEl('g', {}, g);
      text(key, bx0, by0 - 10, L('flight'), 'lbl', 'start');
      const [tx, ty] = [view.cw - 22, view.ch - 22];
      text(key, tx, ty, `▲ ${L('trig')}`, 'lbl', 'end');
      fade(tl, net.querySelectorAll('.tri'), 0);
      pop(tl, [...tris.children], 0.2);
      fade(tl, net.querySelectorAll('text'), 0.6);
      fade(tl, foot.children, 1.4);
      fade(tl, key.children, 0.4);
    },
  },
  realestate: {
    ll: [42.6640, 21.1612], mpp: 0.55,
    // subdividing open ground, aligned with the street grid, around a new access road
    setup(cad, d) {
      const [tx, ty] = llToUnit(d.proj, 42.6505, 21.1785);
      const o = cad.pickOpen(tx, ty, 120, 76);
      if (!o) return null;
      return { center: [o.cx, o.cy], spanM: 120 * 1.3, data: o };
    },
    draw({ g, tl, L, view, pick, cad }) {
      const o = pick as OBB;
      const S = (u: number, v: number) => { const q = fromUV(o, u, v); return view.toScreen(q[0], q[1]); };
      const nb = svgEl('g', {}, g);
      for (const b of cad!.near(o.cx, o.cy, 160)) svgEl('path', { class: 'nb', d: ptsD(boxCorners(b.obb, cad!.fitParcel(cad!.blds.indexOf(b), 7)).map((q) => view.toScreen(q[0], q[1]))) }, nb);
      const { hw, hh } = o;
      const road = m2u(3.5);
      const outer = svgEl('path', { class: 'b-line', d: ptsD([S(-hw, -hh), S(hw, -hh), S(hw, hh), S(-hw, hh)]) }, g);
      const access = svgEl('path', { class: 'access', d: ptsD([S(-hw, -road), S(hw, -road), S(hw, road), S(-hw, road)]) }, g);
      const axis = svgEl('path', { class: 'axis', d: ptsD([S(-hw, 0), S(hw, 0)], false) }, g);
      const lots = svgEl('g', {}, g);
      const labels = svgEl('g', {}, g);
      const ts = [0, 0.27, 0.5, 0.74, 1];
      const lotEls: SVGPathElement[] = [];
      let n = 0;
      for (const [va, vb] of [[-hh, -road], [road, hh]]) {
        for (let i = 0; i < ts.length - 1; i++) {
          const ua = -hw + ts[i] * 2 * hw, ub = -hw + ts[i + 1] * 2 * hw;
          const sel = n === 4;
          const el = svgEl('path', { class: `lot${sel ? ' sel' : ''}`, d: ptsD([S(ua, va), S(ub, va), S(ub, vb), S(ua, vb)]) }, lots);
          lotEls.push(el);
          const [sx, sy] = S((ua + ub) / 2, (va + vb) / 2);
          const a = (ub - ua) * (vb - va) * M_UNIT * M_UNIT;
          const lg = svgEl('g', {}, labels);
          n++;
          if (view.cw < 480 && !sel) { text(lg, sx, sy + 4, String(n), 'lbl'); continue; }
          text(lg, sx, sy - 3, `${L('lot')} ${n}`, 'lbl');
          text(lg, sx, sy + 11, `${fmt(a, 0)} m²`);
        }
      }
      const [rx, ry] = S(hw * 0.62, 0);
      const rl = text(g, rx, ry - 5, L('access'), 'lbl');
      fade(tl, nb.children, 0);
      draw(tl, outer, 1.2, 0.2);
      fade(tl, access, 1.1);
      draw(tl, axis, 0.8, 1.2);
      tl.fromTo(lotEls, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.06 }, 1.6);
      fade(tl, labels.children, 1.8);
      fade(tl, rl, 2.2);
    },
  },
  legal: {
    ll: [42.6612, 21.1628], mpp: 0.42,
    // two neighbours, two claimed lines in the yard between them, and the surveyed boundary
    setup(cad, d) {
      const [tx, ty] = llToUnit(d.proj, 42.6612, 21.1628);
      const p = cad.pickPair(tx, ty, new Set());
      if (!p) return null;
      const [cx, cy] = p.axis === 'u' ? fromUV(p.o, p.mid, (p.s0 + p.s1) / 2) : fromUV(p.o, (p.s0 + p.s1) / 2, p.mid);
      return { center: [cx, cy], spanM: Math.max((p.s1 - p.s0) * M_UNIT * 1.35, 42), data: p };
    },
    draw({ g, tl, L, view, pick, cad }) {
      const p = pick as NonNullable<ReturnType<Cadastre['pickPair']>>;
      const o = p.o;
      // a = position across the boundary, s = along it
      const S = (a: number, s: number) => { const q = p.axis === 'u' ? fromUV(o, a, s) : fromUV(o, s, a); return view.toScreen(q[0], q[1]); };
      const s0 = p.s0 - m2u(4), s1 = p.s1 + m2u(4);
      for (const bi of [p.a, p.b]) svgEl('path', { class: 'fp-main', d: ptsD(cad!.blds[bi].pts.map((q) => view.toScreen(q[0], q[1]))) }, g);
      const off = (m: number) => m2u(m);
      const A: Pt[] = [S(p.mid + off(1.9), s0), S(p.mid + off(1.1), s1)];
      const B: Pt[] = [S(p.mid - off(1.5), s0), S(p.mid - off(0.7), s1)];
      const T: Pt[] = [S(p.mid, s0), S(p.mid, s1)];
      const pa = svgEl('path', { class: 'claimA', d: ptsD(A, false) }, g);
      const pb = svgEl('path', { class: 'claimB', d: ptsD(B, false) }, g);
      const ease = svgEl('path', { class: 'ease', d: ptsD([S(p.mid + off(2.6), s0), S(p.mid + off(5.4), s0), S(p.mid + off(5.4), s1), S(p.mid + off(2.6), s1)]) }, g);
      const pt = svgEl('path', { class: 'truth', d: ptsD(T, false) }, g);
      const stones = T.map(([x, y]) => svgEl('circle', { class: 'stone on', cx: x, cy: y, r: 5 }, g));
      // offsets between the claims, read at both ends of the boundary
      const dims = svgEl('g', {}, g);
      ([[s0, 3.4], [s1, 1.8]] as [number, number][]).forEach(([s, dd], k) => {
        const ext = k ? m2u(3) : -m2u(3);
        const a = S(p.mid + off(k ? 1.1 : 1.9), s), b = S(p.mid - off(k ? 0.7 : 1.5), s);
        svgEl('path', { class: 'dimline', d: ptsD([a, S(p.mid + off(k ? 1.1 : 1.9), s + ext)], false) + ptsD([b, S(p.mid - off(k ? 0.7 : 1.5), s + ext)], false), stroke: 'var(--ink)', 'stroke-width': 0.8, fill: 'none' }, dims);
        const [lx, ly] = S(p.mid, s + ext * 1.6);
        text(dims, lx, ly + 3, `Δ ${fmt(dd)} m`, 'lbl');
      });
      const key = svgEl('g', {}, g);
      const [kx, ky] = [18, view.ch - 18 - 2 * 16];
      svgEl('rect', { x: kx - 8, y: ky - 12, width: 168, height: 3 * 16 + 8, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 1 }, key);
      [['claimA', L('claimA')], ['claimB', L('claimB')], ['truth', L('truth')]].forEach(([c, s], i) => {
        svgEl('path', { class: c, d: `M${kx} ${ky + i * 16}h26` }, key);
        text(key, kx + 34, ky + i * 16 + 3.5, s, '', 'start');
      });
      // easement callout: leader from the strip to a label clear of the yard
      const [ex, ey] = S(p.mid + off(4), s0 + (s1 - s0) * 0.6);
      const [cx2, cy2] = S(p.mid + off(16), s0 + (s1 - s0) * 0.6);
      const et = svgEl('g', {}, g);
      svgEl('path', { class: 'dimline', d: `M${ex} ${ey}L${cx2} ${cy2}`, stroke: 'var(--ink)', 'stroke-width': 0.8, fill: 'none' }, et);
      svgEl('circle', { cx: ex, cy: ey, r: 2.2, fill: 'var(--ink)' }, et);
      text(et, cx2 + (cx2 >= ex ? 6 : -6), cy2 + 3.5, `${L('ease')} ${fmt(2.8, 1)} m`, 'lbl', cx2 >= ex ? 'start' : 'end');
      draw(tl, pa, 1, 0); draw(tl, pb, 1, 0.2);
      fade(tl, key.children, 0.3);
      fade(tl, ease, 0.9); fade(tl, et, 1);
      draw(tl, pt, 1.2, 1.2);
      pop(tl, stones, 1.8);
      fade(tl, dims.children, 2);
    },
  },
  mapping: {
    ll: [42.6600, 21.1650], mpp: 5.2,
    draw({ g, tl, d, view, L }) {
      const tl0 = unitToGK(d.proj, view.vb.x, view.vb.y), br = unitToGK(d.proj, view.vb.x + view.vb.w, view.vb.y + view.vb.h);
      const step = (500 / view.upp) / M_PER_UNIT < 72 ? 1000 : 500;
      const tiles = svgEl('g', {}, g);
      const sx = (e: number) => ((e - tl0[0]) / (br[0] - tl0[0])) * view.cw;
      const sy = (n: number) => ((tl0[1] - n) / (tl0[1] - br[1])) * view.ch;
      const cells: SVGGElement[] = [];
      for (let e = Math.floor(tl0[0] / step) * step; e < br[0]; e += step) for (let n = Math.floor(br[1] / step) * step; n < tl0[1]; n += step) {
        const x0 = sx(e), x1 = sx(e + step), y0 = sy(n + step), y1 = sy(n);
        const c = svgEl('g', {}, tiles);
        svgEl('rect', { class: 'tile', x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, c);
        if (x1 - x0 > 58 && x0 >= 0 && x1 <= view.cw) text(c, x0 + 5, y0 + 13, `${String(Math.round(e / 100)).slice(-3)}·${String(Math.round(n / 100)).slice(-3)}`, '', 'start').setAttribute('font-size', '8.5');
        cells.push(c);
      }
      cells.sort(() => Math.random() - 0.5);
      tl.fromTo(cells, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.035 }, 0);
      const rows = [['lContour', 'var(--bistre)'], ['lHydro', 'var(--hydro)'], ['lRoads', 'var(--ink)'], ['lVeg', 'var(--veg-ink)']];
      const narrow = view.cw < 480;
      const panel = svgEl('g', { transform: narrow ? `translate(10 ${view.ch - 34})` : `translate(${view.cw - 190} ${view.ch - 132})` }, g);
      if (narrow) {
        svgEl('rect', { x: 0, y: 0, width: view.cw - 20, height: 24, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 1 }, panel);
        rows.forEach(([, col], i) => svgEl('rect', { x: 10 + i * 14, y: 7, width: 10, height: 10, fill: col }, panel));
        text(panel, 70, 16, `${L('layers')} · ${step} m`, '', 'start');
      } else {
        svgEl('rect', { x: 0, y: 0, width: 172, height: 114, fill: 'var(--paper)', stroke: 'var(--ink)', 'stroke-width': 1 }, panel);
        text(panel, 12, 20, L('layers'), 'lbl', 'start');
        rows.forEach(([k, col], i) => {
          const y = 40 + i * 18;
          svgEl('rect', { x: 12, y: y - 8, width: 10, height: 10, fill: col }, panel);
          text(panel, 30, y + 1, L(k), '', 'start');
        });
        text(panel, 12, 108, L('tile').replace('500', String(step)), '', 'start').setAttribute('fill', 'var(--ink-3)');
      }
      fade(tl, panel, 0.6);
      // flick the plates on and off like GIS layers
      const host = g.ownerSVGElement!.parentElement!;
      const plates = ['contour', 'hydro', 'black', 'veg'].map((n) => host.querySelector(`.p-${n}`)!);
      plates.forEach((p, i) => {
        tl.to(p, { opacity: 0.08, duration: 0.25 }, 1.4 + i * 0.55).to(p, { opacity: 1, duration: 0.35 }, 1.4 + i * 0.55 + 0.3);
      });
    },
  },
};

export async function initLegend(reduced: boolean) {
  const host = document.getElementById('insetMap');
  const section = document.getElementById('sherbimet');
  if (!host || !section) return;
  const d = (await import('../data/map-data.json')).default as unknown as MapData;
  host.classList.add('mapview');
  const { setBox } = printPlates(d, host);
  // frame the cadastral scenes on real footprints: one building, its parcel, its neighbours
  const cad = createCadastre(d);
  const picks = new Map<string, unknown>();
  for (const [k, sc] of Object.entries(SCENES)) {
    const r = sc.setup?.(cad, d);
    if (!r) continue;
    sc.ll = unitToLL(d.proj, r.center[0], r.center[1]);
    sc.mpp = r.spanM / 352;
    picks.set(k, r.data);
  }
  const ov = svgEl('svg', { class: 'plate ov' }, host);
  const defs = svgEl('defs', {}, ov);
  const pat = svgEl('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--bistre)', 'stroke-width': 1.4 }, pat);
  const layer = svgEl('g', {}, ov);
  const view = new View();
  const nameEl = document.getElementById('insetName')!;
  const coordEl = document.getElementById('insetCoord')!;
  const items = [...section.querySelectorAll<HTMLElement>('.lg')];
  let active = -1;
  let tl: gsap.core.Timeline | null = null;
  let fly: gsap.core.Tween | null = null;
  const cur = { x: 0, y: 0, w: 0, h: 0 };

  // scenes are authored for a 640 px wide inset; narrower insets zoom out to keep the drawing whole
  const mppOf = (s: Scene) => s.mpp * Math.max(1, 640 / Math.max(240, host.clientWidth));
  const boxFor = (s: Scene): Box => {
    const cw = host.clientWidth, ch = host.clientHeight;
    const [fx, fy] = llToUnit(d.proj, s.ll[0], s.ll[1]);
    const upp = mppOf(s) / M_PER_UNIT;
    return { x: fx - (cw * upp) / 2, y: fy - (ch * upp) / 2, w: cw * upp, h: ch * upp };
  };
  const apply = (b: Box) => { setBox(b); view.set(b, host.clientWidth, host.clientHeight); };

  const render = (i: number, animate: boolean) => {
    const key = items[i].dataset.group!;
    const s = SCENES[key];
    tl?.kill();
    host.querySelectorAll<SVGElement>('.plate').forEach((p) => gsap.set(p, { opacity: 1 }));
    layer.replaceChildren();
    ov.setAttribute('width', String(host.clientWidth));
    ov.setAttribute('height', String(host.clientHeight));
    const g = svgEl('g', {}, layer);
    const mpp = mppOf(s);
    const at = (mx: number, my: number): Pt => [host.clientWidth / 2 + mx / mpp, host.clientHeight / 2 - my / mpp];
    tl = gsap.timeline({ paused: true });
    const L = (k: string) => words[k]?.[lang() === 'sq' ? 0 : 1] ?? k;
    const pick = picks.get(key);
    if (!s.setup || pick) s.draw({ g, view, d, at, mpp, tl, L, pick, cad });
    if (animate && !reduced) tl.play(0); else tl.progress(1);
    nameEl.innerHTML = items[i].querySelector('.lg__title')!.innerHTML;
    const [ux, uy] = llToUnit(d.proj, s.ll[0], s.ll[1]);
    const [E, N] = unitToGK(d.proj, ux, uy);
    coordEl.textContent = `E ${group(E, 0)} · N ${group(N, 0)} · 1 px ≈ ${fmt(mpp, mpp < 2 ? 2 : 1)} m`;
  };

  const activate = (i: number) => {
    if (i === active) return;
    active = i;
    items.forEach((el, k) => el.classList.toggle('is-active', k === i));
    const target = boxFor(SCENES[items[i].dataset.group!]);
    tl?.kill();
    fly?.kill();
    gsap.killTweensOf(layer);
    if (reduced || !cur.w) {
      Object.assign(cur, target); apply(cur);
      gsap.set(layer, { opacity: 1 });
      render(i, !reduced);
      return;
    }
    gsap.to(layer, { opacity: 0, duration: 0.2 });
    // fly between scenes: zoom out, pan, zoom in
    const mid = { w: Math.max(cur.w, target.w) * 2.2, h: Math.max(cur.h, target.h) * 2.2 };
    const cx0 = cur.x + cur.w / 2, cy0 = cur.y + cur.h / 2, cx1 = target.x + target.w / 2, cy1 = target.y + target.h / 2;
    const st = { t: 0 };
    const w0 = cur.w;
    fly = gsap.to(st, {
      t: 1, duration: 1.15, ease: 'power3.inOut',
      onUpdate: () => {
        const t = st.t;
        const bump = Math.sin(Math.PI * t);
        const w = gsap.utils.interpolate(w0, target.w, t) + (mid.w - (w0 + target.w) / 2) * bump * 0.5;
        const h = (w / target.w) * target.h;
        const cx = gsap.utils.interpolate(cx0, cx1, t), cy = gsap.utils.interpolate(cy0, cy1, t);
        Object.assign(cur, { x: cx - w / 2, y: cy - h / 2, w, h });
        apply(cur);
      },
      onComplete: () => { Object.assign(cur, target); apply(cur); gsap.set(layer, { opacity: 1 }); render(i, true); },
    });
  };

  // leader line from the hovered or focused legend entry to its drawing on the inset
  const body = section.querySelector<HTMLElement>('.legend__body')!;
  const leader = svgEl('svg', { class: 'leader', 'aria-hidden': 'true' }, body);
  const lPath = svgEl('path', {}, leader);
  const lDot = svgEl('circle', { r: 4, opacity: 0 }, leader);
  let leaderFor: HTMLElement | null = null;
  const placeLeader = (animate: boolean) => {
    if (!leaderFor || window.innerWidth <= 860) { gsap.to([lPath, lDot], { opacity: 0, duration: 0.2 }); return; }
    const rb = body.getBoundingClientRect();
    const sym = leaderFor.querySelector('.lg__sym')!.getBoundingClientRect();
    const head = leaderFor.querySelector('.lg__head')!.getBoundingClientRect();
    const map = host.getBoundingClientRect();
    const ax = head.right - rb.left + 14, ay = sym.top + sym.height / 2 - rb.top;
    const tx = map.left + map.width / 2 - rb.left, ty = gsap.utils.clamp(map.top + 40, map.bottom - 40, map.top + map.height / 2) - rb.top;
    const kx = map.left - rb.left - 28;
    lPath.setAttribute('d', `M${ax} ${ay}H${kx}L${tx} ${ty}`);
    lDot.setAttribute('cx', String(tx)); lDot.setAttribute('cy', String(ty));
    if (animate && !reduced) {
      const len = lPath.getTotalLength();
      gsap.fromTo(lPath, { opacity: 1, strokeDasharray: `0 ${len}` }, { strokeDasharray: `${len} 0`, duration: 0.55, ease: 'power2.out' });
      gsap.fromTo(lDot, { opacity: 0, scale: 0, transformOrigin: '50% 50%', transformBox: 'fill-box' }, { opacity: 1, scale: 1, duration: 0.3, delay: 0.45, ease: 'back.out(2.5)' });
    } else { gsap.set(lPath, { opacity: 1, strokeDasharray: 'none' }); gsap.set(lDot, { opacity: 1, scale: 1 }); }
  };
  let lraf = 0;
  window.addEventListener('scroll', () => { if (!leaderFor) return; cancelAnimationFrame(lraf); lraf = requestAnimationFrame(() => placeLeader(false)); }, { passive: true });
  items.forEach((el, i) => {
    const on = () => { if (leaderFor === el) return; leaderFor = el; activate(i); placeLeader(true); };
    const off = () => { if (leaderFor !== el) return; leaderFor = null; placeLeader(false); };
    el.addEventListener('pointerenter', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('focusin', on);
    el.addEventListener('focusout', off);
  });

  section.classList.add('is-live');
  items.forEach((el, i) => {
    ScrollTrigger.create({ trigger: el, start: 'top 58%', end: 'bottom 58%', onToggle: (st) => { if (st.isActive) activate(i); } });
  });
  activate(0);

  let rto = 0;
  new ResizeObserver(() => {
    clearTimeout(rto);
    rto = window.setTimeout(() => { if (active < 0) return; const b = boxFor(SCENES[items[active].dataset.group!]); Object.assign(cur, b); apply(b); render(active, false); }, 150);
  }).observe(host);
  onLang(() => { if (active >= 0) render(active, false); });
}
