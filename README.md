# YouTube Video Processor

A multi-user platform for scheduling, processing, and managing YouTube video transcripts with AI automation.

## 🚀 Features

- **Multi-User System**: Simple username-based authentication for 2 users
- **Video Scheduling**: Automatically fetch and schedule YouTube videos from source channels
- **Transcript Processing**: Fetch transcripts via Supadata API with copy/paste workflow
- **VastAI Integration**: Rent GPU instances and execute commands automatically
- **Telegram Integration**: Send reference audio and processed scripts to Telegram
- **Daily Automation**: Automated daily video fetching via cron job
- **User-Specific Settings**: Each user can configure their own channels and preferences
- **Shared API Configuration**: Common API keys and settings for all users

## 📋 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **APIs**: YouTube Data API v3, Supadata, VastAI, Telegram Bot API

## 🛠️ Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- GitHub account
- Vercel account
- Supabase account

### 2. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd youtube-processor

# Install dependencies
npm install
```

### 3. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to **SQL Editor**
3. Copy the contents of `supabase-schema.sql` and run it
4. Go to **Project Settings** → **API** and copy:
   - Project URL
   - anon/public key
   - service_role key

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions.

### 4. Environment Variables

Create `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Cron Secret (for Vercel cron job authentication)
CRON_SECRET=your-random-secret-key
```

### 5. Local Development

```bash
# Run development server
npm run dev

# Open http://localhost:3000
```

### 6. Configure Application Settings

1. Login with username (User1 or User2)
2. Go to **Settings** page
3. Configure the following:

#### User-Specific Settings
- **Videos Per Day**: Number of videos to schedule daily (default: 16)
- **Source Channels**: Add YouTube channel URLs with:
  - Channel URL
  - Minimum duration (in minutes)
  - Reference audio YouTube URL

#### Shared Settings (Any user can configure)
- **YouTube API Key**: Get from [Google Cloud Console](https://console.cloud.google.com/)
- **VastAI API Key**: Get from [vast.ai](https://vast.ai)
- **VastAI Commands**: Commands to execute on instance (one per line)
- **Telegram Bot Token**: Get from [@BotFather](https://t.me/botfather)
- **Telegram Chat ID**: Your chat ID (use [@userinfobot](https://t.me/userinfobot))
- **Prompt Template**: Your processing prompt template
- **Supadata API Keys**: Add multiple keys for automatic failover

## 📦 Deployment to Vercel

### Automatic Deployment (Easiest)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `CRON_SECRET`
6. Click "Deploy"

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add CRON_SECRET

# Deploy to production
vercel --prod
```

## 🔄 Workflow

### Daily Automated Process

1. **12:00 AM**: Cron job fetches new videos from all configured channels
2. Videos are filtered by minimum duration and sorted by views
3. Top 1000 videos (or available) are saved to database

### Manual Daily Workflow

1. **Generate Schedule**: Click "Generate Schedule" to randomly select videos for today
2. **Process Transcripts**:
   - Click "Process Transcripts" button
   - Transcript fetches automatically via Supadata API
   - Copy "Prompt + Transcript"
   - Process externally
   - Paste result and submit
   - Repeat for all videos
3. **VastAI Workflow**:
   - Click "VastAI" button
   - Click "Setup VastAI" → Rents GPU and runs commands
   - Click "Set Reference Audio" → Sends link to Telegram
   - Click "Send Scripts" → Sends all processed scripts to Telegram
   - Click "Stop Instance" → Stops the GPU instance

## 📚 API Endpoints

### Public Endpoints

- `POST /api/videos/fetch` - Fetch videos for user's channels
- `POST /api/schedule/generate` - Generate daily schedule

### Cron Endpoints

- `GET /api/cron/daily-fetch` - Daily automated video fetching (requires Bearer token)

## 🔑 API Key Management

### YouTube API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "YouTube Data API v3"
4. Create credentials (API Key)
5. Add to Settings

### Supadata API

- Add multiple keys for automatic failover
- When a key is exhausted (429 error), it's automatically deleted and next key is used
- Always maintain at least 2-3 active keys

### VastAI

1. Sign up at [vast.ai](https://vast.ai)
2. Go to Account → API Key
3. Copy and add to Settings

### Telegram Bot

1. Message [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow instructions
3. Copy the bot token
4. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
5. Add both to Settings

## 🐛 Troubleshooting

### Videos not fetching
- Check YouTube API key is valid
- Verify channel URLs are correct
- Check API quota limits

### Transcript errors
- Ensure Supadata API keys are active
- Add multiple keys for redundancy
- Check video has available transcripts

### VastAI not working
- Verify API key is correct
- Check commands are valid
- Ensure sufficient balance

### Telegram not sending
- Verify bot token and chat ID
- Check bot has permission to message you
- Ensure you've started a chat with the bot

## 📄 Database Schema

- **users**: User accounts
- **user_settings**: User-specific preferences
- **source_channels**: YouTube channels to fetch from
- **shared_settings**: Shared API configurations
- **supadata_api_keys**: Supadata API keys with priority
- **videos**: Fetched video database
- **daily_schedule**: Daily scheduled videos with processing status

## 🔐 Security Notes

- Never commit `.env.local` to version control
- Keep `SUPABASE_SERVICE_KEY` secret
- Use strong `CRON_SECRET` for cron job authentication
- Regularly rotate API keys
- Enable Row Level Security (RLS) in Supabase for production

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This is a private project. For issues or feature requests, contact the repository owner.

## 📧 Support

For questions or support, please create an issue in the GitHub repository.
