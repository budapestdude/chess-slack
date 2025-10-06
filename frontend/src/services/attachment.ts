import api from './api';
import { Message } from '../types';

export const attachmentService = {
  async uploadMessageWithAttachments(
    workspaceId: string,
    channelId: string,
    files: File[],
    content?: string,
    parentMessageId?: string
  ): Promise<Message> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    if (content) {
      formData.append('content', content);
    }

    if (parentMessageId) {
      formData.append('parentMessageId', parentMessageId);
    }

    const response = await api.post<Message>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  getAttachmentDownloadUrl(
    workspaceId: string,
    channelId: string,
    messageId: string,
    attachmentId: string
  ): string {
    const token = localStorage.getItem('token');
    const baseURL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '')}/api`;
    return `${baseURL}/workspaces/${workspaceId}/channels/${channelId}/messages/${messageId}/attachments/${attachmentId}/download?token=${token}`;
  },

  async downloadAttachment(
    workspaceId: string,
    channelId: string,
    messageId: string,
    attachmentId: string,
    filename: string
  ): Promise<void> {
    const url = this.getAttachmentDownloadUrl(workspaceId, channelId, messageId, attachmentId);

    // Open in new tab for download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  },

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  },
};