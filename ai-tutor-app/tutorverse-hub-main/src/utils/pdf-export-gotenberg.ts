import axios from 'axios';

interface PDFExportOptions {
  filename: string;
  title?: string;
}

/**
 * Gotenberg API configuration
 * In development: http://localhost:3001
 * In production (Docker): http://gotenberg:3000
 */
const GOTENBERG_URL = import.meta.env.VITE_GOTENBERG_URL || 'http://localhost:3001';

/**
 * Convert HTML to PDF using Gotenberg API
 * This provides superior styling and layout compared to html2canvas
 */
export const exportHTMLToPDFGotenberg = async (
  html: string,
  options: PDFExportOptions
): Promise<void> => {
  try {
    const formData = new FormData();
    const htmlWithStyles = wrapHTMLWithStyles(html, options.title);
    formData.append('files', new Blob([htmlWithStyles], { type: 'text/html' }), 'document.html');

    // Gotenberg API options
    formData.append('landscape', 'false');
    formData.append('paperWidth', '8.27'); // A4 width in inches
    formData.append('paperHeight', '11.69'); // A4 height in inches
    formData.append('marginTop', '0.5');
    formData.append('marginBottom', '0.5');
    formData.append('marginLeft', '0.5');
    formData.append('marginRight', '0.5');
    formData.append('preferCssPageSize', 'true');
    formData.append('printBackground', 'true');

    const response = await axios.post(
      `${GOTENBERG_URL}/forms/chromium/convert/html`,
      formData,
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      }
    );

    // Create blob and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Gotenberg PDF export error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.'
    );
  }
};

/**
 * Export a DOM element to PDF using Gotenberg
 * Serializes the element to HTML string and sends to Gotenberg
 */
export const exportElementToPDFGotenberg = async (
  elementId: string,
  options: PDFExportOptions
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;

    // Remove buttons and interactive elements
    const buttons = clonedElement.querySelectorAll('button');
    buttons.forEach((button) => {
      const text = button.textContent?.toLowerCase() || '';
      if (
        text.includes('back') ||
        text.includes('download') ||
        text.includes('quiz') ||
        text.includes('chat') ||
        text.includes('ask ai') ||
        text.includes('retake') ||
        text.includes('browse')
      ) {
        button.remove();
      }
    });

    // Remove metadata elements
    const allElements = clonedElement.querySelectorAll('[class*="Card"], [class*="card"]');
    allElements.forEach((el) => {
      const text = el.textContent || '';
      if (text.includes('Read Time') || text.includes('Topics')) {
        el.remove();
      }
    });

    // Remove Topics Covered section
    const headings = clonedElement.querySelectorAll('h3, h2');
    headings.forEach((heading) => {
      if (heading.textContent?.includes('Topics')) {
        const nextEl = heading.nextElementSibling;
        heading.remove();
        if (nextEl) nextEl.remove();
      }
    });

    // Remove separators
    const separators = clonedElement.querySelectorAll('[class*="separator"], [class*="Separator"]');
    separators.forEach((sep) => sep.remove());

    // Get the outer HTML
    const html = clonedElement.outerHTML;

    // Send to Gotenberg
    await exportHTMLToPDFGotenberg(html, options);
  } catch (error) {
    console.error('Element to PDF conversion error:', error);
    throw error;
  }
};

/**
 * Wrap HTML with proper styling for PDF output
 */
function wrapHTMLWithStyles(html: string, title?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Document'}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #ffffff;
          padding: 20px;
          font-size: 14px;
        }

        h1, h2, h3, h4, h5, h6 {
          margin-top: 16px;
          margin-bottom: 8px;
          font-weight: 600;
          line-height: 1.3;
          color: #000;
          page-break-after: avoid;
        }

        h1 {
          font-size: 24px;
          border-bottom: 2px solid #ddd;
          padding-bottom: 8px;
        }

        h2 {
          font-size: 20px;
          margin-top: 20px;
        }

        h3 {
          font-size: 16px;
        }

        p {
          margin: 8px 0;
          line-height: 1.6;
        }

        ul, ol {
          margin: 12px 0;
          padding-left: 24px;
        }

        li {
          margin: 6px 0;
          line-height: 1.6;
        }

        /* Card styling for quiz results */
        [class*="card"], [class*="Card"] {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 16px;
          margin: 16px 0;
          background: #fafafa;
          page-break-inside: avoid;
        }

        /* Score display styling */
        .score-card {
          text-align: center;
          background: #f0f9ff;
          border-left: 4px solid #0066cc;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
          page-break-inside: avoid;
        }

        .score-percentage {
          font-size: 48px;
          font-weight: bold;
          color: #0066cc;
          margin: 10px 0;
        }

        .score-message {
          font-size: 16px;
          font-weight: 500;
          margin: 10px 0;
        }

        /* Question result styling */
        .question-result {
          border-left: 4px solid #999;
          padding: 16px;
          margin: 12px 0;
          background: #f9f9f9;
          page-break-inside: avoid;
        }

        .question-result.correct {
          border-left-color: #22c55e;
          background: #f0fdf4;
        }

        .question-result.incorrect {
          border-left-color: #ef4444;
          background: #fef2f2;
        }

        .question-text {
          font-weight: 500;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .question-type {
          display: inline-block;
          background: #e5e7eb;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
          margin-top: 8px;
        }

        .answer-row {
          margin: 8px 0;
          font-size: 13px;
        }

        .answer-label {
          color: #666;
          display: inline-block;
          min-width: 120px;
          font-weight: 500;
        }

        .answer-value {
          font-weight: 500;
        }

        .answer-value.correct {
          color: #16a34a;
        }

        .answer-value.incorrect {
          color: #dc2626;
        }

        /* Badge styling */
        [class*="badge"], [class*="tag"], [class*="pill"],
        span[class*="rounded"] {
          background: #e5e7eb;
          border: none;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
          display: inline-block;
          margin: 2px 4px 2px 0;
          font-weight: 500;
          color: #333;
          vertical-align: middle;
        }

        /* Table styling */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }

        thead {
          background: #f3f4f6;
        }

        th, td {
          border: 1px solid #e5e7eb;
          padding: 12px;
          text-align: left;
        }

        th {
          font-weight: 600;
          background: #f3f4f6;
        }

        /* Page break handling */
        @page {
          size: A4;
          margin: 12mm;
        }

        /* Avoid breaking elements */
        [class*="card"], [class*="Card"],
        .question-result,
        .score-card {
          page-break-inside: avoid;
        }

        /* Print styles */
        @media print {
          body {
            background: white;
          }

          a {
            color: #0066cc;
            text-decoration: none;
          }

          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      ${title ? `<h1>${title}</h1>` : ''}
      ${html}
    </body>
    </html>
  `;
}

/**
 * Format timestamp for filename
 */
export const getTimestampForFilename = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
};
