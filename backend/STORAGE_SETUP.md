# Cloud Storage Setup

Avatar uploads are now configured to use cloud storage (S3 or S3-compatible services) to prevent file loss on deployment.

## Development

By default, files are stored locally in the `uploads/` directory. No configuration needed.

## Production Setup

### Option 1: AWS S3

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

### Option 2: Cloudflare R2 (Recommended)

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

### Option 3: MinIO (Self-hosted)

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

## Railway Deployment

Add these environment variables in your Railway project settings:

1. Go to your project → Variables
2. Add the S3 configuration variables above
3. Redeploy the service

## Verifying Setup

After deploying with S3 enabled, check the logs for:
```
[info]: S3 storage initialized { bucket: 'your-bucket-name', region: 'your-region' }
```

Upload an avatar and verify it appears in your S3 bucket.

## Troubleshooting

- **Avatars still disappearing**: Ensure `USE_S3=true` is set in production
- **Upload fails**: Check IAM/API token permissions include PutObject
- **Can't view avatars**: Check bucket has public read access or use presigned URLs
- **Wrong endpoint**: For R2/MinIO, ensure S3_ENDPOINT is set correctly
