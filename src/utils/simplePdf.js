import puppeteer from 'puppeteer';
import os from 'os';
import path from 'path';

export const generateSimplePDF = async (htmlContent) => {
  const chromePath = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome', 'win64-138.0.7204.94', 'chrome-win64', 'chrome.exe');
  
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
    scale: 0.8,
    pageRanges: '1'
  });
  
  await browser.close();
  return pdf;
};