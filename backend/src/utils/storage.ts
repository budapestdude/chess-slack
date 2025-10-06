import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import logger from './logger';

/**
 * Storage abstraction layer
 * Supports both S3 (production) and local filesystem (development)
 */

const USE_S3 = process.env.USE_S3 === 'true';
const S3_BUCKET = process.env.S3_BUCKET || '';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ENDPOINT = process.env.S3_ENDPOINT; // For Cloudflare R2 or MinIO

let s3Client: S3Client | null = null;

// Initialize S3 client if configured
if (USE_S3) {
  if (!S3_BUCKET) {
    logger.error('USE_S3 is true but S3_BUCKET is not configured');
  } else {
    s3Client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    logger.info('S3 storage initialized', { bucket: S3_BUCKET, region: S3_REGION });
  }
}

export interface UploadOptions {
  buffer: Buffer;
  key: string;
  contentType: string;
}

/**
 * Upload file to storage (S3 or local)
 */
export async function uploadFile(options: UploadOptions): Promise<string> {
  const { buffer, key, contentType } = options;

  if (USE_S3 && s3Client) {
    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Return S3 URL or presigned URL
    if (S3_ENDPOINT) {
      // Custom endpoint (like Cloudflare R2)
      return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
    } else {
      // Standard AWS S3
      return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
    }
  } else {
    // Upload to local filesystem
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, key);
    const fileDir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${key}`;
  }
}

/**
 * Get file from storage (S3 or local)
 */
export async function getFile(key: string): Promise<Buffer | null> {
  if (USE_S3 && s3Client) {
    // Get from S3
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      const response = await s3Client.send(command);
      const stream = response.Body;

      if (!stream) return null;

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream as any) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Error getting file from S3', { key, error });
      return null;
    }
  } else {
    // Get from local filesystem
    const filePath = path.join(process.cwd(), 'uploads', key);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    return fs.readFileSync(filePath);
  }
}

/**
 * Delete file from storage (S3 or local)
 */
export async function deleteFile(key: string): Promise<boolean> {
  if (USE_S3 && s3Client) {
    // Delete from S3
    try {
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      logger.error('Error deleting file from S3', { key, error });
      return false;
    }
  } else {
    // Delete from local filesystem
    const filePath = path.join(process.cwd(), 'uploads', key);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    fs.unlinkSync(filePath);
    return true;
  }
}

/**
 * Check if file exists in storage
 */
export async function fileExists(key: string): Promise<boolean> {
  if (USE_S3 && s3Client) {
    // Check S3
    try {
      const command = new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  } else {
    // Check local filesystem
    const filePath = path.join(process.cwd(), 'uploads', key);
    return fs.existsSync(filePath);
  }
}

/**
 * Get presigned URL for temporary access (S3 only)
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
  if (USE_S3 && s3Client) {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating presigned URL', { key, error });
      return null;
    }
  }

  return null;
}
