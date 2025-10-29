# Supabase Setup Instructions

## Quick Setup Guide

### 1. Environment Variables

Create a `.env.local` file in the root of your project with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**To get your Supabase credentials:**
1. Go to https://app.supabase.com
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
5. Copy the **anon public** key (long JWT token)

### 2. Database Setup

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)

This will:
- ✅ Drop all existing tables, policies, triggers, and functions
- ✅ Create fresh tables with proper relationships
- ✅ Set up Row Level Security (RLS) policies
- ✅ Insert sample data

### 3. Verify Setup

1. Start your dev server: `npm run dev` or `yarn dev`
2. The app should load immediately
3. Check that you can see the sample poses in the app
4. Try creating a sequence

### Troubleshooting

**"Missing Supabase environment variables" error:**
- Make sure `.env.local` exists and has the correct values
- Restart your dev server after creating/updating `.env.local`

**"Stuck on loading":**
- Check browser console for errors
- Verify your Supabase URL and key are correct
- Make sure the database schema was run successfully

**Can't see poses:**
- Make sure RLS policies were created correctly
- Check that sample data was inserted
- Verify your Supabase connection is working
