import api from './api';

export interface UploadedFile {
  id: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: string;
  createdAt: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  uploaded: boolean;
  error?: string;
}

export const uploadService = {
  async uploadFiles(
    workspaceId: string,
    files: File[],
    options?: {
      channelId?: string;
      dmGroupId?: string;
      messageId?: string;
      onProgress?: (progress: { [key: string]: number }) => void;
    }
  ): Promise<UploadedFile[]> {
    const formData = new FormData();

    // Add files to FormData
    files.forEach((file) => {
      formData.append('files', file);
    });

    // Add metadata
    if (options?.channelId) {
      formData.append('channelId', options.channelId);
    }
    if (options?.dmGroupId) {
      formData.append('dmGroupId', options.dmGroupId);
    }
    if (options?.messageId) {
      formData.append('messageId', options.messageId);
    }

    const response = await api.post<{ message: string; files: UploadedFile[] }>(
      `/workspaces/${workspaceId}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (options?.onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Simple overall progress for now
            const progress: { [key: string]: number } = {};
            files.forEach((file) => {
              progress[file.name] = percentCompleted;
            });
            options.onProgress(progress);
          }
        },
      }
    );

    return response.data.files;
  },

  async downloadAttachment(attachmentId: string, filename: string): Promise<void> {
    const response = await api.get(`/workspaces/attachments/${attachmentId}`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    await api.delete(`/workspaces/attachments/${attachmentId}`);
  },

  async getWorkspaceAttachments(
    workspaceId: string,
    options?: {
      fileType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.fileType) params.append('fileType', options.fileType);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await api.get<{ attachments: any[] }>(
      `/workspaces/${workspaceId}/attachments?${params.toString()}`
    );
    return response.data.attachments;
  },

  // Helper function to format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  // Helper function to get file icon based on type
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📎';
  },
};
