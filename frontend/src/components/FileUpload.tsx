import { useState, useRef, DragEvent } from 'react';
import { XMarkIcon, PaperClipIcon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { uploadService } from '../services/upload';

interface FileUploadProps {
  workspaceId: string;
  channelId?: string;
  dmGroupId?: string;
  onFilesSelected: (files: File[]) => void;
  onUploadComplete?: (uploadedFiles: any[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
}

interface FilePreview {
  file: File;
  preview?: string;
  progress: number;
  error?: string;
}

export default function FileUpload({
  workspaceId,
  channelId,
  dmGroupId,
  onFilesSelected,
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
}: FileUploadProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: FilePreview[] = [];

    Array.from(selectedFiles).forEach((file) => {
      // Validate file size
      if (file.size > maxFileSize) {
        newFiles.push({
          file,
          progress: 0,
          error: `File too large (max ${uploadService.formatFileSize(maxFileSize)})`,
        });
        return;
      }

      // Check max files
      if (files.length + newFiles.length >= maxFiles) {
        return;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({
        file,
        preview,
        progress: 0,
      });
    });

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles.map((f) => f.file));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles.map((f) => f.file));

    // Revoke preview URL to avoid memory leak
    if (files[index].preview) {
      URL.revokeObjectURL(files[index].preview!);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || uploading) return;

    setUploading(true);

    try {
      const filesToUpload = files.filter((f) => !f.error).map((f) => f.file);

      const uploadedFiles = await uploadService.uploadFiles(workspaceId, filesToUpload, {
        channelId,
        dmGroupId,
        onProgress: (progress) => {
          setFiles((prev) =>
            prev.map((f) => ({
              ...f,
              progress: progress[f.file.name] || 0,
            }))
          );
        },
      });

      if (onUploadComplete) {
        onUploadComplete(uploadedFiles);
      }

      // Clear files after successful upload
      files.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setFiles([]);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          error: error.response?.data?.error || 'Upload failed',
        }))
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
        />

        <PaperClipIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500">
          Max {maxFiles} files, up to {uploadService.formatFileSize(maxFileSize)} each
        </p>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((filePreview, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              {/* File icon/preview */}
              <div className="flex-shrink-0">
                {filePreview.preview ? (
                  <img
                    src={filePreview.preview}
                    alt={filePreview.file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : filePreview.file.type.startsWith('image/') ? (
                  <PhotoIcon className="w-12 h-12 text-gray-400" />
                ) : (
                  <DocumentIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {filePreview.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {uploadService.formatFileSize(filePreview.file.size)}
                </p>

                {/* Progress bar */}
                {uploading && !filePreview.error && (
                  <div className="mt-1">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 transition-all duration-300"
                        style={{ width: `${filePreview.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error message */}
                {filePreview.error && (
                  <p className="text-xs text-red-600 mt-1">{filePreview.error}</p>
                )}
              </div>

              {/* Remove button */}
              {!uploading && (
                <button
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>
          ))}

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={uploading || files.every((f) => f.error)}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
