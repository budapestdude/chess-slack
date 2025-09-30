import multer from 'multer';
import { Request } from 'express';
import fs from 'fs';
import path from 'path';

// Magic number signatures for file type validation
const FILE_SIGNATURES: { [key: string]: { bytes: number[], mimeTypes: string[] } } = {
  'JPEG': { bytes: [0xFF, 0xD8, 0xFF], mimeTypes: ['image/jpeg', 'image/jpg'] },
  'PNG': { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mimeTypes: ['image/png'] },
  'GIF87a': { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], mimeTypes: ['image/gif'] },
  'GIF89a': { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], mimeTypes: ['image/gif'] },
  'WEBP': { bytes: [0x52, 0x49, 0x46, 0x46], mimeTypes: ['image/webp'] }, // Note: RIFF + WEBP at offset 8
  'PDF': { bytes: [0x25, 0x50, 0x44, 0x46], mimeTypes: ['application/pdf'] },
  'ZIP': { bytes: [0x50, 0x4B, 0x03, 0x04], mimeTypes: ['application/zip', 'application/x-zip-compressed'] },
  'ZIP_EMPTY': { bytes: [0x50, 0x4B, 0x05, 0x06], mimeTypes: ['application/zip'] },
};

/**
 * Validates file type by checking magic numbers (file signature)
 * This prevents attackers from uploading malicious files with fake extensions
 */
const validateFileType = async (filePath: string, declaredMimeType: string): Promise<boolean> => {
  try {
    const buffer = Buffer.alloc(16); // Read first 16 bytes
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // Check against known signatures
    for (const [sigName, signature] of Object.entries(FILE_SIGNATURES)) {
      const matches = signature.bytes.every((byte, index) => buffer[index] === byte);

      // For WEBP, also check for 'WEBP' at offset 8
      if (sigName === 'WEBP' && matches) {
        const webpMarker = buffer.slice(8, 12).toString('ascii');
        if (webpMarker === 'WEBP' && signature.mimeTypes.includes(declaredMimeType)) {
          return true;
        }
      } else if (matches && signature.mimeTypes.includes(declaredMimeType)) {
        return true;
      }
    }

    // For text files, allow if declared as text/plain or text/markdown
    if (declaredMimeType === 'text/plain' || declaredMimeType === 'text/markdown') {
      // Simple check: ensure it's mostly ASCII/UTF-8 text
      const isText = buffer.slice(0, 16).every(byte =>
        (byte >= 0x20 && byte <= 0x7E) || // Printable ASCII
        byte === 0x09 || byte === 0x0A || byte === 0x0D || // Tab, LF, CR
        byte >= 0x80 // UTF-8 multi-byte
      );
      return isText;
    }

    return false;
  } catch (error) {
    console.error('Error validating file type:', error);
    return false;
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Files will be stored in uploads directory
    // We'll organize by workspace/channel in the controller
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-sanitized-original-name
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50); // Limit filename length
    cb(null, `${timestamp}-${sanitizedName}${ext}`);
  },
});

// File filter for allowed types (initial check)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'text/plain',
    'text/markdown',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
  ];

  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.txt', '.md', '.zip'
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype} (${ext})`));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // Maximum 5 files per upload
  },
});

// Export the validation function for use in controllers
export { validateFileType };