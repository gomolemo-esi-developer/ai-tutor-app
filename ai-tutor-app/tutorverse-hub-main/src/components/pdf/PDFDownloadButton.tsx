import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { exportElementToPDFGotenberg, getTimestampForFilename } from '@/utils/pdf-export-gotenberg';

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
            toast.loading('Generating PDF... Please wait. This may take up to 3 minutes for large quizzes.', { duration: Infinity });
            await exportElementToPDFGotenberg(elementId, {
                filename,
                title,
            });
            toast.dismiss(); // Clear the loading toast
            toast.success('PDF downloaded successfully!');
        } catch (error) {
            console.error('PDF export error:', error);
            toast.dismiss(); // Clear the loading toast

            const errorMsg = error instanceof Error ? error.message : String(error);
            
            // Check for specific error types
            if (errorMsg.includes('Authentication required')) {
                toast.error('You must be logged in to download PDF');
            } else if (errorMsg.includes('Network') || errorMsg.includes('REFUSED') || errorMsg.includes('ERR_CONNECTION') || errorMsg.includes('ERR_NETWORK')) {
                toast.error(
                    'PDF service is unavailable. Please try again in a few moments.',
                    { duration: 6000 }
                );
            } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                toast.error('Authentication failed. Please log in again.');
            } else if (errorMsg.includes('timeout')) {
                toast.error(
                    'PDF generation exceeded 3 minutes. Please try again or contact support if the issue persists.',
                    { duration: 10000 }
                );
            } else {
                toast.error(
                    error instanceof Error ? error.message : 'Failed to download PDF'
                );
            }
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
