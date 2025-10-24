# Deployment Guide

Complete step-by-step guide to deploy your YouTube Video Processor to production.

## 📋 Prerequisites Checklist

- [x] Project code ready (✓ Done!)
- [ ] Supabase project created
- [ ] GitHub account
- [ ] Vercel account
- [ ] All API keys obtained

---

## Step 1: Create Supabase Project (5 minutes)

### 1.1 Create Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: `youtube-processor`
   - **Database Password**: (create a strong password)
   - **Region**: Select closest to your location
4. Click "Create new project"
5. Wait ~2 minutes for project to initialize

### 1.2 Run Database Migration

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `E:/pp/youtube-processor/supabase-schema.sql`
4. Copy **all** the contents
5. Paste into SQL Editor
6. Click **Run** (or press F5)
7. You should see "Success. No rows returned"

### 1.3 Verify Tables Created

1. Click **Table Editor** (left sidebar)
2. Verify you see these 7 tables:
   - users
   - user_settings
   - source_channels
   - shared_settings
   - supadata_api_keys
   - videos
   - daily_schedule

### 1.4 Get API Keys

1. Go to **Project Settings** (gear icon)
2. Click **API** tab
3. **IMPORTANT**: Copy these 3 values:
   - **Project URL** (looks like: `https://xxx.supabase.co`)
   - **anon public** key (under "Project API keys")
   - **service_role** key (under "Project API keys" - click "Reveal" button)

> ⚠️ Keep these keys safe! You'll need them in Step 3.

---

## Step 2: Create GitHub Repository (3 minutes)

### Option A: Using GitHub Website (Recommended)

1. Go to [https://github.com/new](https://github.com/new)
2. Fill in:
   - **Repository name**: `youtube-video-processor`
   - **Description**: "Multi-user YouTube video processing platform"
   - **Visibility**: Private (recommended) or Public
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"
5. You'll see instructions on the page - **ignore them** and continue below

### 2.1 Push Your Code

Open your terminal in the project folder (`E:/pp/youtube-processor`) and run:

```bash
# Add GitHub as remote (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/youtube-video-processor.git

# Push code to GitHub
git branch -M main
git push -u origin main
```

### 2.2 Verify Upload

1. Refresh your GitHub repository page
2. You should see all your files uploaded
3. Verify `README.md` is visible

---

## Step 3: Deploy to Vercel (7 minutes)

### 3.1 Import Project

1. Go to [https://vercel.com](https://vercel.com)
2. Sign in (use your GitHub account)
3. Click "Add New..." → "Project"
4. You should see your `youtube-video-processor` repository
5. Click "Import"

### 3.2 Configure Project

1. **Framework Preset**: Should auto-detect as "Next.js"
2. **Root Directory**: Leave as `./`
3. **Build Command**: `npm run build` (default)
4. **Output Directory**: `.next` (default)

### 3.3 Add Environment Variables

Click "Environment Variables" section and add these **4 variables**:

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: Paste your Supabase Project URL from Step 1.4
- **Environment**: Production, Preview, Development (select all)

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Paste your Supabase anon public key from Step 1.4
- **Environment**: Production, Preview, Development (select all)

#### Variable 3: SUPABASE_SERVICE_KEY
- **Key**: `SUPABASE_SERVICE_KEY`
- **Value**: Paste your Supabase service_role key from Step 1.4
- **Environment**: Production, Preview, Development (select all)

#### Variable 4: CRON_SECRET
- **Key**: `CRON_SECRET`
- **Value**: Create a random secret (e.g., `crypto_random_12345_secret`)
- **Environment**: Production (select only Production)

> 💡 Tip: Use a password generator for CRON_SECRET

### 3.4 Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for deployment to complete
3. You'll see "Congratulations!" when done

### 3.5 Get Your App URL

1. Click "Visit" button or copy the URL (looks like: `https://youtube-video-processor.vercel.app`)
2. **Save this URL** - this is your live app!

---

## Step 4: Configure Cron Job (2 minutes)

The cron job is already configured in `vercel.json`, but you need to enable it:

1. In Vercel dashboard, click on your project
2. Go to **Settings** → **Cron Jobs**
3. You should see: `/api/cron/daily-fetch` scheduled for `0 0 * * *` (daily at midnight)
4. If not visible, the cron will auto-activate on first deployment

To manually test the cron:

```bash
curl -X GET https://your-app-url.vercel.app/api/cron/daily-fetch \
  -H "Authorization: Bearer your-cron-secret"
```

---

## Step 5: Initial Application Setup (10 minutes)

### 5.1 Access Your App

1. Open your Vercel app URL: `https://youtube-video-processor.vercel.app`
2. You should see the login page

### 5.2 Login

1. Select "User1" or "User2" (default users created by database migration)
2. Click "Enter"
3. You'll be redirected to the Dashboard

### 5.3 Configure Settings

Click the hamburger menu → **Settings**

#### Get Required API Keys

##### YouTube API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to "APIs & Services" → "Library"
4. Search "YouTube Data API v3"
5. Click "Enable"
6. Go to "Credentials" → "Create Credentials" → "API Key"
7. Copy the API key
8. Paste in Settings → YouTube API Key

##### VastAI API Key
1. Go to [https://vast.ai](https://vast.ai)
2. Create account and login
3. Go to "Account" → "Change password" → scroll down to "API Key"
4. Copy the API key
5. Paste in Settings → VastAI API Key

##### Telegram Bot
1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow instructions (choose name and username)
4. Copy the **Bot Token**
5. Paste in Settings → Telegram Bot Token

6. Now search for `@userinfobot` in Telegram
7. Send `/start`
8. Copy your **Chat ID** (numbers only)
9. Paste in Settings → Telegram Chat ID

10. **IMPORTANT**: Go back to your bot and send `/start` to activate it

##### Supadata API Keys
1. Sign up at Supadata (or your transcript API provider)
2. Get API key(s)
3. Add to Settings → Supadata API Keys
4. **Add at least 2-3 keys for failover**

#### Configure Other Settings

1. **Videos Per Day**: Set how many videos you want daily (e.g., 16)
2. **VastAI Commands**: Add your GPU setup commands (one per line), example:
   ```
   cd /workspace
   git clone https://your-repo.git
   pip install -r requirements.txt
   python setup.py
   ```
3. **Prompt Template**: Add your processing prompt template

#### Add Source Channels

1. In "Source Channels" section, click "Add Channel"
2. Fill in:
   - **YouTube Channel URL**: (e.g., `https://www.youtube.com/@channelname`)
   - **Min Duration**: Minimum video length in minutes (e.g., `10`)
   - **Reference Audio URL**: YouTube URL for voice reference
3. Click "Add Channel"
4. Repeat for all your source channels

### 5.4 Save Settings

Click "Save User Settings" and "Save Shared Settings"

---

## Step 6: First Run (5 minutes)

### 6.1 Fetch Videos

1. Go back to Dashboard (hamburger menu → Schedule)
2. Open browser console (F12) and run:
   ```javascript
   fetch('/api/videos/fetch', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ userId: 'your-user-id' })
   }).then(r => r.json()).then(console.log)
   ```

   Or use a simpler approach - wait for the daily cron job to run at midnight.

### 6.2 Generate Schedule

1. Click "Generate Schedule" button
2. You should see 16 (or your configured number) random videos
3. Each video shows thumbnail, title, views, and status

### 6.3 Process Transcript (Test)

1. Click "Process Transcripts"
2. Transcript should auto-load (via Supadata API)
3. Click "Copy Prompt + Transcript"
4. Process it (externally)
5. Paste result in the text area
6. Click "Submit & Next"

### 6.4 Test VastAI (Optional)

⚠️ **Warning**: This will charge your VastAI account

1. Click "VastAI" button
2. Click "Setup VastAI" → Instance rents and commands run
3. Watch the logs
4. Click "Stop Instance" when done

---

## ✅ Deployment Complete!

Your app is now live and running! 🎉

### Next Steps

1. **Daily Usage**:
   - Login each morning
   - Generate schedule (or it auto-generates)
   - Process transcripts
   - Use VastAI when needed

2. **Monitoring**:
   - Check Vercel dashboard for errors
   - Monitor Supabase usage
   - Track API quotas

3. **Maintenance**:
   - Rotate Supadata keys when exhausted
   - Monitor VastAI spending
   - Backup database periodically

---

## 🐛 Troubleshooting

### App not loading
- Check Vercel deployment logs
- Verify environment variables are set
- Check browser console for errors

### Database errors
- Verify Supabase project is running
- Check API keys are correct
- Ensure tables were created

### API errors
- Verify all API keys in Settings
- Check quotas and billing
- Test keys individually

### Cron job not running
- Check Vercel → Settings → Cron Jobs
- Verify CRON_SECRET is set
- Test manually with curl

---

## 📞 Support

If you encounter issues:
1. Check the main README.md
2. Review Vercel deployment logs
3. Check Supabase database logs
4. Open an issue in the GitHub repository

---

## 🎯 Summary

Total time: ~30 minutes

- ✅ Supabase project created and configured
- ✅ GitHub repository created and code pushed
- ✅ Vercel deployment successful
- ✅ Environment variables configured
- ✅ Cron job enabled
- ✅ Application settings configured
- ✅ Ready for daily use!

**Your app is live at**: `https://youtube-video-processor.vercel.app`

Enjoy your automated YouTube video processing platform! 🚀
