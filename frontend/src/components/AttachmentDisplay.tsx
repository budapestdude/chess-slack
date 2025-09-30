import { useState } from 'react';
import { Attachment } from '../types';
import { attachmentService } from '../services/attachment';
import { DocumentIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AttachmentDisplayProps {
  attachments: Attachment[];
  workspaceId: string;
  channelId: string;
  messageId: string;
}

export default function AttachmentDisplay({
  attachments,
  workspaceId,
  channelId,
  messageId,
}: AttachmentDisplayProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleDownload = (attachment: Attachment) => {
    attachmentService.downloadAttachment(
      workspaceId,
      channelId,
      messageId,
      attachment.id,
      attachment.originalFilename
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return (
        <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
          <DocumentIcon className="w-6 h-6 text-red-600" />
        </div>
      );
    }

    if (mimeType.includes('zip')) {
      return (
        <div className="w-12 h-12 bg-yellow-100 rounded flex items-center justify-center">
          <DocumentIcon className="w-6 h-6 text-yellow-600" />
        </div>
      );
    }

    return (
      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
        <DocumentIcon className="w-6 h-6 text-gray-600" />
      </div>
    );
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((attachment) => {
          const isImage = attachmentService.isImage(attachment.mimeType);
          const imageUrl = isImage
            ? attachmentService.getAttachmentDownloadUrl(
                workspaceId,
                channelId,
                messageId,
                attachment.id
              )
            : null;

          if (isImage && imageUrl) {
            return (
              <div
                key={attachment.id}
                className="relative group cursor-pointer rounded overflow-hidden border border-gray-200"
                onClick={() => setLightboxImage(imageUrl)}
              >
                <img
                  src={imageUrl}
                  alt={attachment.originalFilename}
                  className="w-full max-h-64 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(attachment);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-white rounded-full shadow-lg transition-opacity"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                  <p className="text-white text-xs truncate">{attachment.originalFilename}</p>
                  <p className="text-white text-xs opacity-75">
                    {attachmentService.formatFileSize(attachment.fileSize)}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              {getFileIcon(attachment.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.originalFilename}
                </p>
                <p className="text-xs text-gray-500">
                  {attachmentService.formatFileSize(attachment.fileSize)}
                </p>
              </div>
              <button
                onClick={() => handleDownload(attachment)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Download"
              >
                <ArrowDownTrayIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <XMarkIcon className="w-6 h-6 text-gray-700" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}