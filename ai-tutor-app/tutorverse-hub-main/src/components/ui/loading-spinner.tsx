import React from 'react';
import { cn } from '@/lib/utils';
import TopLoadingBar from './top-loading-bar';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTopBar?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message,
  className,
  size = 'md',
  showTopBar = true
}) => {
  return (
    <>
      {showTopBar && <TopLoadingBar isLoading={true} />}
      {message && (
        <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
          <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
        </div>
      )}
    </>
  );
};

export default LoadingSpinner;
