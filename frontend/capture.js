import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to a good size
  await page.setViewport({ width: 1200, height: 800 });
  
  // Navigate to the app
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  // Wait a bit for charts to render
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot
  await page.screenshot({ path: '../screenshot-after.png', fullPage: true });
  
  await browser.close();
  console.log('Screenshot saved to screenshot-after.png');
})();
