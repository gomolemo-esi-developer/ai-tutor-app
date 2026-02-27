import axios from 'axios';
import { createGlobalApiClient } from '@/services/apiClient';

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
    const htmlWithStyles = wrapHTMLWithStyles(html, options.title);
    
    // Always use backend proxy - more reliable and handles CORS
    try {
      await generatePDFViaBackend(htmlWithStyles, options);
    } catch (backendError) {
      console.error('Backend PDF generation failed:', backendError);
      throw backendError;
    }
  } catch (error) {
    console.error('Gotenberg PDF export error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.'
    );
  }
};

/**
 * Generate PDF through backend to avoid CORS issues
 * Uses JWT token stored in localStorage for authentication
 */
async function generatePDFViaBackend(
  html: string,
  options: PDFExportOptions
): Promise<void> {
  // Get token from localStorage (set by AuthContext on login)
  const token = localStorage.getItem('jwt_token');
  
  if (!token) {
    throw new Error('Authentication required for PDF generation. Please log in.');
  }

  const apiClient = createGlobalApiClient();
  const backendURL = apiClient.getBaseURL();
  
  const response = await axios.post(
    `${backendURL}/api/pdf/generate`,
    {
      html,
      filename: options.filename,
      title: options.title,
    },
    {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  downloadPDF(response.data, options.filename);
}

/**
 * Helper to trigger PDF download
 */
function downloadPDF(pdfData: ArrayBuffer, filename: string): void {
  const blob = new Blob([pdfData], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

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

    // Step 1: Remove all buttons first
    clonedElement.querySelectorAll('button').forEach((btn) => btn.remove());

    // Step 2: Remove all SVG icons (trophy, check marks, X marks that are too large)
    clonedElement.querySelectorAll('svg').forEach((svg) => {
      svg.remove();
    });

    // Step 3: Remove the header (contains back button, title, PDF button)
    // Find the flex container with the title and buttons
    const flexContainers = Array.from(clonedElement.querySelectorAll('div'));
    flexContainers.forEach((div) => {
      const text = div.textContent || '';
      // Look for header pattern: contains ArrowLeft button area and PDF button area
      const hasTitle = div.querySelector('h1');
      if (hasTitle && text.includes('Quiz Results')) {
        // This is the header - check if it's a direct parent of h1
        const parent = hasTitle?.parentElement?.parentElement;
        if (parent && parent === div) {
          div.remove();
        }
      }
    });

    // Step 4: Remove CardContent sections (contains score messages and action buttons)
    clonedElement.querySelectorAll('[class*="CardContent"]').forEach((content) => {
      content.remove();
    });

    // Step 5: Remove bottom action buttons section
    const flexDivs = Array.from(clonedElement.querySelectorAll('div'));
    flexDivs.forEach((div) => {
      const text = div.textContent || '';
      // Remove sections containing bottom action buttons
      if (
        text.includes('Retake Quiz') &&
        text.includes('Browse More Modules') &&
        !text.includes('Question Breakdown')
      ) {
        div.remove();
      }
    });

    // Step 6: Remove metadata and extra sections
    clonedElement.querySelectorAll('[class*="Card"]').forEach((card) => {
      const text = card.textContent || '';
      if (text.includes('Read Time') || text.includes('Topics')) {
        card.remove();
      }
    });

    // Step 7: Remove Topics Covered sections
    clonedElement.querySelectorAll('h3, h2').forEach((heading) => {
      if (heading.textContent?.includes('Topics')) {
        heading.nextElementSibling?.remove();
        heading.remove();
      }
    });

    // Step 8: Remove separators
    clonedElement.querySelectorAll('[class*="separator"], [class*="Separator"]').forEach((sep) => sep.remove());

    // Step 9: Remove empty elements (divs, spans, etc. with no text content and no children)
    const emptyElements = Array.from(clonedElement.querySelectorAll('*'));
    emptyElements.forEach((el) => {
      // Skip certain elements that should be kept even if empty
      if (el.tagName === 'HTML' || el.tagName === 'BODY') return;
      
      const text = el.textContent?.trim() || '';
      const hasChildren = el.children.length > 0;
      
      // Remove if truly empty
      if (!text && !hasChildren) {
        el.remove();
      }
      // Remove decorative empty divs/spans (common in React components)
      else if (!text && el.tagName === 'DIV') {
        // Check if it's a decorative container with no meaningful content
        const children = Array.from(el.children);
        const hasOnlyEmptyChildren = children.length > 0 && 
          children.every(child => !child.textContent?.trim());
        if (hasOnlyEmptyChildren) {
          el.remove();
        }
      }
    });

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
 * Preserves the visual design from the website
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
          color: #1f2937;
          background: #ffffff;
          padding: 30px 20px;
          font-size: 14px;
        }

        h1, h2, h3, h4, h5, h6 {
          font-weight: 600;
          line-height: 1.3;
          color: #1f2937;
          page-break-after: avoid;
          margin-bottom: 0.5em;
        }

        h1 {
          font-size: 28px;
          margin-top: 0;
          margin-bottom: 1em;
          border-bottom: 3px solid #0ea5e9;
          padding-bottom: 0.5em;
        }

        h2 {
          font-size: 20px;
          margin-top: 1.5em;
        }

        h3 {
          font-size: 16px;
          margin-top: 1em;
        }

        p {
          margin: 0.8em 0;
          line-height: 1.6;
        }

        ul, ol {
          margin: 1em 0;
          padding-left: 2em;
        }

        li {
          margin: 0.4em 0;
          line-height: 1.6;
        }

        /* Card styling - matches Tailwind card design */
        .rounded-lg, [class*="rounded"] {
          border-radius: 8px;
        }

        /* Main card container */
        [class*="Card"] {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5em;
          margin: 1.5em 0;
          background: #ffffff;
          page-break-inside: avoid;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        /* Score card - Trophy section */
        [class*="Card"] {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5em;
          margin: 1.5em 0;
          page-break-inside: avoid;
        }

        [class*="CardHeader"] {
          text-align: center;
          padding-bottom: 0.5em;
          border-bottom: none;
        }

        /* Trophy icon styling */
        svg, .trophy {
          width: 60px;
          height: 60px;
          margin: 0 auto 1em;
          display: block;
        }

        /* Large percentage display */
        .percentage, [class*="text-5xl"], [class*="text-4xl"] {
          font-size: 48px;
          font-weight: 700;
          margin: 0.5em 0;
        }

        /* Color classes for scores */
        .text-green-500, [class*="green"] {
          color: #10b981;
        }

        .text-yellow-500, [class*="yellow"] {
          color: #f59e0b;
        }

        .text-red-500, [class*="red"] {
          color: #ef4444;
        }

        /* Result cards - green for correct, red for incorrect */
        .border-l-4, [class*="border-l"] {
          border-left: 5px solid #999;
          padding: 1em;
          margin: 1em 0;
          background: #f9fafb;
          border-radius: 0;
          page-break-inside: avoid;
          display: block;
          border-top: none;
          border-right: none;
          border-bottom: none;
        }

        .border-l-green-500, [class*="bg-green"] {
          border-left-color: #10b981;
          background: #f0fdf4;
        }

        .border-l-red-500, [class*="bg-red"] {
          border-left-color: #ef4444;
          background: #fef2f2;
        }

        /* Flex container for question items - ensure vertical layout */
        [class*="border-l"] > div {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.5em;
        }

        /* Make sure content in question cards stacks vertically */
        [class*="border-l"][class*="bg-"] > div > div {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.8em;
        }

        /* Force vertical layout for all flex-row items in question cards */
        [class*="border-l"] [class*="flex-row"],
        [class*="border-l"] [class*="flex-col"] {
          flex-direction: column !important;
        }

        /* Grid to vertical in question cards */
        [class*="border-l"] .grid {
          display: flex !important;
          flex-direction: column !important;
          grid-template-columns: unset !important;
        }

        /* Hide SVG icons */
        svg {
          display: none;
        }

        /* Check and X circles */
        .text-green-600 {
          color: #059669;
        }

        .text-red-600 {
          color: #dc2626;
        }

        /* Answer section - vertical layout */
        .answer-section {
          display: flex;
          flex-direction: column;
          gap: 0.4em;
        }

        /* Typography for answers */
        .font-medium, [class*="font-medium"] {
          font-weight: 500;
        }

        .font-bold, [class*="font-bold"] {
          font-weight: 700;
        }

        .text-muted-foreground, [class*="muted"] {
          color: #6b7280;
          font-size: 0.875em;
        }

        /* Badge/tag styling */
        [class*="badge"], [class*="tag"], [class*="pill"],
        [class*="rounded-full"] {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 0.4em 0.8em;
          border-radius: 9999px;
          font-size: 0.8em;
          display: inline-block;
          margin: 0.25em 0.5em 0.25em 0;
          font-weight: 500;
          color: #374151;
          vertical-align: middle;
        }

        /* Question text and breakdown */
        .question-num {
          color: #9ca3af;
          margin-right: 0.5em;
          font-weight: 500;
        }

        .question-text {
          font-weight: 500;
          margin-bottom: 0.8em;
          color: #1f2937;
        }

        /* Answer rows with proper spacing */
        .answer-section {
          margin: 0.8em 0;
          font-size: 0.95em;
          display: flex;
          justify-content: space-between;
          gap: 1em;
        }

        .answer-label {
          color: #6b7280;
          font-weight: 500;
          min-width: 140px;
        }

        .answer-value {
          font-weight: 600;
          flex: 1;
        }

        /* Grid layout for answer rows - override for vertical */
        .grid {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.8em;
          align-items: unset;
        }

        /* Table styling */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
        }

        thead {
          background: #f9fafb;
        }

        th, td {
          border: 1px solid #e5e7eb;
          padding: 1em;
          text-align: left;
        }

        th {
          font-weight: 600;
          background: #f3f4f6;
          color: #1f2937;
        }

        /* Page break handling */
        @page {
          size: A4;
          margin: 15mm;
        }

        /* Avoid breaking important elements */
        [class*="Card"],
        [class*="card"],
        [class*="border-l"],
        .score-section,
        .question-item {
          page-break-inside: avoid;
        }

        /* Spacing helpers */
        .mb-4, .mb-6, .mb-8 {
          margin-bottom: 1.5em;
        }

        .mt-4, .mt-6, .mt-8 {
          margin-top: 1.5em;
        }

        .gap-3, .gap-4 {
          gap: 1em;
        }

        /* Print-specific styles */
        @media print {
          body {
            background: white;
          }

          a {
            color: #0ea5e9;
            text-decoration: none;
          }

          button {
            display: none;
          }

          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
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
