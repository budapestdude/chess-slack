# Storage Setup

Avatar uploads need persistent storage to prevent file loss on deployment.

## Development

By default, files are stored locally in the `uploads/` directory. No configuration needed.

## Production Setup

### Option 1: Railway Volumes (Recommended - Simplest)

Railway provides persistent volumes that survive deployments.

1. Go to your Railway project
2. Click on your backend service
3. Go to "Variables" tab
4. Scroll to "Volumes" section
5. Click "New Volume"
6. Set mount path: `/app/uploads`
7. Name: `avatar-storage` (or any name)
8. Redeploy your service

**That's it!** No environment variables needed. Files in `/app/uploads` now persist across deployments.

**Cost:** Railway volumes are free up to 1GB, then $0.25/GB/month.

### Option 2: Cloud Storage (For High Traffic)

For high-traffic applications or CDN distribution, use S3-compatible storage.

#### 2a. AWS S3

1. Create an S3 bucket in AWS
2. Create IAM credentials with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions
3. Set environment variables:

```bash
USE_S3=true
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
```

#### 2b. Cloudflare R2

Cloudflare R2 is S3-compatible with no egress fees.

1. Create an R2 bucket at https://dash.cloudflare.com/
2. Create an API token with R2 read/write permissions
3. Set environment variables:

```bash
USE_S3=true
AWS_ACCESS_KEY_ID=your-r2-access-key
AWS_SECRET_ACCESS_KEY=your-r2-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=auto
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

#### 2c. MinIO (Self-hosted)

1. Deploy MinIO server
2. Create a bucket
3. Set environment variables:

```bash
USE_S3=true
AWS_ACCESS_KEY_ID=your-minio-access-key
AWS_SECRET_ACCESS_KEY=your-minio-secret-key
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ENDPOINT=https://your-minio-server.com
```

## Quick Start: Railway

**Recommended approach** - Add a volume (no code/config changes needed):

1. Railway dashboard → Your service → Variables tab
2. Scroll to "Volumes" section → "New Volume"
3. Mount path: `/app/uploads`
4. Save and redeploy

**Alternative** - Use S3/R2:

1. Add environment variables from "Option 2" above
2. Redeploy the service

## Verifying Setup

**Railway Volumes:**
1. Upload an avatar in your app
2. Redeploy your service
3. Avatar should still be visible after redeployment

**S3/Cloud Storage:**
1. Check logs for: `[info]: S3 storage initialized { bucket: 'your-bucket-name', region: 'your-region' }`
2. Upload an avatar
3. Verify it appears in your S3 bucket

## Troubleshooting

### Railway Volumes
- **Avatars still disappearing**: Check volume is mounted to `/app/uploads` exactly
- **Volume not showing**: Redeploy after adding volume
- **Permission errors**: Railway handles permissions automatically

### S3/Cloud Storage
- **Avatars still disappearing**: Ensure `USE_S3=true` is set in production
- **Upload fails**: Check IAM/API token permissions include PutObject
- **Can't view avatars**: Check bucket has public read access or use presigned URLs
- **Wrong endpoint**: For R2/MinIO, ensure S3_ENDPOINT is set correctly

## Comparison

| Feature | Railway Volumes | S3/R2 |
|---------|----------------|-------|
| Setup Time | 2 minutes | 10-15 minutes |
| Cost | Free up to 1GB | Varies |
| Speed | Fast (same network) | Depends on region |
| CDN | No | Can add CloudFlare |
| Backup | Railway handles it | Your responsibility |
| Best For | Small-medium apps | High traffic apps |
