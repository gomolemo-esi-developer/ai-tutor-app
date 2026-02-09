import React, { useState, useEffect } from 'react';
import { X, Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { EducatorService } from '@/services/EducatorService';
import { apiClient } from '@/lib/api';
import styles from './FileUploadModal.module.css';

interface FileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete?: () => void;
    moduleCode?: string;
}

interface UploadFile {
    file: File;
    id: string;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    errorMessage?: string;
    stage?: 'uploading' | 'processing' | 'vectorizing'; // Track upload stage
}

interface UploadMetadata {
    title: string;
    description: string;
    contentType: string;
    author: string;
}

const VALID_FILE_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',

    // Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',

    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/flac',
    'audio/ogg',
    'audio/webm',

    // Video
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-matroska',

    // Code files (as text)
    'text/javascript',
    'text/typescript',
    'text/x-python',
    'text/x-java',
    'text/x-csrc',
    'text/x-c++src',
    'text/x-csharp',
    'text/x-go',
    'text/x-ruby',
    'text/x-php',
    'text/x-swift',
    'text/x-kotlin',
    'text/x-scala',
    'text/x-rust',
    'text/x-r',
    'text/x-objective-c',

    // Fallback for code files with generic MIME types
    'application/x-python',
    'application/x-javascript',
    'application/x-java-source',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
    isOpen,
    onClose,
    onUploadComplete,
    moduleCode: providedModuleCode,
}) => {
    const [step, setStep] = useState(1);
    const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
    const [modules, setModules] = useState<any[]>([]);
    const [contentTypes, setContentTypes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [metadata, setMetadata] = useState<UploadMetadata>({
        title: '',
        description: '',
        contentType: '',
        author: '',
    });

    const { user } = useAuth();

    // Set default content types and author on mount
    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        try {
            // Set default content types
            setContentTypes([
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
            ]);

            // Set author from user
            if (user?.firstName && user?.lastName) {
                setMetadata((prev) => ({
                    ...prev,
                    author: `${user.firstName} ${user.lastName}`,
                }));
            }
        } catch (err: any) {
            setError('Failed to initialize modal. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, user]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter((file) => {
            const isValidType = VALID_FILE_TYPES.includes(file.type);
            const isValidSize = file.size <= MAX_FILE_SIZE;
            return isValidType && isValidSize;
        });

        if (validFiles.length < files.length) {
            setError(
                'Some files were rejected. Check file type and size (max 25MB).'
            );
        }

        const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
            file,
            id: `${Date.now()}-${Math.random()}`,
            progress: 0,
            status: 'pending',
        }));

        setUploadFiles((prev) => [...prev, ...newUploadFiles]);

        // Auto-detect content type for first file
        if (validFiles.length > 0 && !metadata.contentType) {
            const detectedType = detectContentType(
                validFiles[0].name,
                validFiles[0].type
            );
            if (detectedType) {
                setMetadata((prev) => ({ ...prev, contentType: detectedType }));
            }
        }
    };

    const getContentTypeLabel = (contentTypeValue: string): string => {
        const type = contentTypes.find((t) => t.value === contentTypeValue);
        return type?.label || contentTypeValue;
    };

    const detectContentType = (fileName: string, mimeType: string): string => {
        const extension = fileName.toLowerCase().split('.').pop() || '';
        const lowerFileName = fileName.toLowerCase();

        // Pattern-based detection
        const patterns: { [key: string]: string } = {
            assignment: 'assignments',
            homework: 'assignments',
            quiz: 'exams',
            test: 'exams',
            exam: 'exams',
            script: 'scripts',
            poster: 'poster',
            infographic: 'infographics',
        };

        for (const [pattern, type] of Object.entries(patterns)) {
            if (lowerFileName.includes(pattern)) return type;
        }

        // Extension-based detection
        const extensionMap: { [key: string]: string } = {
            pdf: 'lecture-notes',
            doc: 'lecture-notes',
            docx: 'lecture-notes',
            txt: 'scripts',
            js: 'scripts',
            py: 'scripts',
            java: 'scripts',
            cpp: 'scripts',
            cs: 'scripts',
            ppt: 'presentations',
            pptx: 'presentations',
            xls: 'spreadsheets',
            xlsx: 'spreadsheets',
            csv: 'spreadsheets',
            mp4: 'lecture-video',
            avi: 'lecture-video',
            mov: 'lecture-video',
            webm: 'lecture-video',
            mp3: 'lecture-audio',
            wav: 'lecture-audio',
            m4a: 'lecture-audio',
            ogg: 'lecture-audio',
        };

        if (extensionMap[extension]) return extensionMap[extension];

        // MIME type detection
        if (mimeType.includes('video')) return 'lecture-video';
        if (mimeType.includes('audio')) return 'lecture-audio';

        return 'lecture-notes'; // Default
    };

    const removeFile = (id: string) => {
        setUploadFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const handleMetadataChange = (field: string, value: string) => {
        setMetadata((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!metadata.contentType || !metadata.title) {
            setError('Please fill in required fields: Title, Content Type');
            return;
        }

        if (uploadFiles.length === 0) {
            setError('Please select at least one file');
            return;
        }

        setError('');
        setMessage('');
        setIsLoading(true);

        try {
            // Upload each file sequentially with real-time progress tracking
            const uploadPromises = uploadFiles.map(async (uf) => {
                try {
                    // Mark as uploading (0% progress)
                    setUploadFiles((prev) =>
                        prev.map((f) =>
                            f.id === uf.id
                                ? { ...f, status: 'uploading', progress: 0, stage: 'uploading' }
                                : f
                        )
                    );

                    // Generate file ID for the upload
                    const moduleCodeToUse = providedModuleCode || '';
                    const fileId = `file_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    // Update progress to 20% (preparing upload)
                    setUploadFiles((prev) =>
                        prev.map((f) =>
                            f.id === uf.id
                                ? { ...f, progress: 20, stage: 'uploading' }
                                : f
                        )
                    );

                    // Upload through backend proxy to bypass CORS
                    await new Promise<void>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();

                        // Track upload progress
                        xhr.upload.addEventListener('progress', (e) => {
                            if (e.lengthComputable) {
                                // Progress from 20% to 70% during upload
                                const uploadProgress = (e.loaded / e.total) * 50; // 0-50%
                                const totalProgress = 20 + uploadProgress;
                                setUploadFiles((prev) =>
                                    prev.map((f) =>
                                        f.id === uf.id
                                            ? { ...f, progress: Math.min(totalProgress, 70), stage: 'uploading' }
                                            : f
                                    )
                                );
                            }
                        });

                        xhr.addEventListener('load', () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                // Upload complete
                                setUploadFiles((prev) =>
                                    prev.map((f) =>
                                        f.id === uf.id
                                            ? { ...f, progress: 70, stage: 'processing' }
                                            : f
                                    )
                                );
                                resolve();
                            } else {
                                reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
                            }
                        });

                        xhr.addEventListener('error', () => {
                            reject(new Error('Upload failed'));
                        });

                        // Use absolute backend URL to avoid nginx proxy issues
                        const uploadUrl = `${apiClient.getBaseURL()}/api/educator/files/upload`;
                        const token = auth?.accessToken;
                        
                        xhr.open('POST', uploadUrl);
                        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
                        xhr.setRequestHeader('X-File-ID', fileId);
                        xhr.setRequestHeader('X-Module-Code', moduleCodeToUse);
                        xhr.setRequestHeader('X-File-Name', uf.file.name);
                        if (token) {
                            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                        }
                        xhr.send(uf.file);
                    });

                    // Prepare linkResponse-like object for metadata save
                    const linkResponse = {
                        fileId,
                        uploadUrl: '', // Not used anymore
                        s3Key: `modules/${moduleCodeToUse}/${fileId}/${uf.file.name}`
                    };

                    // Update progress to 85% (processing started)
                    setUploadFiles((prev) =>
                        prev.map((f) =>
                            f.id === uf.id
                                ? { ...f, progress: 85, stage: 'processing' }
                                : f
                        )
                    );

                    // Save metadata
                    await EducatorService.saveFile({
                        fileName: uf.file.name,
                        fileId: linkResponse.fileId,
                        fileSize: uf.file.size,
                        mimeType: uf.file.type,
                        fileType: uf.file.name.split('.').pop() || 'unknown',
                        s3Key: linkResponse.s3Key,
                        metadata: {
                            title: metadata.title || uf.file.name,
                            moduleCode: moduleCodeToUse,
                            contentType: metadata.contentType,
                            author: metadata.author,
                            description:
                                metadata.description || `Uploaded: ${uf.file.name}`,
                        },
                    });

                    // Update to vectorizing stage (95%)
                    setUploadFiles((prev) =>
                        prev.map((f) =>
                            f.id === uf.id
                                ? { ...f, progress: 95, stage: 'vectorizing' }
                                : f
                        )
                    );

                    // Small delay to show vectorizing stage
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    // Update file status to success (100%)
                    setUploadFiles((prev) =>
                        prev.map((f) =>
                            f.id === uf.id ? { ...f, status: 'success', progress: 100, stage: undefined } : f
                        )
                    );

                    return { id: uf.id, status: 'success' };
                } catch (err: any) {
                    setUploadFiles((prev) =>
                        prev.map((f) =>
                            f.id === uf.id
                                ? {
                                    ...f,
                                    status: 'error',
                                    errorMessage: err.message || 'Upload failed',
                                }
                                : f
                        )
                    );
                    return { id: uf.id, status: 'error' };
                }
            });

            await Promise.all(uploadPromises);

            // Show success message but don't auto-close - let user click Done button
            const allSuccess = uploadFiles.every((f) => f.status === 'success');
            if (allSuccess) {
                setMessage('All files uploaded successfully!');
            }
        } catch (err: any) {
            setError(err.message || 'Upload failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setUploadFiles([]);
        setError('');
        setMessage('');
        setMetadata({
            title: '',
            description: '',
            contentType: '',
            author:
                user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : '',
        });
        setError('');
        setMessage('');
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Upload Course Materials</h2>
                    <button
                        onClick={onClose}
                        className={styles.closeButton}
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className={styles.stepIndicator}>
                    {[1, 2, 3].map((stepNum) => (
                        <div key={stepNum} className={styles.stepItem}>
                            <div
                                className={`${styles.stepNumber} ${stepNum <= step
                                    ? styles.stepNumberActive
                                    : styles.stepNumberInactive
                                    }`}
                            >
                                {stepNum}
                            </div>
                            <span
                                className={
                                    stepNum <= step
                                        ? styles.stepItemActive
                                        : styles.stepItemInactive
                                }
                            >
                                {stepNum === 1
                                    ? 'Upload'
                                    : stepNum === 2
                                        ? 'Metadata'
                                        : 'Upload'}
                            </span>
                            {stepNum < 3 && (
                                <div className={styles.stepDivider} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: File Upload */}
                {step === 1 && (
                    <div>
                        <h3 className={styles.sectionTitle}>Select Files</h3>
                        <div className={styles.uploadArea}>
                            <Upload className={styles.uploadIcon} />
                            <p className={styles.uploadText}>
                                Drag files here or click to browse
                            </p>
                            <p className={styles.uploadSubtext}>
                                Max 25MB per file (PDF, PPT, DOC, Images, Video, Audio, Code)
                            </p>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp,.mp3,.wav,.m4a,.flac,.ogg,.mp4,.avi,.mov,.mkv,.webm,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.rb,.php,.swift,.kt,.scala,.r,.m,.mm"
                                className={styles.fileInput}
                            />
                        </div>

                        {uploadFiles.length > 0 && (
                            <div className={styles.filesList}>
                                <p className={styles.filesListTitle}>
                                    Files Selected ({uploadFiles.length})
                                </p>
                                {uploadFiles.map((uf) => (
                                    <div key={uf.id} className={styles.fileItem}>
                                        <div className={styles.fileInfo}>
                                            <p className={styles.fileName}>{uf.file.name}</p>
                                            <p className={styles.fileSize}>
                                                {(uf.file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeFile(uf.id)}
                                            className={styles.removeButton}
                                            aria-label="Remove file"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={styles.buttonGroup}>
                            <button onClick={onClose} className={`${styles.button} ${styles.buttonSecondary}`}>
                                Cancel
                            </button>
                            <button
                                onClick={() => setStep(2)}
                                disabled={uploadFiles.length === 0 || isLoading}
                                className={`${styles.button} ${styles.buttonPrimary}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Metadata */}
                {step === 2 && (
                    <div>
                        <h3 className={styles.sectionTitle}>Add Details</h3>

                        {error && <div className={styles.errorMessage}>{error}</div>}
                        {message && (
                            <div className={styles.successMessage}>{message}</div>
                        )}

                        <div className={styles.formFields}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Title *</label>
                                <input
                                    type="text"
                                    value={metadata.title}
                                    onChange={(e) =>
                                        handleMetadataChange('title', e.target.value)
                                    }
                                    placeholder="Enter file title"
                                    className={styles.formInput}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Description</label>
                                <textarea
                                    value={metadata.description}
                                    onChange={(e) =>
                                        handleMetadataChange('description', e.target.value)
                                    }
                                    placeholder="Enter description (optional)"
                                    rows={3}
                                    className={styles.formInput}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Content Type *</label>
                                <Select
                                    value={metadata.contentType}
                                    onValueChange={(value) =>
                                        handleMetadataChange('contentType', value)
                                    }
                                >
                                    <SelectTrigger className="w-full bg-[#374151] border border-[#4b5563] shadow-sm text-white focus:border-[#60a5fa] focus:outline-none">
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1f2937] border border-[#4b5563] shadow-lg text-white" style={{ zIndex: 10000 }}>
                                        {contentTypes.length > 0 ? (
                                            contentTypes.map((type) => (
                                                <SelectItem
                                                    key={type.value}
                                                    value={type.value}
                                                    className="hover:bg-[#374151] focus:bg-[#374151] cursor-pointer"
                                                >
                                                    {type.label}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="empty" disabled>
                                                No content types available
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Author</label>
                                <input
                                    type="text"
                                    value={metadata.author}
                                    onChange={(e) =>
                                        handleMetadataChange('author', e.target.value)
                                    }
                                    className={styles.formInput}
                                />
                            </div>
                        </div>

                        <div className={styles.buttonGroup}>
                            <button
                                onClick={() => setStep(1)}
                                className={`${styles.button} ${styles.buttonSecondary}`}
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={
                                    !metadata.title || !metadata.contentType
                                }
                                className={`${styles.button} ${styles.buttonPrimary}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review & Upload */}
                {step === 3 && (
                    <div>
                        <h3 className={styles.sectionTitle}>Review & Upload</h3>

                        {error && <div className={styles.errorMessage}>{error}</div>}
                        {message && (
                            <div className={styles.successMessage}>
                                <Check size={20} />
                                <span>{message}</span>
                            </div>
                        )}

                        <div className={styles.progressList}>
                            {uploadFiles.map((uf) => (
                                <div
                                    key={uf.id}
                                    className={styles.progressItem}
                                    data-status={uf.status}
                                >
                                    <div className={styles.progressHeader}>
                                        <div className={styles.progressFileInfo}>
                                            <span className={styles.progressFileName}>
                                                {uf.file.name}
                                            </span>
                                            <span className={styles.progressContentType}>
                                                {getContentTypeLabel(metadata.contentType)}
                                            </span>
                                        </div>
                                        <div className={styles.progressIcons}>
                                            {uf.status === 'success' && (
                                                <Check className="w-5 h-5 text-green-400" />
                                            )}
                                            {uf.status === 'error' && (
                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                            )}
                                            {uf.status === 'uploading' && (
                                                <Loader2 className={styles.spinnerIcon} />
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.progressFill}
                                            style={{
                                                width: `${uf.progress}%`,
                                                backgroundColor:
                                                    uf.status === 'success'
                                                        ? 'rgb(34 197 94)' // Green
                                                        : uf.status === 'error'
                                                            ? 'rgb(248 113 113)' // Red
                                                            : 'rgb(59 130 246)', // Blue for uploading/processing
                                            }}
                                        />
                                    </div>
                                    {uf.status === 'uploading' && (
                                        <div className={styles.progressText}>
                                            {uf.stage === 'uploading' && `Uploading... ${Math.round(uf.progress)}%`}
                                            {uf.stage === 'processing' && 'Processing file...'}
                                            {uf.stage === 'vectorizing' && 'Vectorizing...'}
                                        </div>
                                    )}

                                    {uf.errorMessage && (
                                        <div className={styles.errorMessage}>
                                            {uf.errorMessage}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Check if all uploads are complete */}
                        {uploadFiles.length > 0 && uploadFiles.every((f) => f.status !== 'pending' && f.status !== 'uploading') ? (
                            <div className={styles.buttonGroup}>
                                <button
                                    onClick={() => setStep(2)}
                                    className={`${styles.button} ${styles.buttonSecondary}`}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => {
                                        onUploadComplete?.();
                                        handleReset();
                                        onClose();
                                    }}
                                    className={`${styles.button} ${styles.buttonSuccess}`}
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <div className={styles.buttonGroup}>
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={isLoading}
                                    className={`${styles.button} ${styles.buttonSecondary}`}
                                >
                                    Back
                                </button>
                                {!isLoading ? (
                                    <button
                                        onClick={handleSubmit}
                                        className={`${styles.button} ${styles.buttonSuccess}`}
                                    >
                                        Upload Files
                                    </button>
                                ) : (
                                    <button disabled className={`${styles.button} ${styles.buttonSuccess}`}>
                                        <Loader2 className={styles.spinnerIcon} />
                                        <span>Uploading...</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
