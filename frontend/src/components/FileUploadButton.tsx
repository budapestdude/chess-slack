import { useRef, ChangeEvent } from 'react';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { attachmentService } from '../services/attachment';

interface FileUploadButtonProps {
  selectedFiles: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
}

export default function FileUploadButton({
  selectedFiles,
  onFilesSelected,
  onRemoveFile,
  disabled = false,
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file count
    if (selectedFiles.length + files.length > 5) {
      alert('Maximum 5 files allowed per message');
      return;
    }

    // Validate file sizes
    const invalidFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`Files must be smaller than 10MB: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Validate file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/zip',
      'application/x-zip-compressed',
    ];

    const invalidTypes = files.filter((file) => !allowedTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      alert(`File type not allowed: ${invalidTypes.map(f => f.name).join(', ')}`);
      return;
    }

    onFilesSelected([...selectedFiles, ...files]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.txt,.md,.zip"
        disabled={disabled}
      />

      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || selectedFiles.length >= 5}
        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach files"
      >
        <PaperClipIcon className="w-5 h-5 text-gray-600" />
      </button>

      {selectedFiles.length > 0 && (
        <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-md">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 p-2 bg-white border border-gray-200 rounded"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {attachmentService.isImage(file.type) ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                    <PaperClipIcon className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    {attachmentService.formatFileSize(file.size)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Remove file"
              >
                <XMarkIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}