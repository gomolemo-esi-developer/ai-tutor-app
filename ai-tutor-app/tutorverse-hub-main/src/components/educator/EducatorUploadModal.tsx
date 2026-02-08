import React, { useState } from 'react';
import { Upload, ArrowLeft, ArrowRight, Check, FileText, Video, Image, File, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface EducatorUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (fileName: string, fileType: 'pdf' | 'video' | 'image' | 'document', fileSize: string) => void;
}

const EducatorUploadModal: React.FC<EducatorUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
  });
  const { toast } = useToast();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const getFileType = (fileName: string): 'pdf' | 'video' | 'image' | 'document' => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return 'pdf';
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    return 'document';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate completion
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      setIsUploading(false);
      
      // Call the onUpload callback to add file to shared context
      if (onUpload && file) {
        const fileName = formData.title || file.name;
        const fileType = getFileType(file.name);
        const fileSize = formatFileSize(file.size);
        onUpload(fileName, fileType, fileSize);
      }
      
      toast({
        title: 'File uploaded successfully',
        description: `${file?.name} has been uploaded and is now visible to students.`,
      });
      handleClose();
    }, 2500);
  };

  const handleClose = () => {
    onClose();
    setStep(1);
    setFile(null);
    setFormData({ title: '', description: '', tags: '' });
    setIsUploading(false);
    setUploadProgress(0);
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-muted-foreground" />;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return <FileText className="w-12 h-12 text-destructive" />;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return <Video className="w-12 h-12 text-primary" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <Image className="w-12 h-12 text-success" />;
    return <File className="w-12 h-12 text-warning" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-[hsl(222,47%,8%)] border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            Upload File
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={cn(
                  "w-12 h-0.5 transition-colors",
                  step > s ? "bg-primary" : "bg-muted"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-xs text-muted-foreground mb-6 px-2">
          <span className={cn(step >= 1 && "text-primary")}>Select File</span>
          <span className={cn(step >= 2 && "text-primary")}>Details</span>
          <span className={cn(step >= 3 && "text-primary")}>Upload</span>
        </div>

        {/* Step 1: File Selection */}
        {step === 1 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
              file ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
            )}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi,.webm,.ppt,.pptx,.xls,.xlsx"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {getFileIcon()}
              {file ? (
                <div className="mt-4">
                  <p className="font-medium text-foreground">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="font-medium text-foreground">
                    Drag & drop or click to upload
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, Images, Videos, Documents up to 25MB
                  </p>
                </div>
              )}
            </label>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter file title"
                className="bg-muted/50 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter a brief description"
                className="bg-muted/50 border-border min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Tags</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Enter tags separated by commas"
                className="bg-muted/50 border-border"
              />
            </div>
          </div>
        )}

        {/* Step 3: Upload/Processing */}
        {step === 3 && (
          <div className="space-y-6">
            {isUploading ? (
              <div className="text-center py-6">
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
                <p className="font-medium text-foreground mb-2">Uploading your file...</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {uploadProgress}% complete
                </p>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/30 border border-border">
                <h4 className="font-medium mb-4 text-foreground">Upload Summary</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File:</span>
                    <span className="text-foreground truncate max-w-[200px]">{file?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="text-foreground">{file ? formatFileSize(file.size) : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="text-foreground truncate max-w-[200px]">{formData.title || file?.name}</span>
                  </div>
                  {formData.description && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description:</span>
                      <span className="text-foreground truncate max-w-[200px]">{formData.description}</span>
                    </div>
                  )}
                  {formData.tags && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tags:</span>
                      <span className="text-foreground truncate max-w-[200px]">{formData.tags}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={step === 1 ? handleClose : handleBack}
            disabled={isUploading}
            className="border-border"
          >
            {step === 1 ? 'Cancel' : <><ArrowLeft className="w-4 h-4 mr-2" /> Back</>}
          </Button>
          <Button
            onClick={step === 3 ? handleUpload : handleNext}
            disabled={(step === 1 && !file) || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : step === 3 ? (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </>
            ) : (
              <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EducatorUploadModal;