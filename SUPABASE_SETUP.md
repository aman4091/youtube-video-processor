# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Enter project details:
   - Name: `youtube-processor`
   - Database Password: (choose a strong password)
   - Region: Select closest to you
5. Click "Create new project"
6. Wait for project to be ready (~2 minutes)

## Step 2: Run Database Migration

1. In your Supabase project dashboard, click on **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` file
4. Paste it into the SQL Editor
5. Click **Run** button (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned" message
7. Go to **Table Editor** to verify all tables were created:
   - users
   - user_settings
   - source_channels
   - shared_settings
   - supadata_api_keys
   - videos
   - daily_schedule

## Step 3: Get API Keys

1. Go to **Project Settings** (gear icon in sidebar)
2. Click on **API** tab
3. You'll need three values:

   - **Project URL**: Copy the URL under "Project URL"
   - **anon/public key**: Copy the key under "Project API keys" → "anon public"
   - **service_role key**: Copy the key under "Project API keys" → "service_role" (⚠️ Keep this secret!)

## Step 4: Configure Environment Variables

1. In the project root, create `.env.local` file
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

Replace `your-project-url-here`, `your-anon-key-here`, and `your-service-role-key-here` with the actual values from Step 3.

## Step 5: Verify Setup

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)
3. The app should connect to Supabase successfully

## Default Users

The migration creates two default users:
- User1
- User2

You can modify usernames in the Settings page after first login.

## Troubleshooting

### Tables not created
- Make sure you ran the entire SQL migration
- Check for error messages in SQL Editor
- Verify all tables in Table Editor

### Connection errors
- Double-check environment variables in `.env.local`
- Make sure `.env.local` is in the project root
- Restart the development server after adding env variables

### RLS (Row Level Security) issues
- The schema includes permissive policies for simplicity
- All authenticated users can access all data
- For production, consider more restrictive policies

## Next Steps

After setup is complete:
1. Run `npm run dev`
2. Login with username (User1 or User2)
3. Go to Settings page to configure API keys
4. Start using the app!
