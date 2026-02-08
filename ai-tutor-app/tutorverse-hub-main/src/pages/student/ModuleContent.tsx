import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowLeft, X, Check, Sparkles, HelpCircle, MessageSquare, FileText, RefreshCw, Download } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ContentItemComponent from '@/components/content/ContentItem';
import SelectedContentBar from '@/components/content/SelectedContentBar';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useContentSelection } from '@/contexts/ContentSelectionContext';
import { useApi } from '@/hooks/useApi';
import StudentService from '@/services/StudentService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const ModuleContent: React.FC = () => {
  const { moduleCode } = useParams<{ moduleCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedContent, toggleContent, setSelectedModuleId, clearSelection } = useContentSelection();

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [content, setContent] = useState<any[]>([]);
  const [module, setModule] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    display: 'all',
    contentType: [] as string[],
    fileType: [] as string[],
  });

  const { get: getModuleContent, loading } = useApi();
  
  useEffect(() => {
    setSelectedModuleId(moduleCode || null);
    if (moduleCode) {
      fetchModuleContent();
    }
  }, [moduleCode, setSelectedModuleId]);

  const fetchModuleContent = async () => {
    try {
      // First, fetch enrolled modules to get the full module object
      const enrolledModules = await StudentService.getStudentModules();
      const moduleObj = enrolledModules.find((m: any) => m.code === moduleCode || m.moduleCode === moduleCode);
      
      if (!moduleObj) {
        toast.error('Module not found');
        return;
      }
      
      setModule(moduleObj);
       
       // Fetch module content using moduleCode
       // Endpoint: GET /api/student/modules/{moduleCode}/content
       const contentData = await getModuleContent(`/api/student/modules/${moduleCode}/content`);
       // Backend returns {moduleCode, moduleName, files: [{fileId, fileName, fileType, ...}]}
       // Transform files to match component expectations
       const mapFileType = (fileType: string): 'video' | 'pdf' | 'document' | 'notes' => {
         const normalizedType = (fileType || '').toLowerCase();
         if (normalizedType.includes('video') || normalizedType === 'mp4' || normalizedType === 'avi' || normalizedType === 'mov') return 'video';
         if (normalizedType === 'pdf') return 'pdf';
         if (normalizedType.includes('word') || normalizedType === 'doc' || normalizedType === 'docx') return 'document';
         return 'document';
       };

       const getContentTypeLabel = (contentType?: string): string => {
         const contentTypeMap: Record<string, string> = {
           'lecture-notes': 'Lecture Notes',
           'presentations': 'Presentations',
           'assignments': 'Assignments',
           'exams': 'Exams',
           'scripts': 'Scripts',
           'spreadsheets': 'Spreadsheets',
           'audio': 'Audio',
           'lecture-video': 'Lecture Video',
           'lecture-audio': 'Lecture Audio',
           'infographics': 'Infographics',
           'poster': 'Poster',
         };
         if (!contentType) return 'Document';
         return contentTypeMap[contentType] || contentType;
       };

       const files = (contentData?.files || []).map((file: any) => ({
         id: file.fileId,
         title: file.title || file.fileName,
         type: mapFileType(file.fileType),
         rawFileType: file.fileType,
         contentType: file.contentType,
         contentTypeLabel: getContentTypeLabel(file.contentType),
         category: 'file',
         source: 'lecturer',
         size: file.fileSize,
         uploadedAt: file.uploadedAt,
         mimeType: file.mimeType,
         isPublished: file.isPublished,
         accessLevel: file.accessLevel,
       }));
       setContent(files);
    } catch (err) {
      console.error('Error fetching module content:', err);
      toast.error('Failed to load module content');
      // Fallback to mock data
      const mockModule = mockModules.find((m) => m.code === moduleCode || m.moduleCode === moduleCode);
      setModule(mockModule);
      const mockModuleContent = mockContent.filter((c) => c.moduleCode === moduleCode);
      setContent(mockModuleContent);
    }
  };

  const filteredContent = content.filter((item) => {
    // Defensive checks for required properties
    if (!item?.title) return false;
    
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDisplay =
      filters.display === 'all' ||
      (filters.display === 'lecturer' && item.source === 'lecturer') ||
      (filters.display === 'ai' && item.source === 'ai-tutor');
    const matchesType =
      filters.contentType.length === 0 || (item.category && filters.contentType.includes(item.category.toLowerCase()));
    const matchesFileType =
      filters.fileType.length === 0 || (item.type && filters.fileType.includes(item.type));

    return matchesSearch && matchesDisplay && matchesType && matchesFileType;
  });

  const clearFilters = () => {
    setFilters({
      display: 'all',
      contentType: [],
      fileType: [],
    });
  };

  const isContentSelected = (itemId: string) => {
    return selectedContent.some((c) => c.id === itemId);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchModuleContent();
      toast.success('Content refreshed');
    } catch (err) {
      toast.error('Failed to refresh content');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAIAction = (action: string) => {
    if (selectedContent.length === 0) return;
    
    const contentIds = selectedContent.map((c) => c.id).join(',');
    setIsMobileToolsOpen(false);
    
    switch (action) {
      case 'chat':
        navigate(`/chat?moduleCode=${moduleCode}&contentIds=${contentIds}`);
        break;
      case 'quiz':
        navigate(`/modules/${moduleCode}/quiz?contentIds=${contentIds}`);
        break;
      case 'summary':
        navigate(`/modules/${moduleCode}/summary?contentIds=${contentIds}`);
        break;
    }
  };

  const handleDownload = async (item: any) => {
    const toastId = toast.loading(`Downloading ${item.title}...`);
    try {
      const token = localStorage.getItem('jwt_token');
      const backendUrl = import.meta.env.VITE_API_URL || 'http://backend:3000';
      console.log('Download attempt:', { fileId: item.id, fileName: item.title, tokenExists: !!token, backendUrl });
      
      // Get presigned download URL from backend
      const response = await fetch(`${backendUrl}/api/student/content/${item.id}/download-url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Download response status:', response.status);
      console.log('Download response headers:', {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
      });
      
      // Try to read as text first to see what we're getting
      const text = await response.text();
      console.log('Download response body (first 500 chars):', text.substring(0, 500));
      
      if (!response.ok || !text.trim().startsWith('{')) {
        throw new Error(`Invalid response: status ${response.status}, response type: ${response.headers.get('content-type')}`);
      }
      
      const responseData = JSON.parse(text);
      console.log('Download response data:', responseData);
      
      // Response is wrapped in {success, data, timestamp}
      const downloadUrl = responseData.data?.downloadUrl || responseData.downloadUrl;
      
      if (!downloadUrl) {
        throw new Error('No download URL received from server');
      }
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = item.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.dismiss(toastId);
      toast.success(`Downloaded ${item.title}`);
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.dismiss(toastId);
      toast.error('Failed to download file');
    }
  };

  const studentTools = [
    { icon: HelpCircle, label: 'Quiz', description: 'Generate MCQs', action: 'quiz', color: 'text-primary' },
    { icon: MessageSquare, label: 'AI Chat', description: 'Ask questions', action: 'chat', color: 'text-success' },
    { icon: FileText, label: 'Summary', description: 'Summarize content', action: 'summary', color: 'text-warning' },
  ];

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
          <LoadingSpinner message="Loading module content..." />
        </div>
      </MainLayout>
    );
  }

  // Normalize role for comparison (backward compatible)
  const normalizedRole = (user?.role || '').toUpperCase();

  return (
    <MainLayout>
      <div className="flex-1 p-4 md:p-6 overflow-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto pb-20 lg:pb-0">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => {
              clearSelection();
              navigate('/modules');
            }}
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

          {/* Selected Content Bar */}
          <SelectedContentBar onAction={handleAIAction} />

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

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh content"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
                <DropdownMenuLabel>Display</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={filters.display === 'all'}
                  onCheckedChange={() => setFilters({ ...filters, display: 'all' })}
                >
                  All Content
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.display === 'lecturer'}
                  onCheckedChange={() => setFilters({ ...filters, display: 'lecturer' })}
                >
                  Lecturer's Content
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.display === 'ai'}
                  onCheckedChange={() => setFilters({ ...filters, display: 'ai' })}
                >
                  AI-Tutor Content
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>File Type</DropdownMenuLabel>
                {['video', 'pdf', 'document'].map((type) => (
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

          <div className="grid gap-3">
            {filteredContent.map((item) => (
              <div
                key={item.id}
                className={`relative group transition-all ${
                  isContentSelected(item.id) ? 'ring-2 ring-primary rounded-xl' : ''
                }`}
              >
                {/* Selection checkbox */}
                <div 
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleContent(item);
                  }}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isContentSelected(item.id) 
                      ? 'bg-primary border-primary' 
                      : 'border-muted-foreground/50 hover:border-primary'
                  }`}>
                    {isContentSelected(item.id) && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
                <div className="pl-10">
                   <ContentItemComponent
                     item={item}
                     isSelected={isContentSelected(item.id)}
                     onClick={() => toggleContent(item)}
                     onDownload={handleDownload}
                   />
                 </div>
              </div>
            ))}
          </div>

          {filteredContent.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No content found.</p>
            </div>
          )}
          </div>
          </div>

          {/* Mobile/Tablet Floating Action Button for AI Tools */}
          {normalizedRole === 'STUDENT' && (
          <Sheet open={isMobileToolsOpen} onOpenChange={setIsMobileToolsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className={cn(
                "lg:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
                selectedContent.length > 0 && "animate-pulse-glow"
              )}
            >
              <Sparkles className="w-6 h-6" />
              {selectedContent.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {selectedContent.length}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-2xl bg-card">
            <SheetHeader className="pb-4">
              <SheetTitle>Generate Content</SheetTitle>
            </SheetHeader>
            <div className="space-y-3 pb-6">
              {studentTools.map((tool) => (
                <Button
                  key={tool.action}
                  variant="outline"
                  disabled={selectedContent.length === 0}
                  onClick={() => handleAIAction(tool.action)}
                  className={cn(
                    "w-full justify-start h-14 px-4",
                    selectedContent.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <tool.icon className={cn("w-5 h-5 mr-3", tool.color)} />
                  <div className="text-left">
                    <p className="font-medium">{tool.label}</p>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                </Button>
              ))}
              {selectedContent.length === 0 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Select content items to enable AI tools
                </p>
              )}
            </div>
          </SheetContent>
          </Sheet>
          )}
          </MainLayout>
  );
};

export default ModuleContent;
