import React, { useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Module } from '@/types';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  module: Module;
  onClick: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, onClick }) => {
  const [imageError, setImageError] = useState(false);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 rounded-xl cursor-pointer",
        "bg-card border border-border",
        "hover:border-primary/30 hover:bg-card/80",
        "transition-all duration-300",
        "animate-fade-in"
      )}
    >
      <div className="w-full sm:w-24 h-32 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
        {!imageError && module.thumbnail ? (
          <img
            src={module.thumbnail}
            alt={module.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <BookOpen className="w-8 h-8 text-primary" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors text-sm md:text-base">
          {module.name}
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-2">
          {module.description}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
            {module.code}
          </span>
          <span className="text-xs text-muted-foreground">
            {module.department}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex items-center">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          "bg-secondary group-hover:bg-primary transition-colors duration-300"
        )}>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default ModuleCard;
