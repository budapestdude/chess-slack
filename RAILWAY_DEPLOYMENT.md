# Railway Deployment Guide for ChessSlack

This guide will help you deploy ChessSlack to Railway with PostgreSQL database, backend API, and frontend application.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI** (optional): Install with `npm i -g @railway/cli`
3. **Git Repository**: Push your code to GitHub/GitLab

## Deployment Steps

### 1. Create a New Railway Project

1. Go to [railway.app](https://railway.app) and click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account and select the ChessSlack repository

### 2. Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a PostgreSQL instance
4. Note: The `DATABASE_URL` environment variable will be automatically set

### 3. Deploy Backend Service

1. Click "+ New" → "GitHub Repo" → Select your repo
2. Set the **Root Directory** to `backend`
3. Railway will auto-detect the configuration from `railway.json`

**Environment Variables** (Add these in Railway dashboard):
```bash
# JWT Configuration (CRITICAL - Generate a strong secret!)
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (Will update after frontend is deployed)
CORS_ORIGIN=https://your-frontend-url.railway.app

# Database URL (Auto-provided by Railway PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Optional: Redis Configuration
REDIS_URL=${{Redis.REDIS_URL}}

# Logging
LOG_LEVEL=info
```

**Important Notes:**
- Generate a secure JWT_SECRET: `openssl rand -base64 32`
- The backend will automatically run migrations on startup
- Health check endpoint is `/health`

### 4. Deploy Frontend Service

1. Click "+ New" → "GitHub Repo" → Select your repo again
2. Set the **Root Directory** to `frontend`
3. Railway will auto-detect the configuration from `railway.json`

**Environment Variables** (Add these in Railway dashboard):
```bash
# API Configuration - Use your backend Railway URL
VITE_API_URL=https://your-backend-url.railway.app

# WebSocket Configuration - Same as API URL
VITE_WS_URL=https://your-backend-url.railway.app

# Optional: Sentry Configuration
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

### 5. Update CORS Configuration

After both services are deployed:

1. Go to backend service settings
2. Update `CORS_ORIGIN` environment variable with your frontend URL:
   ```
   CORS_ORIGIN=https://your-frontend-url.railway.app
   ```
3. Redeploy the backend service

### 6. Configure Custom Domains (Optional)

1. In Railway dashboard, go to each service
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `api.yourdomain.com` for backend)
4. Update environment variables accordingly

## Database Migrations

Migrations run automatically on backend deployment via the `migrate:prod` script.

To manually run migrations:
```bash
railway run npm run migrate:prod
```

To check migration status:
```bash
railway run psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"
```

## Monitoring and Logs

### View Logs
```bash
# Using Railway CLI
railway logs

# Or in Railway dashboard
Click on your service → "Deployments" → Select deployment → "Logs"
```

### Health Checks

- **Backend**: `https://your-backend-url.railway.app/health`
- **Frontend**: `https://your-frontend-url.railway.app/`

## Environment Variables Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | Auto-provided | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Secret for JWT token signing (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token expiration time |
| `PORT` | No | `3001` | Server port (Railway auto-assigns) |
| `NODE_ENV` | No | `production` | Environment mode |
| `CORS_ORIGIN` | Yes | - | Allowed frontend URL(s) |
| `REDIS_URL` | No | - | Redis connection string (optional) |
| `LOG_LEVEL` | No | `info` | Logging level |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |
| `VITE_WS_URL` | Yes | - | Backend WebSocket URL (same as API) |
| `VITE_SENTRY_DSN` | No | - | Sentry error tracking DSN |
| `VITE_SENTRY_ENVIRONMENT` | No | `production` | Sentry environment name |
| `VITE_ENABLE_ANALYTICS` | No | `false` | Enable analytics tracking |
| `VITE_ENABLE_DEBUG` | No | `false` | Enable debug mode |

## Troubleshooting

### Backend won't start
1. Check logs for migration errors
2. Verify `DATABASE_URL` is set correctly
3. Ensure all required environment variables are set

### Frontend can't connect to backend
1. Verify `VITE_API_URL` matches backend URL
2. Check backend `CORS_ORIGIN` includes frontend URL
3. Ensure backend service is running

### Database connection errors
1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` environment variable
3. Review migration logs

### Migration failures
1. Check migration SQL files for errors
2. Verify database permissions
3. Review migration logs: `railway logs`

## Rollback Deployment

To rollback to a previous deployment:

1. Go to Railway dashboard
2. Select your service
3. Click "Deployments"
4. Find the working deployment
5. Click "Redeploy"

## Scaling

Railway automatically scales based on usage. For custom scaling:

1. Go to service settings
2. Adjust resources under "Resources" tab
3. Configure replicas if needed

## Security Checklist

- [x] Strong `JWT_SECRET` generated and set
- [x] `NODE_ENV=production` in backend
- [x] CORS configured to only allow your frontend domain
- [x] Database connection uses SSL (`?ssl=true`)
- [x] No sensitive data in environment variable defaults
- [x] Logs don't expose secrets
- [x] Rate limiting enabled
- [x] Helmet security headers configured

## Cost Optimization

Railway pricing is based on usage. To optimize costs:

1. Use PostgreSQL connection pooling
2. Enable caching where appropriate
3. Monitor resource usage in Railway dashboard
4. Consider hibernating dev environments when not in use

## Support

- **Railway Documentation**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app

---

## Quick Deploy Commands

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy backend
cd backend
railway up

# Deploy frontend
cd ../frontend
railway up

# View logs
railway logs

# Run migrations manually
cd backend
railway run npm run migrate:prod
```

## Deployment Checklist

Before going to production:

- [ ] PostgreSQL database provisioned
- [ ] Backend deployed with all environment variables
- [ ] Frontend deployed with all environment variables
- [ ] CORS properly configured
- [ ] JWT_SECRET is strong and unique
- [ ] Database migrations completed successfully
- [ ] Health checks passing
- [ ] Custom domains configured (optional)
- [ ] Monitoring and logging set up
- [ ] Backup strategy in place

---

**Last Updated**: 2025
**ChessSlack Version**: 1.0.0
