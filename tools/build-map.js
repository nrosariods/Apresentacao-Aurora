const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const geo = JSON.parse(fs.readFileSync(path.join(root, 'br.geojson'), 'utf8'));

const NAME_TO_UF = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM', 'Bahia': 'BA',
  'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES', 'Goiás': 'GO',
  'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG',
  'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE', 'Piauí': 'PI',
  'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC', 'São Paulo': 'SP',
  'Sergipe': 'SE', 'Tocantins': 'TO'
};

const props = geo.features[0].properties;
const nameKey = ['name', 'NAME', 'nome', 'NOME_UF', 'Estado'].find(k => k in props) || Object.keys(props)[0];

// --- viewport ---
const W = 900, H = 940, PAD = 12;

// Mercator-ish projection (spherical Mercator y) fitted to the feature bounds
let minLon = 1e9, maxLon = -1e9, minY = 1e9, maxY = -1e9;
const mercY = lat => (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));

const rings = [];
for (const f of geo.features) {
  const uf = NAME_TO_UF[f.properties[nameKey]] || f.properties[nameKey];
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  rings.push({ uf, polys });
  for (const poly of polys) for (const ring of poly) for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    const y = mercY(lat);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}

const scale = Math.min((W - PAD * 2) / (maxLon - minLon), (H - PAD * 2) / (maxY - minY));
const offX = PAD + ((W - PAD * 2) - (maxLon - minLon) * scale) / 2;
const offY = PAD + ((H - PAD * 2) - (maxY - minY) * scale) / 2;
const project = ([lon, lat]) => [
  offX + (lon - minLon) * scale,
  offY + (maxY - mercY(lat)) * scale
];

// --- Ramer-Douglas-Peucker ---
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let idx = 0, maxD = 0;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1e-9;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
}

// A closed ring starts and ends on the same point, which makes plain RDP degenerate
// (zero-length baseline). Split it at the point farthest from the start first.
function simplifyRing(pts, eps) {
  const last = pts[pts.length - 1];
  if (pts.length > 1 && Math.abs(pts[0][0] - last[0]) < 1e-9 && Math.abs(pts[0][1] - last[1]) < 1e-9) {
    pts = pts.slice(0, -1);
  }
  if (pts.length < 5) return pts;
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > fd) { fd = d; far = i; }
  }
  const head = rdp(pts.slice(0, far + 1), eps);
  const tail = rdp(pts.slice(far).concat([pts[0]]), eps);
  return head.slice(0, -1).concat(tail.slice(0, -1));
}

const ringArea = pts => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return Math.abs(a / 2);
};

const FEATURED = new Set(['SP', 'PR', 'SC', 'RS']);
const MIN_AREA = 8;      // px^2, drops specks / tiny islands
const r2 = n => Math.round(n * 10) / 10;

const out = {};
for (const { uf, polys } of rings) {
  const eps = FEATURED.has(uf) ? 0.7 : 2.2;
  const parts = [];
  for (const poly of polys) {
    for (const ring of poly) {
      let pts = ring.map(project);
      if (ringArea(pts) < MIN_AREA * 4) continue;
      pts = simplifyRing(pts, eps);
      if (pts.length < 4 || ringArea(pts) < MIN_AREA) continue;
      parts.push('M' + pts.map(p => `${r2(p[0])} ${r2(p[1])}`).join('L') + 'Z');
    }
  }
  if (!parts.length) continue;
  out[uf] = (out[uf] ? out[uf] + '' : '') + parts.join('');
}

const CITIES = {
  'Pirituba (Aurora)': [-46.72, -23.48],
  'Itapevi': [-46.93, -23.55],
  'Sao Paulo': [-46.63, -23.55],
  'Campinas': [-47.06, -22.90],
  'Maringa': [-51.94, -23.42],
  'Curitiba': [-49.27, -25.43],
  'Florianopolis': [-48.55, -27.59],
  'Porto Alegre': [-51.23, -30.03]
};
const cities = {};
for (const [k, v] of Object.entries(CITIES)) {
  const p = project(v);
  cities[k] = [r2(p[0]), r2(p[1])];
}

fs.writeFileSync(path.join(root, 'tools', 'br-states.json'), JSON.stringify({ viewBox: `0 0 ${W} ${H}`, states: out, cities }, null, 1));
console.log(JSON.stringify(cities));

// preview render, used only to eyeball the projection
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#001B3A"/>
${Object.entries(out).map(([uf, d]) =>
  `<path d="${d}" fill="${FEATURED.has(uf) ? '#CBE60F' : '#0B4488'}" stroke="#001B3A" stroke-width="1.2"/>`
).join('\n')}
</svg>`;
fs.writeFileSync(path.join(root, 'tools', 'map-preview.svg'), svg);

const total = Object.values(out).reduce((a, s) => a + s.length, 0);
console.log('states:', Object.keys(out).length, '| chars:', total, '| viewBox: 0 0', W, H);
console.log(Object.entries(out).map(([k, v]) => `${k}:${v.length}`).join(' '));
