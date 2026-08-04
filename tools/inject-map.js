const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'br-states.json'), 'utf8'));
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const FEATURED = ['SP', 'PR', 'SC', 'RS'];

const base = Object.entries(data.states)
  .filter(([uf]) => !FEATURED.includes(uf))
  .map(([uf, d]) => `<path d="${d}"/>`)
  .join('');

const markup =
  `<g id="brBase" fill="currentColor">${base}</g>` +
  FEATURED.map(uf => `<path id="br${uf}" d="${data.states[uf]}"/>`).join('');

const START = '<!--#BR_MAP#-->';
const RE = /<!--#BR_MAP#-->[\s\S]*?<!--#\/BR_MAP#-->|<!--#BR_MAP#-->/;

if (!RE.test(html)) {
  console.error('placeholder not found');
  process.exit(1);
}
html = html.replace(RE, START + markup + '<!--#/BR_MAP#-->');
fs.writeFileSync(htmlPath, html);
console.log('injected', markup.length, 'chars of map geometry');
