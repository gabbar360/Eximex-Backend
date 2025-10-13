import { generatePDF, launchPuppeteer } from './puppeteerConfig.js';

// Enhanced PDF service with fallback options
export class PDFService {
  constructor() {
    this.isChromiumAvailable = null;
  }

  async checkChromiumAvailability() {
    if (this.isChromiumAvailable !== null) {
      return this.isChromiumAvailable;
    }

    try {
      const browser = await launchPuppeteer();
      await browser.close();
      this.isChromiumAvailable = true;
      console.log('✓ Chromium is available for PDF generation');
      return true;
    } catch (error) {
      this.isChromiumAvailable = false;
      console.log('✗ Chromium is not available:', error.message);
      return false;
    }
  }

  async generatePDF(htmlContent, options = {}) {
    const isAvailable = await this.checkChromiumAvailability();

    if (isAvailable) {
      try {
        return await generatePDF(htmlContent, options);
      } catch (error) {
        console.error('Primary PDF generation failed:', error.message);
        // Mark as unavailable for future requests
        this.isChromiumAvailable = false;
        return this.generateFallbackResponse(error);
      }
    } else {
      return this.generateFallbackResponse(
        new Error('Chrome/Chromium not available')
      );
    }
  }

  generateFallbackResponse(error) {
    const fallbackHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PDF Generation Error</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .error { color: #d32f2f; background: #ffebee; padding: 15px; border-radius: 4px; }
          .info { color: #1976d2; background: #e3f2fd; padding: 15px; border-radius: 4px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h1>PDF Generation Temporarily Unavailable</h1>
        <div class="error">
          <strong>Error:</strong> ${error.message}
        </div>
        <div class="info">
          <strong>Alternative Options:</strong>
          <ul>
            <li>Use your browser's "Print to PDF" feature on the invoice page</li>
            <li>Contact support for manual PDF generation</li>
            <li>Try again later - the service may be restored</li>
          </ul>
        </div>
      </body>
      </html>
    `;

    // Return HTML content instead of PDF
    throw new Error(
      `PDF generation failed: ${error.message}. Please use browser's Print to PDF feature as alternative.`
    );
  }

  // Method to reset availability check (useful for retrying)
  resetAvailabilityCheck() {
    this.isChromiumAvailable = null;
  }
}

// Export singleton instance
export const pdfService = new PDFService();
