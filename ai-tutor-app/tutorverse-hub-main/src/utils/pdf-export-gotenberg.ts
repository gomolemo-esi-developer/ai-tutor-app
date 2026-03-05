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

    // Step 2: Remove all SVG icons
    clonedElement.querySelectorAll('svg').forEach((svg) => {
      svg.remove();
    });

    // Step 3: Remove header element entirely and subtitle paragraphs
    clonedElement.querySelectorAll('header').forEach((header) => {
      header.remove();
    });
    
    // Also remove only subtitle paragraphs with muted-foreground (not all text-sm)
    clonedElement.querySelectorAll('p').forEach((p) => {
      const classes = p.className || '';
      const text = p.textContent?.trim() || '';
      // Only remove if it's a muted/secondary paragraph with very short content (like module code)
      if (classes.includes('muted-foreground') && text.length < 50) {
        p.remove();
      }
    });

    // Step 4: Flatten wrapper divs and convert Tailwind classes to inline styles
    const allDivs = Array.from(clonedElement.querySelectorAll('div'));
    allDivs.forEach((div) => {
      const classes = div.className || '';
      
      // Remove Tailwind spacing classes and set inline styles instead
      div.classList.remove('grid', 'gap-3', 'gap-4', 'md:gap-3', 'md:gap-4');
      div.classList.remove('mb-3', 'mb-4', 'mb-6', 'mt-1', 'mt-4', 'mt-6');
      div.classList.remove('flex', 'flex-col', 'flex-row', 'items-center', 'justify-center');
      div.classList.remove('p-4', 'p-6', 'py-4', 'px-4');
      
      // If it was a grid, make it a simple block
      if (classes.includes('grid')) {
        div.style.display = 'block';
        div.style.marginTop = '0';
        div.style.marginBottom = '0';
      }
    });

    // Step 5: Remove separators
    clonedElement.querySelectorAll('[class*="separator"], [class*="Separator"]').forEach((sep) => sep.remove());

    // Step 6: Remove metadata and extra sections, but keep main content CardContent
    clonedElement.querySelectorAll('[class*="Card"]').forEach((card) => {
      const text = card.textContent || '';
      if (text.includes('Read Time') || text.includes('Topics')) {
        card.remove();
      }
    });

    // Step 7: Remove action button sections
    const allElements = Array.from(clonedElement.querySelectorAll('div'));
    allElements.forEach((div) => {
      const text = div.textContent || '';
      if (
        (text.includes('Take Quiz') && text.includes('Ask AI Questions')) ||
        (text.includes('Retake Quiz') && text.includes('Browse More'))
      ) {
        div.remove();
      }
    });

    // Step 8: Remove truly empty wrapper divs (but keep those with content)
    const emptyDivs = Array.from(clonedElement.querySelectorAll('div'));
    emptyDivs.forEach((div) => {
      const text = div.textContent?.trim() || '';
      const hasChildren = div.children.length > 0;
      
      // Only remove if completely empty
      if (!text && !hasChildren) {
        div.remove();
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
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          background: #f7fafc;
          padding: 20px;
          margin: 0 !important;
          font-size: 14px;
        }

        h1 {
          font-size: 28px;
          font-weight: 800;
          color: #111827;
          margin: 28px 0 20px 0;
          line-height: 1.25;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 12px;
          letter-spacing: -0.02em;
        }

        h2 {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 24px 0 14px 0;
          line-height: 1.35;
          letter-spacing: -0.015em;
        }

        h3 {
          font-size: 20px;
          font-weight: 650;
          color: #1f2937;
          margin: 20px 0 12px 0;
          line-height: 1.4;
          letter-spacing: -0.01em;
        }

        p {
          margin: 16px 0;
          line-height: 1.8;
          color: #374151;
          font-weight: 400;
          letter-spacing: 0.3px;
        }

        /* Subtitle styling */
        header p {
          font-size: 14px;
          color: #a0aec0;
          margin: 8px 0 0 0;
          font-weight: 400;
        }

        ul, ol {
          margin: 16px 0;
          padding-left: 32px;
          color: #374151;
          list-style-position: outside;
        }

        ul {
          list-style-type: disc;
        }

        ol {
          list-style-type: decimal;
        }

        li {
          margin: 10px 0;
          line-height: 1.75;
          padding-left: 8px;
          font-weight: 400;
          color: #374151 !important;
        }

        li::marker {
          color: #3b82f6;
          font-weight: 700;
        }

        /* Card styling */
        .rounded-lg, [class*="rounded"] {
          border-radius: 8px;
        }

        /* Main card container */
        [class*="Card"] {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
          background: #ffffff;
          page-break-inside: avoid;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        /* Card header styling */
        [class*="CardHeader"] {
          padding: 0 0 16px 0;
          margin: 0 0 16px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        /* Card title styling */
        [class*="CardTitle"] {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #111827;
        }

        /* Card content padding */
        [class*="CardContent"] {
          padding: 0;
          margin: 0;
        }

        /* Styling for content inside cards */
        [class*="CardContent"] p {
          margin: 16px 0;
          line-height: 1.8;
          color: #374151;
          font-weight: 400;
        }

        [class*="CardContent"] ul,
        [class*="CardContent"] ol {
          margin: 16px 0;
          padding-left: 32px;
          color: #374151;
        }

        [class*="CardContent"] li {
          margin: 10px 0;
          line-height: 1.75;
          padding-left: 8px;
          color: #374151 !important;
        }

        [class*="CardContent"] strong {
          font-weight: 700;
          color: #111827;
          letter-spacing: 0.2px;
        }

        [class*="CardContent"] em {
          font-style: italic;
          color: #3b82f6;
          font-weight: 500;
        }

        [class*="CardContent"] a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          border-bottom: 1px solid transparent;
        }

        [class*="CardContent"] a:hover {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        /* Inline code */
        code {
          background-color: #f3f4f6;
          color: #dc2626;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-weight: 500;
          border: 1px solid #e0e7ff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        /* Code blocks */
        pre {
          background-color: #1e1e1e;
          color: #e5e7eb;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 20px 0;
          font-size: 13px;
          line-height: 1.6;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        pre code {
          background: none;
          border: none;
          padding: 0;
          color: #e5e7eb;
          box-shadow: none;
        }

        /* Blockquote */
        blockquote {
          margin: 24px 0;
          padding: 20px 24px;
          border-left: 4px solid #3b82f6;
          background: linear-gradient(to right, #eff6ff, #f8fafc);
          color: #1e40af;
          font-style: italic;
          font-weight: 500;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        }

        blockquote p {
          margin: 8px 0;
          color: #1e40af;
          line-height: 1.7;
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
          margin: 8mm;
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
