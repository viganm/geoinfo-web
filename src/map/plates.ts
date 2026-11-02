import type { Elev, Proj } from './geo';

export interface MapData {
  view: [number, number];
  step: number;
  contours: { z: number; i: number; d: string }[];
  lines: Record<'motorway' | 'trunk' | 'primary' | 'secondary' | 'minor' | 'rail' | 'river' | 'stream', string>;
  fills: Record<'water' | 'forest' | 'building', string>;
  places: { n: string; k: string; x: number; y: number }[];
  spots: { x: number; y: number; h: number }[];
  hydroLabels: { n: string; x: number; y: number; a: number; w: number }[];
  elev: Elev;
  proj: Proj;
}

export const NS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(n);
  return n;
}

export interface Box { x: number; y: number; w: number; h: number }

/** Maps data units to container pixels for one view box. */
export class View {
  vb: Box = { x: 0, y: 0, w: 1, h: 1 };
  cw = 1;
  ch = 1;
  set(vb: Box, cw: number, ch: number) { this.vb = vb; this.cw = cw; this.ch = ch; }
  toScreen(x: number, y: number): [number, number] { return [((x - this.vb.x) / this.vb.w) * this.cw, ((y - this.vb.y) / this.vb.h) * this.ch]; }
  toData(sx: number, sy: number): [number, number] { return [this.vb.x + (sx / this.cw) * this.vb.w, this.vb.y + (sy / this.ch) * this.vb.h]; }
  get upp() { return this.vb.w / this.cw; }
}

export type PlateName = 'veg' | 'hydro' | 'contour' | 'black';

/** Prints the four map plates as stacked SVG layers sharing one viewBox. */
export function printPlates(d: MapData, host: HTMLElement, opts: { buildings?: boolean } = {}) {
  const plates = {} as Record<PlateName, SVGSVGElement>;
  const mk = (name: PlateName) => {
    const s = svgEl('svg', { class: `plate p-${name}`, preserveAspectRatio: 'none', viewBox: `0 0 ${d.view[0]} ${d.view[1]}` }, host);
    plates[name] = s;
    return s;
  };
  const veg = mk('veg');
  svgEl('path', { d: d.fills.forest }, veg);

  const hy = mk('hydro');
  svgEl('path', { class: 'stream', d: d.lines.stream }, hy);
  svgEl('path', { class: 'river', d: d.lines.river }, hy);
  svgEl('path', { class: 'water', d: d.fills.water }, hy);

  const co = mk('contour');
  for (const c of d.contours) svgEl('path', { class: c.i ? 'idx' : '', d: c.d, 'data-z': c.z }, co);

  const bl = mk('black');
  svgEl('path', { class: 'minor', d: d.lines.minor }, bl);
  svgEl('path', { class: 'rail-base', d: d.lines.rail }, bl);
  svgEl('path', { class: 'rail', d: d.lines.rail }, bl);
  svgEl('path', { class: 'sec', d: d.lines.secondary }, bl);
  svgEl('path', { class: 'sec', d: d.lines.primary, 'stroke-width': 1.5 }, bl);
  svgEl('path', { class: 'casing', d: d.lines.trunk, 'stroke-width': 4 }, bl);
  svgEl('path', { class: 'casing', d: d.lines.motorway, 'stroke-width': 5 }, bl);
  svgEl('path', { class: 'fillr', d: d.lines.trunk, 'stroke-width': 2 }, bl);
  svgEl('path', { class: 'fillr', d: d.lines.motorway, 'stroke-width': 2.8 }, bl);
  if (opts.buildings !== false) svgEl('path', { class: 'bld', d: d.fills.building }, bl);

  const setBox = (b: Box) => {
    const vb = `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.w.toFixed(1)} ${b.h.toFixed(1)}`;
    for (const k in plates) plates[k as PlateName].setAttribute('viewBox', vb);
  };
  return { plates, setBox };
}

/** Metres per data unit at the sheet's latitude (z14 web-mercator pixel). */
export const M_PER_UNIT = (156543.03392 * Math.cos((42.66 * Math.PI) / 180)) / 2 ** 14;
