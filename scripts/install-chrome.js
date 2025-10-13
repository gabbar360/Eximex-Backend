import { execSync } from 'child_process';
import { existsSync } from 'fs';

const verifyChrome = () => {
  const possiblePaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];

  console.log('Checking for Chrome installation...');

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log(`✓ Found Chrome at: ${path}`);
      try {
        const version = execSync(`${path} --version`, {
          encoding: 'utf8',
        }).trim();
        console.log(`✓ Chrome version: ${version}`);
        return true;
      } catch (error) {
        console.log(`✗ Chrome found but not executable: ${path}`);
      }
    }
  }

  console.log('✗ Chrome not found in standard locations');
  return false;
};

const installChrome = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.log('=== Chrome Installation Check ===');

    // First check if Chrome is already installed
    if (verifyChrome()) {
      console.log('✓ Chrome is already available, skipping installation');
      return;
    }

    console.log('Chrome not found, attempting installation...');

    try {
      // Try to install Chrome using apt (for Ubuntu/Debian)
      console.log('Attempting to install Chrome via apt...');
      execSync('apt-get update && apt-get install -y google-chrome-stable', {
        stdio: 'inherit',
        timeout: 300000,
      });

      if (verifyChrome()) {
        console.log('✓ Chrome installed successfully via apt');
        return;
      }
    } catch (error) {
      console.log('apt installation failed, trying Puppeteer...');
    }

    try {
      console.log('Installing Chrome via Puppeteer...');
      execSync('npx puppeteer browsers install chrome', {
        stdio: 'inherit',
        timeout: 300000,
      });
      console.log('✓ Puppeteer Chrome installation completed');
    } catch (error) {
      console.error('✗ All Chrome installation methods failed:', error.message);
      console.log('Application will attempt to use Puppeteer bundled Chromium');
    }
  } else {
    console.log('Development mode - skipping Chrome installation');
  }
};

installChrome();
