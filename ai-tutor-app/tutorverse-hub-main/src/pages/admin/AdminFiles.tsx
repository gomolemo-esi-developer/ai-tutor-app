import React, { useState, useEffect } from "react";
import { Search, Download, Filter, X } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import DataTable from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { useFiles, SharedFile } from "@/contexts/FilesContext";
import { useToast } from "@/hooks/use-toast";
import AdminService from "@/services/AdminService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileData {
  id: string;
  name: string;
  moduleName: string;
  moduleCode: string;
  authorName: string;
  type?: string;
  fileType?: string;
  description?: string;
  contentType?: string;
  createdAt?: string;
  updatedAt?: string;
}

const AdminFiles: React.FC = () => {
  const { files: contextFiles } = useFiles();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      // Use AdminService which correctly handles the API response structure
      const result = await AdminService.getFiles(1, 1000);
      
      // Transform file data to ensure required properties
      let transformedFiles: FileData[] = [];
      if (result && result.files && Array.isArray(result.files) && result.files.length > 0) {
        transformedFiles = result.files.map((file: any) => ({
          id: file.id || file.fileId || '',
          name: file.name || file.fileName || '',
          moduleName: file.moduleName || '',
          moduleCode: file.moduleCode || '',
          authorName: file.authorName || file.uploadedByName || '',
          type: file.type || file.fileType || '',
          fileType: file.fileType || file.type || '',
          description: file.description || '',
          contentType: file.contentType || file.mimeType || '',
          createdAt: file.createdAt || file.uploadedAt || '',
          updatedAt: file.updatedAt || file.lastModified || '',
        }));
      } else {
        console.warn('No files data received from AdminService, received:', result);
      }
      
      console.log('Admin files data fetched from API:', transformedFiles);
      setFiles(transformedFiles);
    } catch (err) {
      console.error('Error fetching files:', err);
      toast({ title: "Error", description: "Failed to load files" });
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "id",
      label: "File ID",
      render: (item: FileData) => (
        <span className="font-medium text-foreground text-xs">{item.id}</span>
      ),
    },
    {
      key: "name",
      label: "File Name",
      render: (item: FileData) => (
        <span className="font-medium text-foreground">{item.name}</span>
      ),
    },
    {
      key: "moduleCode",
      label: "Module",
      render: (item: FileData) => (
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
          {item.moduleCode || 'N/A'}
        </span>
      ),
    },
    {
      key: "authorName",
      label: "Author",
      render: (item: FileData) => (
        <span className="text-sm text-foreground">{item.authorName || 'N/A'}</span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item: FileData) => (
        <span className="text-sm text-foreground">{item.description || 'N/A'}</span>
      ),
    },
    {
      key: "contentType",
      label: "Content Type",
      render: (item: FileData) => (
        <span className="text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded">
          {item.contentType || 'N/A'}
        </span>
      ),
    },
    {
      key: "fileType",
      label: "File Type",
      render: (item: FileData) => (
        <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded capitalize">
          {item.fileType || item.type || 'Unknown'}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date of Creation",
      render: (item: FileData) => (
        <span className="text-sm text-muted-foreground">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: "updatedAt",
      label: "Date of Update",
      render: (item: FileData) => (
        <span className="text-sm text-muted-foreground">
          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
  ];

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterType || file.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === filteredFiles.length
        ? []
        : filteredFiles.map((f) => f.id)
    );
  };

  // Read-only - no edit/delete actions
  const handleEdit = () => {};
  const handleDelete = () => {};

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
        <div className="max-w-6xl mx-auto">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
              Files
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              View uploaded educational content (read-only) - Updated
              automatically when educators upload files
            </p>
          </header>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                    {filterType && (
                      <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full capitalize">
                        {filterType}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border-border">
                  <DropdownMenuLabel>File Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterType(null)}>
                    All Files
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("pdf")}>
                    PDFs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("video")}>
                    Videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("image")}>
                    Images
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("document")}>
                    Documents
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {filterType && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilterType(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredFiles}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
            idKey="id"
            hideActions
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminFiles;
