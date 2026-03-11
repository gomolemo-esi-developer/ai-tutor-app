import axios from 'axios';
import { APIGatewayProxyHandler } from 'aws-lambda';
import FormData from 'form-data';

const GOTENBERG_URL = process.env.GOTENBERG_URL || 'http://gotenberg:3000';

interface PDFRequest {
  html: string;
  filename?: string;
  title?: string;
}

/**
 * Lambda function to proxy PDF generation requests to Gotenberg
 * This avoids CORS issues by having the backend make the request
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}') as PDFRequest;
    let { html, filename = 'document.pdf', title } = body;

    if (!html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'HTML content is required' }),
      };
    }

    // Sanitize filename - remove invalid characters and newlines
    filename = filename.replace(/[\r\n"]/g, '').replace(/[<>:"/\\|?*]/g, '_').slice(0, 255);
    if (!filename || filename === '') {
      filename = 'document.pdf';
    }

    // Create FormData for Gotenberg using form-data package (Node.js compatible)
    const formData = new FormData();
    const htmlContent = wrapHTMLWithStyles(html, title);
    
    // Append HTML file as a buffer - MUST be named 'index.html' for Gotenberg
    formData.append('files', Buffer.from(htmlContent), 'index.html');

    // Gotenberg API options
    formData.append('landscape', 'false');
    formData.append('paperWidth', '8.27');
    formData.append('paperHeight', '11.69');
    formData.append('marginTop', '0.5');
    formData.append('marginBottom', '0.5');
    formData.append('marginLeft', '0.5');
    formData.append('marginRight', '0.5');
    formData.append('preferCssPageSize', 'true');
    formData.append('printBackground', 'true');

    // Call Gotenberg
    // form-data package handles Content-Type headers and boundary automatically
    const response = await axios.post(
      `${GOTENBERG_URL}/forms/chromium/convert/html`,
      formData,
      {
        responseType: 'arraybuffer',
        headers: formData.getHeaders(),
        timeout: 120000, // Increased to 120s for slow quiz PDFs with many questions
      }
    );

    // Return PDF as base64
    const base64PDF = Buffer.from(response.data).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: base64PDF,
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      }),
    };
  }
};

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

        [class*="card"], [class*="Card"] {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 16px;
          margin: 16px 0;
          background: #fafafa;
          page-break-inside: avoid;
        }

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

        @page {
          size: A4;
          margin: 12mm;
        }

        [class*="card"], [class*="Card"],
        .question-result,
        .score-card {
          page-break-inside: avoid;
        }

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
