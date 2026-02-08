import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportElementToPDF, getTimestampForFilename } from '@/utils/pdf-export';

interface PDFDownloadButtonProps {
  elementId: string;
  filename?: string;
  title?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
}

/**
 * Reusable button component for downloading page content as PDF
 */
export const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  elementId,
  filename = `document-${getTimestampForFilename()}.pdf`,
  title,
  children = 'Download as PDF',
  variant = 'outline',
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      await exportElementToPDF(elementId, {
        filename,
        title,
        scale: 2,
        margin: 12,
      });
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to download PDF'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isLoading}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          {children}
        </>
      )}
    </Button>
  );
};

export default PDFDownloadButton;
