const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const OUT = path.join(root, 'tools', 'shots');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const W = Number(process.argv[2]) || 1600;
const H = Number(process.argv[3]) || 900;
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--allow-file-access-from-files', '--force-device-scale-factor=1', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', r => errors.push('REQFAIL: ' + r.url() + ' — ' + r.failure().errorText));

  await page.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/'), { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1400));

  const count = await page.$$eval('.slide', els => els.length);
  const list = only || Array.from({ length: count }, (_, i) => i);

  for (const i of list) {
    await page.evaluate(n => {
      const s = document.querySelectorAll('.slide')[n];
      document.getElementById('deck').scrollTo({ top: s.offsetTop, behavior: 'auto' });
    }, i);
    await new Promise(r => setTimeout(r, 2600));
    const file = path.join(OUT, `${W}x${H}-s${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
  }

  // expanded state of the team cards (slide 12)
  if (!only || only.includes(11)) {
    await page.evaluate(() => {
      const s = document.querySelectorAll('.slide')[11];
      document.getElementById('deck').scrollTo({ top: s.offsetTop, behavior: 'auto' });
      document.querySelectorAll('.tcard')[2].click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(OUT, `${W}x${H}-s12-open.png`) });
    await page.evaluate(() => document.querySelectorAll('.tcard')[2].click());
  }

  // overflow audit: does any slide's content exceed its box?
  const audit = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.slide')).map((s, i) => {
      const inner = s.querySelector('.s-inner');
      const cs = getComputedStyle(s);
      const avail = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      return {
        n: i + 1,
        id: s.id,
        needs: Math.round(inner.scrollHeight),
        avail: Math.round(avail),
        over: Math.round(inner.scrollHeight - avail)
      };
    });
  });

  console.log(`--- ${W}x${H} overflow audit (positive "over" = content is clipped) ---`);
  audit.forEach(a => console.log(`s${String(a.n).padStart(2, '0')} ${a.id.padEnd(4)} needs ${String(a.needs).padStart(4)} / avail ${String(a.avail).padStart(4)}  over ${a.over > 0 ? '!! +' + a.over : a.over}`));
  if (errors.length) { console.log('--- errors ---'); [...new Set(errors)].forEach(e => console.log(e)); }
  else console.log('no console/network errors');

  await browser.close();
})();
