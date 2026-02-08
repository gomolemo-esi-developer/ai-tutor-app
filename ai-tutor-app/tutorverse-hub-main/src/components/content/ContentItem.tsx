import React from 'react';
import { Video, FileText, File, Download, Sparkles } from 'lucide-react';
import { ContentItem as ContentItemType } from '@/types';
import { cn } from '@/lib/utils';

interface ContentItemProps {
  item: ContentItemType;
  isSelected: boolean;
  onClick: () => void;
  onDownload?: (item: ContentItemType) => void;
}

const ContentItemComponent: React.FC<ContentItemProps> = ({ item, isSelected, onClick, onDownload }) => {
  const getIcon = () => {
    switch (item.type) {
      case 'video':
        return Video;
      case 'pdf':
        return FileText;
      default:
        return File;
    }
  };

  const Icon = getIcon();

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl cursor-pointer",
        "border transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:bg-card/80"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center",
        item.type === 'video' ? 'bg-primary/20 text-primary' :
        item.type === 'pdf' ? 'bg-destructive/20 text-destructive' :
        'bg-warning/20 text-warning'
      )}>
        <Icon className="w-6 h-6" />
      </div>

      <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2 mb-1">
           <span className="text-xs font-medium uppercase text-muted-foreground">
             {(item as any).rawFileType || item.type}
           </span>
           {(item as any).contentTypeLabel && (
             <span className="text-xs font-medium text-primary/70 bg-primary/10 px-2 py-0.5 rounded">
               {(item as any).contentTypeLabel}
             </span>
           )}
           {item.source === 'ai-tutor' && (
             <span className="flex items-center gap-1 text-xs text-primary">
               <Sparkles className="w-3 h-3" />
               AI Generated
             </span>
           )}
         </div>
        <h4 className="font-medium text-foreground truncate">{item.title}</h4>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDownload?.(item);
        }}
        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-secondary transition-all"
      >
        <Download className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
};

export default ContentItemComponent;
