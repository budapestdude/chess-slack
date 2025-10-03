# Railway Deployment Guide - ChessSlack Personal Tracker

## 🚀 Quick Deploy to Railway

Follow these steps to deploy your ChessSlack app with the new Personal Tracker features to Railway.

---

## Step 1: Create Railway Account & Project

1. Go to [railway.app](https://railway.app)
2. Sign up or log in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose **`budapestdude/chess-slack`**

---

## Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically provision a PostgreSQL instance
4. Note: `DATABASE_URL` will be automatically available to your services

---

## Step 3: Deploy Backend

### A. Create Backend Service

1. Click **"+ New"** → **"GitHub Repo"** → Select `budapestdude/chess-slack`
2. Railway will detect the monorepo structure
3. Set **Root Directory** to `backend`
4. Railway will use the `railway.json` and `nixpacks.toml` configs

### B. Set Backend Environment Variables

Click on the backend service → **Variables** tab → Add these:

```bash
# Database (Auto-provided by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT Configuration (CRITICAL - Generate a strong secret)
JWT_SECRET=<GENERATE_STRONG_SECRET_HERE>
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production

# CORS (Update after frontend is deployed)
CORS_ORIGIN=https://your-frontend-url.railway.app

# Optional: Logging
LOG_LEVEL=info
```

**🔐 Generate JWT Secret:**
```bash
openssl rand -base64 32
```

### C. Deploy Backend

1. Railway will automatically build and deploy
2. Migrations run automatically on startup via `npm run migrate:prod`
3. Wait for deployment to complete
4. Click **"Settings"** → **"Networking"** → **"Generate Domain"** to get your backend URL

---

## Step 4: Deploy Frontend

### A. Create Frontend Service

1. Click **"+ New"** → **"GitHub Repo"** → Select `budapestdude/chess-slack` again
2. Set **Root Directory** to `frontend`
3. Railway will use the `railway.json` and `nixpacks.toml` configs

### B. Set Frontend Environment Variables

Click on the frontend service → **Variables** tab → Add these:

```bash
# API URL (Use your backend Railway URL from Step 3C)
VITE_API_URL=https://your-backend-url.railway.app

# WebSocket URL (Same as API URL)
VITE_WS_URL=https://your-backend-url.railway.app

# Optional: Analytics
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
```

### C. Deploy Frontend

1. Railway will automatically build and deploy
2. Wait for build to complete
3. Click **"Settings"** → **"Networking"** → **"Generate Domain"** to get your frontend URL

---

## Step 5: Update CORS Configuration

**Important:** Now that you have both URLs, update the backend CORS:

1. Go to **Backend Service** → **Variables**
2. Update `CORS_ORIGIN` to your frontend URL:
   ```
   CORS_ORIGIN=https://your-frontend-url.railway.app
   ```
3. Click **"Redeploy"** on the backend service

---

## Step 6: Verify Deployment

### Test Backend
```bash
curl https://your-backend-url.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Test Frontend
1. Open `https://your-frontend-url.railway.app` in browser
2. Register a new account
3. Create a workspace
4. Navigate to "Habit Tracker" in sidebar
5. Test the Personal Tracker features:
   - Add a habit
   - Add daily checklist items
   - Set up recurring tasks
   - Check items off

---

## 📋 Database Migrations

Migrations run automatically when the backend starts. The following migrations will execute:

✅ 001-011: Previous features (channels, tasks, calendar, documents, etc.)
✅ **012_add_personal_tracker.sql** - Habits and metrics
✅ **013_add_daily_checklist.sql** - Daily task lists
✅ **014_add_recurring_tasks.sql** - Recurring task templates

### Manual Migration (if needed)

```bash
# Using Railway CLI
railway link
railway run npm run migrate:prod
```

---

## 🎯 Features Now Available

Your deployed app includes:

### Personal Tracker
- ✅ **Habit Tracking** - Track daily habits with streaks
- ✅ **Daily Checklist** - Bulk paste tasks, date navigation
- ✅ **Recurring Tasks** - Auto-populate daily tasks
- ✅ **Diary View** - Review any past day
- ✅ **Personal Tasks** - One-off tasks with priorities

### Core Features (Already Deployed)
- ✅ Real-time messaging
- ✅ Channels and DMs
- ✅ Team task management
- ✅ Calendar and events
- ✅ Documents and wiki
- ✅ Analytics dashboard

---

## 🔧 Troubleshooting

### Backend Won't Start
1. Check logs: Click service → **Deployments** → Select deployment → **View Logs**
2. Verify `DATABASE_URL` is set
3. Verify `JWT_SECRET` is at least 32 characters
4. Check migration errors in logs

### Frontend Can't Connect
1. Verify `VITE_API_URL` matches backend URL
2. Check backend `CORS_ORIGIN` includes frontend URL
3. Ensure backend service is running (green status)

### Database Migration Errors
1. View backend logs for specific error
2. Check PostgreSQL service is running
3. Verify `DATABASE_URL` is correct

### 404 on API Calls
1. Verify backend URL is correct
2. Check CORS settings
3. Verify routes are registered in `backend/src/index.ts`

---

## 📊 Monitoring

### Railway Dashboard
- **Deployments**: View build logs and status
- **Metrics**: CPU, memory, network usage
- **Logs**: Real-time application logs

### Health Checks
```bash
# Backend health
curl https://your-backend-url.railway.app/health

# Database connection test
# Check backend logs for "Database connected" message
```

---

## 🔐 Security Checklist

- ✅ Strong `JWT_SECRET` (32+ characters)
- ✅ `NODE_ENV=production`
- ✅ CORS limited to your frontend domain only
- ✅ Database uses SSL (Railway default)
- ✅ No secrets in git repository
- ✅ Rate limiting enabled (in code)
- ✅ Helmet security headers configured

---

## 💰 Cost Optimization

Railway offers:
- **$5/month Hobby plan** - Includes PostgreSQL, 2 services
- **Usage-based pricing** beyond free tier
- **Sleep mode** for inactive services (optional)

Recommendations:
- Use connection pooling (already configured)
- Monitor resource usage in Railway dashboard
- Consider upgrading to Pro for production scale

---

## 🎉 Next Steps

1. **Test all features** on your deployed app
2. **Set up custom domain** (optional):
   - Railway Settings → Networking → Custom Domain
3. **Configure monitoring**:
   - Add Sentry for error tracking (optional)
   - Set up uptime monitoring
4. **Backup strategy**:
   - Railway provides automated backups for PostgreSQL
   - Consider additional backup solution for critical data

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app
- **ChessSlack Repo**: https://github.com/budapestdude/chess-slack

---

## ✅ Deployment Complete!

Your app should now be live at:
- **Frontend**: `https://your-frontend-url.railway.app`
- **Backend API**: `https://your-backend-url.railway.app`

You can now:
- Access your Personal Tracker
- Create habits and daily checklists
- Set up recurring tasks
- View your diary history
- Share with others!

🎊 **Congratulations on deploying your ChessSlack Personal Tracker!**
