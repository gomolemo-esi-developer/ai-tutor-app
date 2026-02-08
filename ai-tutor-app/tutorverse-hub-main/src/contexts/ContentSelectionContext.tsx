import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ContentItem } from '@/types';

interface ContentSelectionContextType {
  selectedContent: ContentItem[];
  selectedModuleId: string | null;
  setSelectedContent: (content: ContentItem[]) => void;
  setSelectedModuleId: (moduleId: string | null) => void;
  addContent: (item: ContentItem) => void;
  removeContent: (itemId: string) => void;
  clearSelection: () => void;
  toggleContent: (item: ContentItem) => void;
}

const ContentSelectionContext = createContext<ContentSelectionContextType | undefined>(undefined);

export const ContentSelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedContent, setSelectedContent] = useState<ContentItem[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const addContent = (item: ContentItem) => {
    setSelectedContent((prev) => {
      if (prev.find((c) => c.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeContent = (itemId: string) => {
    setSelectedContent((prev) => prev.filter((c) => c.id !== itemId));
  };

  const clearSelection = () => {
    setSelectedContent([]);
    setSelectedModuleId(null);
  };

  const toggleContent = (item: ContentItem) => {
    if (selectedContent.find((c) => c.id === item.id)) {
      removeContent(item.id);
    } else {
      addContent(item);
    }
  };

  return (
    <ContentSelectionContext.Provider
      value={{
        selectedContent,
        selectedModuleId,
        setSelectedContent,
        setSelectedModuleId,
        addContent,
        removeContent,
        clearSelection,
        toggleContent,
      }}
    >
      {children}
    </ContentSelectionContext.Provider>
  );
};

export const useContentSelection = () => {
  const context = useContext(ContentSelectionContext);
  if (!context) {
    throw new Error('useContentSelection must be used within a ContentSelectionProvider');
  }
  return context;
};
