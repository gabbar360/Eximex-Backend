import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Function to find Chrome executable
const findChromeExecutable = () => {
  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    // '/tmp/puppeteer/chrome/linux-138.0.7204.94/chrome-linux64/chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/opt/google/chrome/chrome',
    '/snap/bin/chromium',
  ];

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
    ],
    timeout: 60000,
  };

  // For production environments
  if (process.env.NODE_ENV === 'production') {
    options.args.push(
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-default-apps'
    );

    // Try to find Chrome executable
    const chromeExecutable = findChromeExecutable();
    if (chromeExecutable) {
      options.executablePath = chromeExecutable;
      console.log(`Using Chrome executable: ${chromeExecutable}`);
    } else {
      console.log(
        'No Chrome executable found, using Puppeteer bundled Chromium'
      );
      // Don't set executablePath, let Puppeteer use its bundled Chromium
    }
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
  try {
    browser = await launchPuppeteer();
    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 800 });
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const defaultOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm',
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      scale: 0.8,
    };

    const pdfBuffer = await page.pdf({ ...defaultOptions, ...pdfOptions });
    return pdfBuffer;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
