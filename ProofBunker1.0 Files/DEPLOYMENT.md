# 🚀 Proof Bunker - Cloud Deployment Guide

## Prerequisites
- GitHub account
- Railway.app account (free tier)
- Netlify account (free tier)  
- Cloudinary account (free tier)

---

## Part 1: Cloudinary Setup (Photo Storage)

### 1. Create Cloudinary Account
1. Go to https://cloudinary.com/users/register/free
2. Sign up (free tier = 25GB storage)
3. Verify email

### 2. Get Credentials
1. Go to Dashboard
2. Copy:
   - **Cloud Name** (e.g. `doorryzm7`)
   - **API Key**
   - **API Secret**

### 3. Create Upload Preset
1. Go to Settings → Upload
2. Click "Add upload preset"
3. Name: `proof-bunker`
4. Signing Mode: **Unsigned**
5. Folder: `proof-bunker`
6. Transformations:
   - Add: `format: jpg` (auto-converts HEIC to JPG)
   - Add: `quality: auto`
7. Save

---

## Part 2: Push Code to GitHub

### 1. Create GitHub Repos
```bash
# Create two repos on github.com:
# - proof-bunker-backend
# - proof-bunker-frontend
```

### 2. Push Backend
```bash
cd J:\ProofBunker\backend
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/YOUR_USERNAME/proof-bunker-backend.git
git push -u origin main
```

### 3. Push Frontend
```bash
cd J:\ProofBunker\frontend
git init
git add .
git commit -m "Initial frontend"
git remote add origin https://github.com/YOUR_USERNAME/proof-bunker-frontend.git
git push -u origin main
```

---

## Part 3: Deploy Backend (Railway)

### 1. Create Railway Project
1. Go to https://railway.app
2. Click "Start a New Project"
3. Choose "Deploy from GitHub repo"
4. Select `proof-bunker-backend`

### 2. Add PostgreSQL Database
1. In Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Wait for provision (1 min)
4. Railway auto-creates `DATABASE_URL` env var

### 3. Configure Environment Variables
Click backend service → Variables → Add:
```
AUTH0_DOMAIN=dev-aa1ngt172tdv2zls.us.auth0.com
AUTH0_AUDIENCE=https://api.proofbunker.com
ALLOWED_ORIGINS=https://your-app.netlify.app,http://localhost:5173
NODE_ENV=production
PORT=3000
```

### 4. Run Migrations
1. Click service → Settings → Deploy
2. After first deploy, go to service → Data tab
3. Connect to database via psql or Railway CLI
4. Run migrations:
```bash
railway connect postgres
# Then paste each migration file content
```

### 5. Get Backend URL
- Copy from service settings: `https://your-backend.up.railway.app`

---

## Part 4: Deploy Frontend (Netlify)

### 1. Create Netlify Site
1. Go to https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub
4. Select `proof-bunker-frontend`
5. Build settings (auto-detected from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`

### 2. Configure Environment Variables
Go to Site settings → Environment variables → Add:
```
VITE_AUTH0_DOMAIN=dev-aa1ngt172tdv2zls.us.auth0.com
VITE_AUTH0_CLIENT_ID=y7V924cWIkgxi7r1uJ5dp870CL4EkW3A
VITE_AUTH0_AUDIENCE=https://api.proofbunker.com
VITE_API_URL=https://your-backend.up.railway.app/api/v1
VITE_CLOUDINARY_CLOUD_NAME=doorryzm7
VITE_CLOUDINARY_UPLOAD_PRESET=proof-bunker
```

### 3. Deploy
1. Click "Deploy site"
2. Wait 2-3 minutes
3. Copy site URL: `https://your-app.netlify.app`

---

## Part 5: Update Auth0

### 1. Add Production URLs
1. Go to Auth0 Dashboard → Applications → Proof Bunker
2. Update:
   - **Allowed Callback URLs:** Add `https://your-app.netlify.app`
   - **Allowed Logout URLs:** Add `https://your-app.netlify.app`
   - **Allowed Web Origins:** Add `https://your-app.netlify.app`
   - **Allowed Origins (CORS):** Add `https://your-app.netlify.app`

### 2. Update Backend ALLOWED_ORIGINS
Go back to Railway → backend → Variables → Update `ALLOWED_ORIGINS`:
```
https://your-app.netlify.app,http://localhost:5173
```

---

## Part 6: Test Production App

### 1. Visit Your Site
Open `https://your-app.netlify.app`

### 2. Expected Flow
1. Age verification splash
2. Login with Google
3. Search bottles
4. Click "Quick Add" → Camera opens → Upload photo

### 3. Common Issues

**Camera not working:**
- Must use HTTPS (Netlify auto-provides)
- Check browser permissions

**Upload fails:**
- Verify Cloudinary preset is Unsigned
- Check browser console for errors

**Backend errors:**
- Check Railway logs: service → Deployments → View logs
- Verify DATABASE_URL connected

---

## Part 7: Invite Testers

### 1. Share URL
Send testers: `https://your-app.netlify.app`

### 2. First-Time User Flow
1. Age verification
2. Login with Google (any Google account)
3. Auto-created as "member" role

### 3. Promote to Curator (optional)
```sql
-- Connect to Railway database
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'curator')
WHERE email = 'tester@example.com';
```

---

## Ongoing: Auto-Deploy

### Frontend
- Push to GitHub main → Netlify auto-deploys (2-3 min)

### Backend
- Push to GitHub main → Railway auto-deploys (2-3 min)

### Database Migrations
- Manual via Railway psql or Railway CLI

---

## Costs (Free Tier Limits)

**Netlify:**
- 100GB bandwidth/month
- 300 build minutes/month
- Cost: $0

**Railway:**
- $5 free credit/month
- ~$5-10/month after (scales with usage)

**Cloudinary:**
- 25GB storage
- 25GB bandwidth/month
- Cost: $0

**Total: ~$5-10/month**

---

## Next Steps

1. Test on mobile (iOS Safari, Android Chrome)
2. Gather tester feedback
3. Monitor Railway logs for errors
4. When ready: custom domain (proofbunker.com)

🥃 **Your bunker is now live!**
