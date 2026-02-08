import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFExportOptions {
  filename: string;
  title?: string;
  margin?: number;
  scale?: number;
}

/**
 * Export a DOM element to PDF with intelligent page breaks
 * Uses html2canvas + jsPDF with proper image splitting
 */
export const exportElementToPDF = async (
  elementId: string,
  options: PDFExportOptions
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  try {
    // Inject PDF-friendly styles
    const styleId = 'pdf-export-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .pdf-export {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        }
        
        .pdf-export * {
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Hide quick stats (Read Time, Topics count) */
        .pdf-export > div > div:nth-child(3) {
          display: none !important;
        }
        
        /* Hide separators and dividers */
        .pdf-export [class*="separator"] {
          display: none !important;
        }
        
        /* Hide Topics Covered section */
        .pdf-export h3:has(+ div [class*="flex"]),
        .pdf-export > div > div:last-of-type {
          display: none !important;
        }
        
        /* Style containers/cards cleanly */
        .pdf-export [class*="card"], 
        .pdf-export [class*="Card"] {
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: #fafafa !important;
          padding: 16px !important;
          margin: 12px 0 !important;
          page-break-inside: avoid !important;
        }
        
        /* Style span tags and badges */
        .pdf-export span {
          vertical-align: middle !important;
          line-height: 1.4 !important;
        }
        
        .pdf-export [class*="badge"],
        .pdf-export [class*="tag"],
        .pdf-export [class*="pill"],
        .pdf-export span[class*="rounded"] {
          background: #e8e8e8 !important;
          border: none !important;
          padding: 5px 10px !important;
          margin: 3px 5px 3px 0 !important;
          font-size: 12px !important;
          display: inline-block !important;
          vertical-align: middle !important;
          line-height: 1.2 !important;
          text-align: center !important;
          color: #333 !important;
        }
        
        /* Fix heading styles */
        .pdf-export h1, 
        .pdf-export h2, 
        .pdf-export h3 {
          margin: 16px 0 8px 0 !important;
          padding: 0 !important;
          line-height: 1.3 !important;
          font-weight: 600 !important;
          color: #000 !important;
        }
        
        .pdf-export h1 {
          font-size: 24px !important;
        }
        
        .pdf-export h2 {
          font-size: 18px !important;
        }
        
        .pdf-export h3 {
          font-size: 16px !important;
        }
        
        /* Fix paragraph styles */
        .pdf-export p {
          margin: 6px 0 !important;
          padding: 0 !important;
          line-height: 1.5 !important;
          color: #333 !important;
        }
        
        /* Fix list styles */
        .pdf-export ul, .pdf-export ol {
          margin: 8px 0 !important;
          padding-left: 20px !important;
        }
        
        .pdf-export li {
          margin: 4px 0 !important;
          line-height: 1.5 !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.classList.add('pdf-export');
    
    // Remove buttons and navigation elements
    const buttons = clonedElement.querySelectorAll('button');
    buttons.forEach(button => {
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

    // Remove Read Time and Topics stats cards
    const allElements = clonedElement.querySelectorAll('[class*="Card"], [class*="card"]');
    allElements.forEach(el => {
      const text = el.textContent || '';
      if (text.includes('Read Time') || text.includes('Topics')) {
        el.remove();
      }
    });

    // Remove Topics Covered section
    const headings = clonedElement.querySelectorAll('h3, h2');
    headings.forEach(heading => {
      if (heading.textContent?.includes('Topics')) {
        // Remove the heading and the next sibling (usually the content)
        const nextEl = heading.nextElementSibling;
        heading.remove();
        if (nextEl) nextEl.remove();
      }
    });

    // Remove separator/divider elements
    const separators = clonedElement.querySelectorAll('[class*="separator"], [class*="Separator"]');
    separators.forEach(sep => sep.remove());

    // Create wrapper for the cloned content
    const wrapper = document.createElement('div');
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';
    wrapper.appendChild(clonedElement);

    // Create temporary container - positioned off-screen but visible
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.width = '800px'; // Fixed width for consistent rendering
    container.style.backgroundColor = 'white';
    container.appendChild(wrapper);
    document.body.appendChild(container);

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get the actual height needed
    const contentHeight = wrapper.offsetHeight;
    container.style.height = contentHeight + 'px';

    // Convert to canvas - use container width for accurate scaling
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0,
      ignoreElements: (element) => {
        // Ignore any remaining buttons
        if (element.tagName === 'BUTTON') return true;
        return false;
      },
    });

    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);

    if (canvas.height === 0 || canvas.width === 0) {
      throw new Error('Failed to render content to canvas');
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    // Calculate scaling: convert canvas pixels to PDF mm
    const scale = contentWidth / (canvas.width / 2); // Divide by 2 because scale is 2
    const imgHeight = (canvas.height / 2) * scale;

    console.log('PDF dimensions - width:', contentWidth, 'mm, height:', imgHeight, 'mm');

    // Convert canvas to image
    const imgData = canvas.toDataURL('image/png');

    // Calculate how many pages we need
    const usablePageHeight = pageHeight - margin * 2;
    const numPages = Math.ceil(imgHeight / usablePageHeight);

    console.log('Total pages needed:', numPages);

    // Add title to first page if provided
    let yOffset = margin;
    if (options.title) {
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text(options.title, margin, yOffset);
      yOffset += 8;
    }

    // Add pages with image slices
    for (let i = 0; i < numPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const pageYStart = i * usablePageHeight;
      const pageYEnd = Math.min((i + 1) * usablePageHeight, imgHeight);
      const pageHeight = pageYEnd - pageYStart;

      // Calculate source region in canvas
      const sourcePixelY = (pageYStart / scale) * 2; // Multiply by 2 because scale is 2
      const sourcePixelHeight = (pageHeight / scale) * 2;

      // Create temporary canvas for this page
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.ceil(sourcePixelHeight);

      const ctx = pageCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Draw the slice
      ctx.drawImage(
        canvas,
        0,
        Math.floor(sourcePixelY),
        canvas.width,
        Math.ceil(sourcePixelHeight),
        0,
        0,
        canvas.width,
        Math.ceil(sourcePixelHeight)
      );

      const sliceImgData = pageCanvas.toDataURL('image/png');
      const yPos = i === 0 ? yOffset : margin;

      pdf.addImage(
        sliceImgData,
        'PNG',
        margin,
        yPos,
        contentWidth,
        pageHeight
      );
    }

    // Save the PDF
    pdf.save(options.filename);

    // Cleanup
    document.body.removeChild(container);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error('Failed to export PDF. Please try again.');
  }
};

/**
 * Simple HTML to PDF conversion (for simpler content)
 */
export const exportHTMLToPDF = (
  html: string,
  options: PDFExportOptions
): void => {
  const element = document.createElement('div');
  element.innerHTML = html;
  element.style.padding = '20px';
  element.style.fontFamily = 'Arial, sans-serif';
  element.style.backgroundColor = 'white';
  element.style.color = 'black';

  const opt = {
    margin: options.margin || 10,
    filename: options.filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: options.scale || 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  };

  html2pdf().set(opt).from(element).save();
};

/**
 * Format timestamp for filename
 */
export const getTimestampForFilename = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
};


