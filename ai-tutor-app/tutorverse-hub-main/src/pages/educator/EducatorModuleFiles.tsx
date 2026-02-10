import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Upload, Filter, FileText, Video, Image, File, X, ArrowLeft, Download, Trash2, SortAsc, SortDesc } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/ui/loading-spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { FileUploadModal } from '@/components/educator/FileUploadModal';
import { ChunksViewer } from '@/components/educator/ChunksViewer';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import { createGlobalApiClient } from '@/services/apiClient';

interface SharedFile {
  id: string;
  name: string;
  type: 'pdf' | 'video' | 'image' | 'document';
  contentType?: string; // e.g., 'lecture-notes', 'presentations', 'assignments'
  contentTypeLabel?: string; // Human-readable label
  moduleId: string;
  moduleCode: string;
  moduleName: string;
  authorId: string;
  authorName: string;
  size: string;
  uploadedAt: string;
  ragDocumentId?: string;
}

type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc';

const EducatorModuleFiles: React.FC = () => {
  const { moduleCode } = useParams<{ moduleCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<SharedFile | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [filters, setFilters] = useState({
    fileType: [] as string[],
  });
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [module, setModule] = useState<any>(null);

  const { get: getFiles, loading } = useApi<SharedFile[]>();
  const { del } = useApi();

  useEffect(() => {
    if (moduleCode) {
      fetchModuleAndFiles();
    }
  }, [moduleCode]);

  const fetchModuleAndFiles = async () => {
    try {
      // Step 1: Fetch educator's modules to get module details
      const modulesData = await getFiles(`/api/educator/modules`);
      console.log('Educator modules fetched:', modulesData);
      
      // Find the module that matches the moduleCode
      const currentModule = (modulesData || []).find((m: any) => m.code === moduleCode || m.moduleCode === moduleCode);
      
      if (!currentModule) {
         console.error('Module not found for moduleCode:', moduleCode);
         toast.error('Module not found');
         return;
       }
       
       console.log('Current module found:', currentModule);
       
       // Step 2: Fetch files using moduleCode (backend expects moduleCode, not moduleId)
       const filesData = await getFiles(`/api/educator/files?moduleCode=${currentModule.moduleCode}`);
       console.log('Educator files fetched from API for moduleCode:', currentModule.moduleCode, filesData);
       
       // Transform response to match SharedFile interface
       const formattedFiles = (filesData?.files || []).map((f: any) => {
         console.log('File data received:', f); // Debug log
         return {
           id: f.fileId,
           name: f.metadata?.title || f.fileName,
           type: f.fileType?.toLowerCase() || 'document',
           contentType: f.metadata?.contentType || f.contentType,
           contentTypeLabel: getContentTypeLabel(f.metadata?.contentType || f.contentType),
           moduleCode: currentModule.moduleCode,
           moduleName: currentModule.moduleName,
           authorId: f.lecturerId || '',
           authorName: f.createdBy || 'Unknown',
           size: formatFileSize(f.fileSize),
           uploadedAt: new Date(f.uploadedAt).toLocaleDateString(),
           ragDocumentId: f.ragDocumentId || f.documentId || f.document_id,
         };
       });
      
      setFiles(formattedFiles);
      
      // Set module details
      const moduleData = {
        code: currentModule.moduleCode,
        name: currentModule.moduleName,
        description: currentModule.description,
        department: currentModule.department,
      };
      setModule(moduleData);
    } catch (err) {
      console.error('Error fetching module and files:', err);
      toast.error('Failed to load files');
    }
  };

  // Content type mappings - matches FileUploadModal.tsx
  const CONTENT_TYPES = [
    { value: 'lecture-notes', label: 'Lecture Notes' },
    { value: 'presentations', label: 'Presentations' },
    { value: 'assignments', label: 'Assignments' },
    { value: 'exams', label: 'Exams' },
    { value: 'scripts', label: 'Scripts' },
    { value: 'spreadsheets', label: 'Spreadsheets' },
    { value: 'audio', label: 'Audio' },
    { value: 'lecture-video', label: 'Lecture (Video)' },
    { value: 'lecture-audio', label: 'Lecture (Audio)' },
    { value: 'infographics', label: 'Infographics' },
    { value: 'poster', label: 'Poster' },
  ];

  const getContentTypeLabel = (contentType?: string): string => {
    if (!contentType) return 'Document';
    const type = CONTENT_TYPES.find((t) => t.value === contentType);
    return type?.label || contentType;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const parseFileSize = (size: string): number => {
    const value = parseFloat(size);
    if (size.includes('GB')) return value * 1024 * 1024;
    if (size.includes('MB')) return value * 1024;
    if (size.includes('KB')) return value;
    return value;
  };

  const sortFiles = (filesToSort: SharedFile[]): SharedFile[] => {
    return [...filesToSort].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'date-asc':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'date-desc':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'size-asc':
          return parseFileSize(a.size) - parseFileSize(b.size);
        case 'size-desc':
          return parseFileSize(b.size) - parseFileSize(a.size);
        default:
          return 0;
      }
    });
  };

  const filteredFiles = sortFiles(files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filters.fileType.length === 0 || filters.fileType.includes(file.type);
    return matchesSearch && matchesFilter;
  }));

  const handleFileUpload = async (fileName: string, fileType: 'pdf' | 'video' | 'image' | 'document', fileSize: string) => {
    if (!module || !user || !moduleCode) return;
    
    try {
      // Call API to upload file
      const formData = new FormData();
      formData.append('name', fileName);
      formData.append('type', fileType);
      formData.append('moduleCode', moduleCode);
      formData.append('size', fileSize);
      
      // POST to API
      await fetch('/api/educator/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: formData
      });
      
      toast.success('File uploaded successfully');
      fetchFiles();
      setIsUploadModalOpen(false);
    } catch (err) {
      console.error('Error uploading file:', err);
      toast.error('Failed to upload file');
    }
  };

  const handleDeleteClick = (file: SharedFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      await del(`/api/educator/files/${fileToDelete.id}`);
      toast.success('File deleted successfully');
      // Refresh the file list
      await fetchModuleAndFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      toast.error('Failed to delete file');
    } finally {
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDownload = async (file: SharedFile) => {
    const toastId = toast.loading(`Downloading ${file.name}...`);
    try {
      const apiClient = createGlobalApiClient();
      const baseURL = apiClient.getBaseURL();
      
      // Get presigned download URL from backend using absolute URL to bypass Nginx
      const response = await fetch(`${baseURL}/api/educator/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      // Response is wrapped in {success, data, timestamp}
      const downloadUrl = responseData.data?.downloadUrl || responseData.downloadUrl;
      
      if (!downloadUrl) {
        throw new Error('No download URL received from server');
      }
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.dismiss(toastId);
      toast.success(`Downloaded ${file.name}`);
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.dismiss(toastId);
      toast.error('Failed to download file');
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-destructive" />;
      case 'video':
        return <Video className="w-5 h-5 text-primary" />;
      case 'image':
        return <Image className="w-5 h-5 text-green-500" />;
      default:
        return <File className="w-5 h-5 text-yellow-500" />;
    }
  };

  const clearFilters = () => {
    setFilters({ fileType: [] });
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'name-asc': return 'Name (A-Z)';
      case 'name-desc': return 'Name (Z-A)';
      case 'date-asc': return 'Date (Oldest)';
      case 'date-desc': return 'Date (Newest)';
      case 'size-asc': return 'Size (Smallest)';
      case 'size-desc': return 'Size (Largest)';
      default: return 'Sort';
    }
  };

  if (!module) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Module not found</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="Loading files..." />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/files')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Modules
          </Button>

          <header className="mb-6">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
              <span className="text-xs md:text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                {module.code}
              </span>
              <span className="text-xs md:text-sm text-muted-foreground">{module.department}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              {module.name}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2">{module.description}</p>
          </header>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setIsUploadModalOpen(true)} className="flex-1 sm:flex-none">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              
              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {sortOption.includes('asc') ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    <span className="hidden sm:inline">{getSortLabel()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                  <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <DropdownMenuRadioItem value="name-asc">Name (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name-desc">Name (Z-A)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date-desc">Date (Newest)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date-asc">Date (Oldest)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="size-desc">Size (Largest)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="size-asc">Size (Smallest)</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filter</span>
                    {filters.fileType.length > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {filters.fileType.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                  <DropdownMenuLabel>File Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {['pdf', 'video', 'image', 'document'].map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={filters.fileType.includes(type)}
                      onCheckedChange={(checked) => {
                        setFilters({
                          ...filters,
                          fileType: checked
                            ? [...filters.fileType, type]
                            : filters.fileType.filter((t) => t !== type),
                        });
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-destructive"
                    onClick={clearFilters}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* File count indicator */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="grid gap-3">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate text-sm md:text-base group-hover:text-primary transition-colors">
                    {file.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
                    <span>{file.size}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{file.uploadedAt}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{file.contentTypeLabel || getContentTypeLabel(file.contentType)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                   <ChunksViewer
                     fileId={file.id}
                     fileName={file.name}
                     documentId={file.ragDocumentId || ''}
                   />
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                     onClick={() => handleDownload(file)}
                   >
                     <Download className="w-4 h-4 text-primary" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                     onClick={() => handleDeleteClick(file)}
                   >
                     <Trash2 className="w-4 h-4 text-destructive" />
                   </Button>
                 </div>
              </div>
            ))}

            {filteredFiles.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No files found. Upload your first file!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={() => {
          setIsUploadModalOpen(false);
          fetchModuleAndFiles();
        }}
        moduleCode={module?.code}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">No, Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default EducatorModuleFiles;
