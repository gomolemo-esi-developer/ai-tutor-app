# PDF Export Feature

Beautiful PDF download functionality for summaries and quiz results.

## Features

- **High-quality PDFs**: Converts web content to beautiful, readable PDFs with original styling preserved
- **Easy integration**: Drop-in React component for PDF downloads
- **Customizable**: Flexible options for filenames, titles, margins, and scale
- **Responsive**: Works seamlessly across all device sizes
- **Progress feedback**: Loading states and success/error notifications

## Components

### PDFDownloadButton

A reusable button component that triggers PDF downloads with a single click.

#### Usage

```tsx
import { PDFDownloadButton } from '@/components/pdf/PDFDownloadButton';
import { getTimestampForFilename } from '@/utils/pdf-export';

<PDFDownloadButton
  elementId="my-content"
  filename={`My-Document-${getTimestampForFilename()}.pdf`}
  title="My Document Title"
  variant="outline"
/>
```

#### Props

- `elementId` (string, required): ID of the DOM element to export
- `filename` (string, optional): Filename for the PDF. Default: `document-YYYY-MM-DD.pdf`
- `title` (string, optional): Title to appear at the top of the PDF
- `children` (React.ReactNode, optional): Button text. Default: "Download as PDF"
- `variant` (string, optional): Button style variant (default, outline, ghost, secondary)
- `className` (string, optional): Additional CSS classes

## Usage Examples

### Summary Page

```tsx
<PDFDownloadButton
  elementId="summary-content"
  filename={`Summary-${title}-${getTimestampForFilename()}.pdf`}
  title={title}
  className="w-full sm:w-auto"
/>
```

Make sure to wrap your content in a div with the matching ID:

```tsx
<div id="summary-content">
  {/* Summary content here */}
</div>
```

### Quiz Results Page

```tsx
<PDFDownloadButton
  elementId="quiz-results-content"
  filename={`Quiz-Results-${moduleCode}-${getTimestampForFilename()}.pdf`}
  title={`Quiz Results - ${moduleCode}`}
/>
```

## Styling for PDF Export

The PDF export preserves your existing Tailwind CSS styles. To ensure optimal PDF appearance:

### Good Practices

1. **Use semantic HTML**: Proper headings, paragraphs, and lists render better in PDFs
2. **Avoid complex layouts**: Simpler grid/flex layouts convert better
3. **Test your PDFs**: Always generate a test PDF to verify appearance
4. **Use explicit colors**: CSS variables may not always transfer to PDFs

### PDF-specific Classes

Use Tailwind's `print:` variant for PDF-specific styling:

```tsx
<div className="print:hidden">
  {/* Hidden in PDF, visible on web */}
</div>

<div className="print:block">
  {/* Shown in PDF */}
</div>
```

## How It Works

The PDF export process:

1. Clones the target DOM element
2. Converts it to a high-quality canvas using `html2canvas`
3. Embeds the canvas in a PDF using `jsPDF`
4. Handles multi-page documents by splitting across pages
5. Saves the file to the user's downloads folder

## Dependencies

- `html2pdf.js`: High-level PDF generation wrapper
- `jspdf`: PDF generation library
- `html2canvas`: HTML to canvas conversion

Install with:

```bash
npm install html2pdf.js jspdf html2canvas
```

## Troubleshooting

### PDF doesn't include images
- Ensure images have `src` attributes (not `srcSet`)
- Use absolute URLs for external images
- Check browser console for CORS errors

### Styling doesn't transfer to PDF
- Inline styles may not transfer; use CSS classes
- Test with simpler layouts first
- Check `html2canvas` scale option (currently set to 2 for high quality)

### PDF is blank or corrupted
- Check that the elementId matches your DOM element
- Verify the element has content
- Check browser console for errors
- Try reducing the `scale` option in `pdf-export.ts`

## Performance Tips

- **Large content**: For very large documents, consider splitting into multiple PDFs
- **High scale**: Increasing scale improves quality but increases processing time
- **Async loading**: The export is async; use loading states appropriately

## Future Enhancements

- Batch PDF exports (multiple summaries/quizzes at once)
- PDF templates with branding
- Custom margins and page orientation
- Watermarks and footers
- Email delivery of PDFs
