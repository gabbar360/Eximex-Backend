// Fallback PDF generation using HTML to PDF service
export const generateFallbackPDF = async (htmlContent) => {
  // This is a simple fallback that returns an error message
  // In a real scenario, you might want to use an external service
  throw new Error(
    'PDF generation service temporarily unavailable. Chrome browser not found.'
  );
};

// Alternative: You could integrate with services like:
// - Puppeteer as a service
// - HTML/CSS to PDF API
// - wkhtmltopdf
// - Playwright
