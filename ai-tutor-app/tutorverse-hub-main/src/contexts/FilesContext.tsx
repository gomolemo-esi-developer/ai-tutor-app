import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SharedFile {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'image' | 'document';
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  authorId: string;
  authorName: string;
  size: string;
  uploadedAt: string;
}

interface FilesContextType {
  files: SharedFile[];
  addFile: (file: Omit<SharedFile, 'id' | 'uploadedAt'>) => void;
  deleteFile: (fileId: string) => void;
  getFilesByModuleId: (moduleId: string) => SharedFile[];
  getFilesByModuleIds: (moduleIds: string[]) => SharedFile[];
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

// Initial mock files
const initialFiles: SharedFile[] = [
  { id: 'F001', name: 'Introduction to Programming.pdf', type: 'pdf', moduleId: '1', moduleCode: 'ISY238T', moduleName: 'Information Systems', authorId: 'L003', authorName: 'Dr. Sarah Johnson', size: '2.5 MB', uploadedAt: '2024-01-15' },
  { id: 'F002', name: 'Data Structures Overview.pdf', type: 'pdf', moduleId: '2', moduleCode: 'DSA320C', moduleName: 'Data Structures & Algorithms', authorId: 'L002', authorName: 'Prof. James Wilson', size: '3.2 MB', uploadedAt: '2024-01-14' },
  { id: 'F003', name: 'Lecture 1 - Basics.mp4', type: 'video', moduleId: '1', moduleCode: 'ISY238T', moduleName: 'Information Systems', authorId: 'L003', authorName: 'Dr. Sarah Johnson', size: '150 MB', uploadedAt: '2024-01-13' },
  { id: 'F004', name: 'Algorithm Diagram.png', type: 'image', moduleId: '2', moduleCode: 'DSA320C', moduleName: 'Data Structures & Algorithms', authorId: 'L002', authorName: 'Prof. James Wilson', size: '1.1 MB', uploadedAt: '2024-01-12' },
  { id: 'F005', name: 'Assignment Guidelines.docx', type: 'document', moduleId: '3', moduleCode: 'WEB201T', moduleName: 'Web Development', authorId: 'L001', authorName: 'Dr. Alice Brown', size: '500 KB', uploadedAt: '2024-01-11' },
];

export const FilesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<SharedFile[]>(initialFiles);

  const addFile = (file: Omit<SharedFile, 'id' | 'uploadedAt'>) => {
    const newFile: SharedFile = {
      ...file,
      id: `F${String(files.length + 1).padStart(3, '0')}`,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    setFiles((prev) => [newFile, ...prev]);
  };

  const deleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const getFilesByModuleId = (moduleId: string) => {
    return files.filter((f) => f.moduleId === moduleId);
  };

  const getFilesByModuleIds = (moduleIds: string[]) => {
    return files.filter((f) => moduleIds.includes(f.moduleId));
  };

  return (
    <FilesContext.Provider value={{ files, addFile, deleteFile, getFilesByModuleId, getFilesByModuleIds }}>
      {children}
    </FilesContext.Provider>
  );
};

export const useFiles = () => {
  const context = useContext(FilesContext);
  if (context === undefined) {
    throw new Error('useFiles must be used within a FilesProvider');
  }
  return context;
};
