import multer from 'multer';
import { Request } from 'express';

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Files will be stored in uploads directory
    // We'll organize by workspace/channel in the controller
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-uuid-sanitized-original-name
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100); // Limit filename length
    cb(null, `${timestamp}-${sanitizedFilename}`);
  },
});

// File filter for allowed types
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

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
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