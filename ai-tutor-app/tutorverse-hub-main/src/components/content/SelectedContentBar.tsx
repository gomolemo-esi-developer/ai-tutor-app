import React from 'react';
import { X, FileText, Video, File, HelpCircle, MessageSquare, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContentSelection } from '@/contexts/ContentSelectionContext';
import { cn } from '@/lib/utils';
import { useParams } from 'react-router-dom';

interface SelectedContentBarProps {
  className?: string;
  showClear?: boolean;
  onAction?: (action: string) => void;
}

const SelectedContentBar: React.FC<SelectedContentBarProps> = ({ className, showClear = true, onAction }) => {
  const { selectedContent, removeContent, clearSelection } = useContentSelection();
  const { moduleId } = useParams<{ moduleId: string }>();

  if (selectedContent.length === 0) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-3 h-3" />;
      case 'pdf':
        return <FileText className="w-3 h-3" />;
      default:
        return <File className="w-3 h-3" />;
    }
  };

  return (
    <div className={cn(
      "bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          Selected Content ({selectedContent.length})
        </span>
        {showClear && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            Clear All
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {selectedContent.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="flex items-center gap-1.5 pr-1 py-1 bg-background border border-border"
            >
              {getTypeIcon(item.type)}
              <span className="max-w-[150px] truncate text-xs">{item.title}</span>
              <button
                onClick={() => removeContent(item.id)}
                className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </Badge>
          ))}
        </div>
        {onAction && (
          <div className="hidden md:flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => onAction('quiz')}
              className="gap-2 flex-1"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Quiz</span>
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => onAction('chat')}
              className="gap-2 flex-1"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => onAction('summary')}
              className="gap-2 flex-1"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Summary</span>
            </Button>
          </div>
        )}
        </div>
        </div>
        );
        };

export default SelectedContentBar;
