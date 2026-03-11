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
 * Convert HTML to PDF using Gotenberg API - OPTIMIZED VERSION
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
      timeout: 30000, // 30 seconds - most quizzes generate in 5-10s
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
 * OPTIMIZED: Single-pass DOM traversal instead of multiple querySelectorAll calls
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

    // OPTIMIZED: Single-pass DOM cleaning with stack-based tree walk
    const elementsToRemove: Element[] = [];
    const nodesToWalk = [clonedElement];
    const classesToRemove = ['gap-3', 'gap-4', 'md:gap-3', 'md:gap-4', 'mb-3', 'mb-4', 'mb-6', 'mt-1', 'mt-4', 'mt-6', 'p-4', 'p-6', 'py-4', 'px-4', 'items-center', 'justify-center'];
    
    while (nodesToWalk.length > 0) {
      const node = nodesToWalk.pop();
      if (!node) continue;

      // Remove buttons and SVGs
      if (node instanceof HTMLButtonElement || node instanceof SVGElement) {
        elementsToRemove.push(node);
        continue;
      }

      // Remove headers
      if (node instanceof HTMLElement && node.tagName === 'HEADER') {
        elementsToRemove.push(node);
        continue;
      }

      // Check paragraphs
      if (node instanceof HTMLParagraphElement) {
        const classes = node.className || '';
        const text = node.textContent?.trim() || '';
        if (classes.includes('muted-foreground') && text.length < 50) {
          elementsToRemove.push(node);
          continue;
        }
      }

      // Check divs for various criteria
      if (node instanceof HTMLDivElement) {
        const classes = node.className || '';
        const text = node.textContent?.trim() || '';
        const hasChildren = node.children.length > 0;

        // Remove separators (but keep badges/tags)
        if (classes.includes('separator') || classes.includes('Separator')) {
          if (!classes.includes('rounded-full') && !classes.includes('badge')) {
            elementsToRemove.push(node);
            continue;
          }
        }

        // Remove metadata cards
        if (text.includes('Read Time') || text.includes('Topics')) {
          elementsToRemove.push(node);
          continue;
        }

        // Remove action button sections
        if ((text.includes('Take Quiz') && text.includes('Ask AI Questions')) ||
            (text.includes('Retake Quiz') && text.includes('Browse More'))) {
          elementsToRemove.push(node);
          continue;
        }

        // Remove empty wrapper divs (but keep answer sections)
        if (!text && !hasChildren && !classes.includes('grid') && !classes.includes('flex')) {
          elementsToRemove.push(node);
          continue;
        }

        // Clean up unnecessary classes
        classesToRemove.forEach(cls => node.classList.remove(cls));
        
        // Convert non-border-l grids to block
        if (classes.includes('grid') && !classes.includes('border-l')) {
          node.style.display = 'block';
        }
      }

      // Add children to walk queue (reversed for correct order)
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const child = node.childNodes[i];
        if (child instanceof Element) {
          nodesToWalk.push(child);
        }
      }
    }

    // Remove all collected elements
    elementsToRemove.forEach(el => el.remove());

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
 * Wrap HTML with minimal, optimized styling for PDF output
 * OPTIMIZED: Reduced from 700+ lines to ~250 lines
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.5;
          color: #1f2937;
          padding: 16px;
          font-size: 13px;
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-weight: 700;
          color: #111827;
          margin: 12px 0 8px 0;
          page-break-after: avoid;
        }
        
        h1 { font-size: 22px; }
        h2 { font-size: 18px; }
        h3 { font-size: 16px; }
        
        p, li { margin: 6px 0; }
        ul, ol { margin: 12px 0; padding-left: 20px; }
        
        /* Quiz result cards */
        [class*="border-l"] {
          border-left: 4px solid #999;
          padding: 10px;
          margin: 8px 0;
          background: #f9fafb;
          page-break-inside: avoid;
        }
        
        [class*="border-l-green"], [class*="bg-green"] {
          border-left-color: #10b981;
          background: #f0fdf4;
        }
        
        [class*="border-l-red"], [class*="bg-red"] {
          border-left-color: #ef4444;
          background: #fef2f2;
        }
        
        /* Large display elements */
        [class*="text-5xl"], [class*="text-4xl"] {
          font-size: 44px;
          font-weight: 700;
        }
        
        /* Colors */
        .text-green-600 { color: #059669; }
        .text-red-600 { color: #dc2626; }
        .text-yellow-500 { color: #f59e0b; }
        
        /* Cards */
        [class*="Card"], [class*="card"] {
          border: 1px solid #e5e7eb;
          padding: 12px;
          margin: 8px 0;
          background: #fff;
          page-break-inside: avoid;
        }
        
        /* Badges */
        [class*="rounded-full"], [class*="badge"] {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 3px 6px;
          border-radius: 999px;
          font-size: 11px;
          display: inline-block;
          margin: 1px 2px;
          font-weight: 500;
        }
        
        /* Force flex/grid items to display vertically */
        [class*="flex"], [class*="grid"] {
          display: flex !important;
          flex-direction: column !important;
        }
        
        /* Page setup */
        @page {
          size: A4;
          margin: 8mm;
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
