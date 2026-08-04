const puppeteer = require('puppeteer-core');
const path = require('path');
const root = path.join(__dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  await page.goto('file:///' + path.join(root, 'index.html').replace(/\\/g, '/'), { waitUntil: 'networkidle2' });
  // force every reveal on so the print sheet is complete
  await page.evaluate(() => document.querySelectorAll('.slide').forEach(s => s.classList.add('in')));
  await new Promise(r => setTimeout(r, 2500));
  await page.pdf({
    path: path.join(root, 'TruckBem-Apresentacao-Institucional.pdf'),
    width: '1600px', height: '900px', printBackground: true, pageRanges: '1-14'
  });
  console.log('pdf written');
  await browser.close();
})();
