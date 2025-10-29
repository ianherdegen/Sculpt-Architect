# Supabase Integration Setup

This project is now configured to work with Supabase for data persistence.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login and create a new project
3. Choose a name and region for your project
4. Wait for the project to be created

### 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy your Project URL and anon/public key
3. Create a `.env.local` file in the project root:

```bash
cp env.template .env.local
```

4. Fill in your Supabase credentials in `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up the Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL commands
4. This will create the tables and insert sample data

### 4. Test the Integration

1. Start the development server: `yarn dev`
2. The app should now load poses and variations from Supabase
3. You can create, edit, and delete poses, variations, and sequences
4. All data will be persisted to your Supabase database

## Database Schema

### Tables Created:

- **poses**: Stores yoga pose names
- **pose_variations**: Stores variations of poses (linked to poses)
- **sequences**: Stores yoga sequences with sections as JSON

### Features:

- Row Level Security enabled
- Automatic timestamps (created_at, updated_at)
- Foreign key relationships
- Sample data included
- Optimized with indexes

## Next Steps

Once set up, you can:
- Add more poses and variations
- Create and manage sequences
- All data persists across sessions
- Share sequences with others (if you add user authentication later)
