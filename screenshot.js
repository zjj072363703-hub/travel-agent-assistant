const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/th321456/.cache/puppeteer/chrome/linux-147.0.7727.57/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 720 });
  const filePath = 'file:///home/th321456/tourboost/comparison-card.html';
  await page.goto('file://' + filePath, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/home/th321456/tourboost/comparison-card.png', fullPage: true });
  await browser.close();
  console.log('done');
})().catch(e => console.error(e.message));