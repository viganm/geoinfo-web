// Rebuilds the GeoInfo wordmark from the old raster: outlined Archivo letters fitted to the
// original letter boxes, a contrast ring for the O, and an orthographic globe (Natural Earth land).
import fs from 'node:fs';
import * as fontkit from 'fontkit';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
const [,, fontDir, outDir] = process.argv;
const upright = fontkit.openSync(`${fontDir}/archivo-normal.ttf`);
const italic = fontkit.openSync(`${fontDir}/archivo-italic.ttf`);
const r = (v) => Math.round(v * 10) / 10;

// glyph outline for `txt`, fitted into box [x0,x1] with cap from yTop to yBase
function fitted(font, vars, txt, x0, x1, yTop, yBase) {
  const f = font.getVariation(vars);
  const ids = font.glyphsForString(txt).map((g) => g.id);
  let x = 0, d = '';
  const parts = [];
  for (const id of ids) {
    const g = f.getGlyph(id);
    parts.push({ path: g.path, x });
    x += g.advanceWidth;
  }
  // ink bounds in font units
  let minX = Infinity, maxX = -Infinity;
  for (const p of parts) { const b = p.path.bbox; minX = Math.min(minX, p.x + b.minX); maxX = Math.max(maxX, p.x + b.maxX); }
  const cap = f.capHeight;
  const sx = (x1 - x0) / (maxX - minX), sy = (yBase - yTop) / cap;
  for (const p of parts) {
    for (const c of p.path.commands) {
      const a = c.args.map((v, k) => (k % 2 === 0 ? r(x0 + (p.x + v - minX) * sx) : r(yBase - v * sy)));
      d += ({ moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' })[c.command] + a.join(' ');
    }
  }
  return d;
}
const INK = '#29166f';
const ge = fitted(upright, { wdth: 125, wght: 330 }, 'GE', 2, 480, 6, 206);
const info = fitted(italic, { wdth: 100, wght: 290 }, 'Info', 790, 1160, 36, 196);

// O: contrast ring, then the globe inside it
const ox = 640.5, oy = 106;
const ring = `M${ox - 124.5} ${oy}a124.5 105.5 0 1 0 249 0a124.5 105.5 0 1 0 -249 0ZM${ox - 99.5} ${oy}a99.5 91.5 0 1 1 199 0a99.5 91.5 0 1 1 -199 0Z`;
const R = 80;
const land = feature(JSON.parse(fs.readFileSync(new URL('./node_modules/world-atlas/land-110m.json', import.meta.url))), 'land');
const proj = geoOrthographic().rotate([-12, -34, -10]).scale(R).translate([ox + 2, oy + 1]).clipAngle(90).precision(0.3);
const path = geoPath(proj);
const landD = path(land).replace(/(\d+\.\d{2})\d+/g, '$1');
const gratD = path(geoGraticule10()).replace(/(\d+\.\d{2})\d+/g, '$1');

const globe = (id) => `
  <defs>
    <radialGradient id="${id}o" cx="0.36" cy="0.3" r="0.78">
      <stop offset="0" stop-color="#7fbaf4"/><stop offset="0.38" stop-color="#2f80dc"/><stop offset="0.8" stop-color="#1c5cb8"/><stop offset="1" stop-color="#143f86"/>
    </radialGradient>
    <radialGradient id="${id}l" cx="0.34" cy="0.28" r="0.85">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#dfe9f5"/><stop offset="1" stop-color="#9fb6d3"/>
    </radialGradient>
    <radialGradient id="${id}h" cx="0.32" cy="0.24" r="0.5">
      <stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${id}c"><circle cx="${ox + 2}" cy="${oy + 1}" r="${R}"/></clipPath>
  </defs>
  <g clip-path="url(#${id}c)">
    <circle cx="${ox + 2}" cy="${oy + 1}" r="${R}" fill="url(#${id}o)"/>
    <path d="${gratD}" fill="none" stroke="#bcd8f6" stroke-opacity="0.35" stroke-width="0.9"/>
    <path d="${landD}" fill="url(#${id}l)" stroke="#1c5cb8" stroke-opacity="0.35" stroke-width="0.6"/>
    <circle cx="${ox + 2}" cy="${oy + 1}" r="${R}" fill="url(#${id}h)"/>
  </g>
  <circle cx="${ox + 2}" cy="${oy + 1}" r="${R - 0.5}" fill="none" stroke="#143f86" stroke-opacity="0.5" stroke-width="1"/>`;

const svgFile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1163 214" role="img" aria-label="GeoInfo">
  <path d="${ge}" fill="${INK}"/>
  <path d="${ring}" fill="${INK}" fill-rule="evenodd"/>${globe('g')}
  <path d="${info}" fill="${INK}"/>
</svg>
`;
fs.writeFileSync(`${outDir}/logo.svg`, svgFile);
// inline module for the page header (ids namespaced)
fs.writeFileSync(`${outDir}/wordmark.html`, svgFile.replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg class="wordmark__svg" aria-hidden="true"').replace(' role="img" aria-label="GeoInfo"', '').replace(/id="g/g, 'id="wm').replace(/#g([olhc])\)/g, '#wm$1)'));
// favicon: globe only
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox - 100} ${oy - 100} 200 200">
  <rect x="${ox - 100}" y="${oy - 100}" width="200" height="200" rx="36" fill="#f6f7f4"/>
  <circle cx="${ox + 2}" cy="${oy + 1}" r="${R + 12}" fill="none" stroke="${INK}" stroke-width="14"/>${globe('f')}
</svg>
`;
fs.writeFileSync(`${outDir}/favicon.svg`, fav);
console.log('ge', ge.length, 'info', info.length, 'land', landD.length, 'total', svgFile.length);
