import puppeteer from 'puppeteer';
import os from 'os';
import path from 'path';
import { existsSync } from 'fs';

// Simple fallback PDF generation
export const generatePDFFallback = async (htmlContent, pdfOptions = {}) => {
  let browser;
  try {
    // Find Chrome executable
    const chromePath = path.join(
      os.homedir(),
      '.cache',
      'puppeteer',
      'chrome',
      'win64-138.0.7204.94',
      'chrome-win64',
      'chrome.exe'
    );

    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      timeout: 30000,
    };

    // Add Chrome path if it exists
    if (existsSync(chromePath)) {
      launchOptions.executablePath = chromePath;
    }

    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Set simple content without waiting for network
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    // Simple PDF options for single page
    const defaultOptions = {
      format: 'A4',
      printBackground: true,
      margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
      scale: 0.8,
      pageRanges: '1',
    };

    const pdfBuffer = await page.pdf({ ...defaultOptions, ...pdfOptions });
    return pdfBuffer;
  } catch (error) {
    console.error('Fallback PDF generation error:', error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn('Error closing fallback browser:', closeError.message);
      }
    }
  }
};
