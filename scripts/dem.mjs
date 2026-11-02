import fs from 'node:fs';
import { PNG } from 'pngjs';
import { contours } from 'd3-contour';
const [,, demDir, outFile] = process.argv;
const X0 = 2287, Y0 = 1509, NX = 4, NY = 3, T = 256, Z = 12;
const W = NX * T, H = NY * T;
const elev = new Float32Array(W * H);
for (let tx = 0; tx < NX; tx++) for (let ty = 0; ty < NY; ty++) {
  const png = PNG.sync.read(fs.readFileSync(`${demDir}/t_${X0 + tx}_${Y0 + ty}.png`));
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = (y * T + x) * 4;
    const v = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768;
    elev[(ty * T + y) * W + tx * T + x] = v;
  }
}
// gaussian-ish blur (3 passes box) to tame SRTM noise
function blur(a, r) {
  const b = new Float32Array(a.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const xx = Math.min(W - 1, Math.max(0, x + k)); s += a[y * W + xx]; n++; }
    b[y * W + x] = s / n;
  }
  const c = new Float32Array(a.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const yy = Math.min(H - 1, Math.max(0, y + k)); s += b[yy * W + x]; n++; }
    c[y * W + x] = s / n;
  }
  return c;
}
let e = blur(blur(elev, 1), 1);
let min = Infinity, max = -Infinity;
for (const v of e) { if (v < min) min = v; if (v > max) max = v; }
console.log('elev range', min.toFixed(0), max.toFixed(0));
const n = 2 ** Z;
const tile2lon = (x) => x / n * 360 - 180;
const tile2lat = (y) => { const k = Math.PI * (1 - 2 * y / n); return Math.atan(Math.sinh(k)) * 180 / Math.PI; };
const meta = { W, H, lonW: tile2lon(X0), lonE: tile2lon(X0 + NX), latN: tile2lat(Y0), latS: tile2lat(Y0 + NY), z: Z, x0: X0, y0: Y0 };
console.log(meta);
fs.writeFileSync(outFile.replace('.json', '.bin'), Buffer.from(e.buffer));
fs.writeFileSync(outFile, JSON.stringify({ meta, min, max }));
