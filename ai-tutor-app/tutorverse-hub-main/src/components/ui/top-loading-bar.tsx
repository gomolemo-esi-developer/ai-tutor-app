import React, { useEffect, useState } from 'react';

interface TopLoadingBarProps {
  isLoading: boolean;
  duration?: number;
}

const TopLoadingBar: React.FC<TopLoadingBarProps> = ({ isLoading, duration = 5000 }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 3000);
      return () => clearTimeout(timer);
    }

    setProgress(2);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 8;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-50 pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-primary/30 via-primary/40 to-transparent transition-all duration-300 shadow-lg shadow-primary/10"
        style={{ 
          width: `${progress}%`,
          boxShadow: `0 0 12px hsl(221 100% 50% / ${Math.max(progress / 100 * 0.3, 0.1)})`
        }}
      />
    </div>
  );
};

export default TopLoadingBar;
