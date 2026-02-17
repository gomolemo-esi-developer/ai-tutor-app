import React, { useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Check, AlertCircle, Loader2, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import styles from './ProfilePictureUpload.module.css';
import { toast } from 'sonner';

interface ProfilePictureUploadProps {
  currentImage?: string;
  onUploadComplete?: () => void;
}

interface UploadState {
  file: File | null;
  id: string;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  stage?: 'uploading' | 'processing';
}

const VALID_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImage,
  onUploadComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    id: '',
    progress: 0,
    status: 'idle',
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError('');

    if (!file) return;

    // Validation
    const isValidType = VALID_IMAGE_TYPES.includes(file.type);
    const isValidSize = file.size <= MAX_FILE_SIZE;

    if (!isValidType) {
      setError('Only PNG, JPEG, WebP, and GIF images are supported.');
      return;
    }

    if (!isValidSize) {
      setError('Image size must be less than 5MB.');
      return;
    }

    // Set file and preview
    setUploadState({
      file,
      id: `${Date.now()}-${Math.random()}`,
      progress: 0,
      status: 'idle',
    });

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setError('');

      const isValidType = VALID_IMAGE_TYPES.includes(file.type);
      const isValidSize = file.size <= MAX_FILE_SIZE;

      if (!isValidType || !isValidSize) {
        setError(
          !isValidType
            ? 'Only image files are supported.'
            : 'Image size must be less than 5MB.'
        );
        return;
      }

      setUploadState({
        file,
        id: `${Date.now()}-${Math.random()}`,
        progress: 0,
        status: 'idle',
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!uploadState.file) return;

    setIsLoading(true);
    setUploadState((prev) => ({ ...prev, status: 'uploading', stage: 'uploading' }));

    try {
      // Step 1: Get presigned URL
      const uploadLinkResponse = await fetch('/api/user/profile-picture/upload-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: JSON.stringify({
          fileName: uploadState.file.name,
          fileSize: uploadState.file.size,
          mimeType: uploadState.file.type,
        }),
      });

      if (!uploadLinkResponse.ok) {
        throw new Error('Failed to get upload link');
      }

      const response = await uploadLinkResponse.json();
      const { uploadUrl, fileId, s3Key } = response.data;

      // Step 2: Upload to S3 with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadState((prev) => ({ ...prev, progress: percentComplete }));
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Step 3: Save metadata
          setUploadState((prev) => ({ ...prev, stage: 'processing' }));

          const saveResponse = await fetch('/api/user/profile-picture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
            },
            body: JSON.stringify({
              fileId,
              fileName: uploadState.file!.name,
              s3Key,
            }),
          });

          if (!saveResponse.ok) {
            throw new Error('Failed to save profile picture');
          }

          const saveResult = await saveResponse.json();
          console.log('Save profile picture response:', saveResult);

          // Update localStorage with the new profile picture URL
          if (saveResult.data?.profilePictureUrl && user) {
            const updatedUser = {
              ...user,
              profilePictureUrl: saveResult.data.profilePictureUrl,
            };
            console.log('Updating user with new picture URL:', updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }

          setUploadState((prev) => ({ ...prev, status: 'success', progress: 100 }));
          toast.success('Profile picture uploaded successfully');
          setTimeout(() => {
            handleReset();
            onUploadComplete?.();
            // Reload to sync the updated user data from localStorage
            window.location.reload();
          }, 1500);
        } else {
          throw new Error('S3 upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        setUploadState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: 'Upload failed. Please try again.',
        }));
      });

      xhr.open('PUT', uploadUrl);
       // Don't set Content-Type header - it's already in the presigned URL
       xhr.send(uploadState.file);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploadState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message || 'Upload failed',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUploadState({ file: null, id: '', progress: 0, status: 'idle' });
    setPreview(null);
    setError('');
    setIsOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) {
    return (
      <button
         onClick={() => setIsOpen(true)}
         className={styles.triggerButton}
         title="Upload profile picture"
       >
         <Camera size={14} />
         {/* <span>Change</span> */}
       </button>
    );
  }

  const modalContent = (
    <>
      {/* Modal Overlay - Flex container that centers children */}
      <div className={styles.modalOverlay} onClick={() => handleReset()}>
        {/* Modal Container - Child of overlay, gets centered by flex */}
        <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Upload Profile Picture</h2>
          <button
            onClick={handleReset}
            className={styles.closeButton}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {uploadState.status === 'idle' || uploadState.status === 'uploading' ? (
          <div>
            {/* File Upload Area */}
            <div
              className={styles.uploadArea}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className={styles.uploadIcon} />
              <p className={styles.uploadText}>Drag & drop your image here</p>
              <p className={styles.uploadSubtext}>or click to select</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className={styles.fileInput}
                disabled={isLoading}
              />
            </div>

            {/* Preview */}
            {preview && (
              <div className={styles.previewSection}>
                <h3 className={styles.previewTitle}>Preview</h3>
                <div className={styles.previewContainer}>
                  <img
                    src={preview}
                    alt="Preview"
                    className={styles.previewImage}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* Upload Progress */}
            {uploadState.status === 'uploading' && (
              <div className={styles.progressItem} data-status="uploading">
                <div className={styles.progressHeader}>
                  <div className={styles.progressFileInfo}>
                    <span className={styles.progressFileName}>
                      {uploadState.file?.name}
                    </span>
                    <span className={styles.progressContentType}>
                      {uploadState.file?.type}
                    </span>
                  </div>
                  <div className={styles.progressIcons}>
                    {uploadState.status === 'uploading' && (
                      <Loader2 className={styles.spinnerIcon} />
                    )}
                  </div>
                </div>

                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${uploadState.progress}%`,
                      backgroundColor: 'rgb(59 130 246)',
                    }}
                  />
                </div>

                <div className={styles.progressText}>
                  {uploadState.stage === 'uploading'
                    ? `Uploading... ${Math.round(uploadState.progress)}%`
                    : 'Processing...'}
                </div>
              </div>
            )}

            {/* Button Group */}
            {uploadState.status === 'idle' && (
              <div className={styles.buttonGroup}>
                <button
                  onClick={handleReset}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!preview || isLoading}
                  className={`${styles.button} ${styles.buttonPrimary}`}
                >
                  Upload
                </button>
              </div>
            )}
          </div>
        ) : uploadState.status === 'success' ? (
          <div>
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>
                <Check size={32} />
              </div>
              <div className={styles.successMessage}>
                Profile picture updated successfully!
              </div>
            </div>
            <div className={styles.buttonGroup}>
              <button
                onClick={handleReset}
                className={`${styles.button} ${styles.buttonSuccess}`}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>
                <AlertCircle size={32} />
              </div>
              <div className={styles.errorContainerMessage}>
                {uploadState.errorMessage || 'Upload failed'}
              </div>
            </div>
            <div className={styles.buttonGroup}>
              <button
                onClick={handleReset}
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Retry
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default ProfilePictureUpload;
