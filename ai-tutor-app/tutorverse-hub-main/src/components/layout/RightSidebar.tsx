import React from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  FileText,
  Video,
  Image,
  FileCode,
  File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RightSidebarProps {
  mode: 'student' | 'educator' | 'upload';
  onAction?: (action: string) => void;
  selectedContent?: boolean;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ 
  mode, 
  onAction,
  selectedContent = false 
}) => {
  const studentTools = [
    { icon: HelpCircle, label: 'Quiz', action: 'quiz', color: 'text-primary' },
    { icon: MessageSquare, label: 'AI Chat', action: 'chat', color: 'text-success' },
    { icon: FileText, label: 'Summary', action: 'summary', color: 'text-warning' },
  ];

  const uploadTypes = [
    { icon: Video, label: 'Videos', action: 'video', color: 'text-primary' },
    { icon: Image, label: 'Images', action: 'image', color: 'text-success' },
    { icon: File, label: 'Documents', action: 'document', color: 'text-warning' },
    { icon: FileCode, label: 'Scripts', action: 'script', color: 'text-destructive' },
  ];

  if (mode === 'educator' && !selectedContent) {
    return (
      <aside className="hidden lg:block w-72 h-full bg-sidebar border-l border-sidebar-border p-4 md:p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          Upload Content
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {uploadTypes.map((item) => (
            <button
              key={item.action}
              onClick={() => onAction?.(item.action)}
              className={cn(
                "flex flex-col items-center justify-center p-3 md:p-4 rounded-xl",
                "bg-secondary/50 border border-border/50",
                "hover:bg-secondary hover:border-primary/30 transition-all duration-200",
                "group cursor-pointer"
              )}
            >
              <item.icon className={cn("w-6 h-6 md:w-8 md:h-8 mb-2", item.color, "group-hover:scale-110 transition-transform")} />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </aside>
    );
  }

  if (mode === 'student') {
    return (
      <aside className="hidden lg:block w-72 h-full bg-sidebar border-l border-sidebar-border p-4 md:p-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
          AI Tools
        </h3>
        <div className="space-y-3">
          {studentTools.map((tool) => (
            <Button
              key={tool.action}
              variant="outline"
              disabled={!selectedContent}
              onClick={() => onAction?.(tool.action)}
              className={cn(
                "w-full justify-start h-12 md:h-14 px-4",
                !selectedContent && "opacity-50 cursor-not-allowed"
              )}
            >
              <tool.icon className={cn("w-4 h-4 md:w-5 md:h-5 mr-3", tool.color)} />
              <div className="text-left">
                <p className="text-sm md:text-base font-medium">{tool.label}</p>
                <p className="text-xs text-muted-foreground hidden md:block">
                  {tool.action === 'quiz' && 'Generate MCQs'}
                  {tool.action === 'chat' && 'Ask questions'}
                  {tool.action === 'summary' && 'Summarize content'}
                </p>
              </div>
            </Button>
          ))}
        </div>
        {!selectedContent && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Select content to enable AI tools
          </p>
        )}
      </aside>
    );
  }

  return null;
};

export default RightSidebar;
