import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';
import { generatePDFFallback } from './pdfFallback.js';
import { generateSimplePDF } from './simplePdf.js';

// Function to find Chrome executable
const findChromeExecutable = () => {
  const possiblePaths = [process.env.PUPPETEER_EXECUTABLE_PATH];

  // Add platform-specific paths
  if (process.platform === 'win32') {
    possiblePaths.push(
      path.join(
        os.homedir(),
        '.cache',
        'puppeteer',
        'chrome',
        'win64-138.0.7204.94',
        'chrome-win64',
        'chrome.exe'
      ),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    );
  } else {
    possiblePaths.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/chrome',
      '/snap/bin/chromium'
    );
  }

  for (const path of possiblePaths) {
    if (path && existsSync(path)) {
      console.log(`Found Chrome at: ${path}`);
      return path;
    }
  }

  // Try to find using which command
  try {
    const chromePath = execSync(
      'which google-chrome-stable || which google-chrome || which chromium-browser || which chromium',
      { encoding: 'utf8' }
    ).trim();
    if (chromePath && existsSync(chromePath)) {
      console.log(`Found Chrome using which: ${chromePath}`);
      return chromePath;
    }
  } catch (error) {
    console.log('Could not find Chrome using which command');
  }

  return null;
};

// Launch Puppeteer with proper configuration for production
export const launchPuppeteer = async () => {
  const options = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-web-security',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--memory-pressure-off',
      '--max_old_space_size=4096',
    ],
    timeout: 60000,
    protocolTimeout: 60000,
  };

  // Always try to find Chrome executable for better reliability
  const chromeExecutable = findChromeExecutable();
  if (chromeExecutable) {
    options.executablePath = chromeExecutable;
    console.log(`Using Chrome executable: ${chromeExecutable}`);
  } else {
    console.log('No Chrome executable found, using Puppeteer bundled Chromium');
  }

  // For production environments
  if (process.env.NODE_ENV === 'production') {
    options.args.push(
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-default-apps'
    );

    // Additional production-specific args
    // Chrome executable already set above
  }

  try {
    return await puppeteer.launch(options);
  } catch (error) {
    console.error('Failed to launch Puppeteer:', error.message);

    // Fallback: try without executablePath
    if (options.executablePath) {
      console.log('Retrying without custom executable path...');
      delete options.executablePath;
      try {
        return await puppeteer.launch(options);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError.message);
        throw new Error(
          `PDF generation failed: Browser was not found at the configured executablePath (${chromeExecutable || 'unknown'})`
        );
      }
    }

    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

// Generate PDF with proper error handling
export const generatePDF = async (htmlContent, pdfOptions = {}) => {
  let browser;
  let page;
  try {
    browser = await launchPuppeteer();
    page = await browser.newPage();

    // Set longer timeouts
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    await page.setViewport({ width: 1200, height: 800 });

    // Set content with better error handling
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for content to render
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const defaultOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '5mm',
        right: '5mm',
        bottom: '5mm',
        left: '5mm',
      },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
      scale: 0.8,
      timeout: 60000,
      pageRanges: '1',
    };

    const pdfBuffer = await page.pdf({ ...defaultOptions, ...pdfOptions });
    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);

    // Try fallback method if main method fails
    if (
      error.message.includes('Target closed') ||
      error.message.includes('Protocol error')
    ) {
      console.log('Attempting fallback PDF generation...');
      try {
        return await generatePDFFallback(htmlContent, pdfOptions);
      } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        console.log('Attempting simple PDF generation...');
        try {
          return await generateSimplePDF(htmlContent);
        } catch (simpleError) {
          console.error('Simple PDF generation also failed:', simpleError);
          throw new Error(
            `All PDF generation methods failed. Main: ${error.message}, Fallback: ${fallbackError.message}, Simple: ${simpleError.message}`
          );
        }
      }
    }

    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (closeError) {
      console.warn('Error closing page:', closeError.message);
    }
    try {
      if (browser && browser.connected) {
        await browser.close();
      }
    } catch (closeError) {
      console.warn('Error closing browser:', closeError.message);
    }
  }
};
