# Supabase Integration Setup

This project is now configured to work with Supabase for data persistence and user authentication.

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
4. This will create the tables, enable authentication, and insert sample data

### 4. Enable Authentication

1. In your Supabase dashboard, go to Authentication > Settings
2. Configure your authentication settings:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000` for development
3. **IMPORTANT**: For development, disable email confirmation:
   - Go to Authentication > Settings > Auth
   - Under "User Signups", **uncheck** "Enable email confirmations"
   - This allows users to sign up and immediately access the app
4. You can customize email templates and other auth settings as needed

### 5. Test the Integration

1. Start the development server: `yarn dev`
2. You should see a login/signup form
3. Create an account or sign in
4. The app will now load poses and variations from Supabase
5. You can create, edit, and delete sequences (user-specific)
6. All data will be persisted to your Supabase database

### 6. Create Your First Admin User

1. **Sign up** for an account in your app
2. **Go to Supabase Dashboard > Table Editor**
3. **Click on `user_profiles` table**
4. **Find your user** (look for your email in the auth.users table first to get your user_id)
5. **Update the role** from 'user' to 'admin':
   ```sql
   UPDATE user_profiles 
   SET role = 'admin' 
   WHERE user_id = 'your-user-id-here';
   ```
6. **Refresh your app** - you should now see the "Pose Library" tab
7. **You can now add/edit poses and variations**

## Database Schema

### Tables Created:

- **poses**: Stores yoga pose names (public/shared)
  - `id` (UUID, Primary Key)
  - `name` (TEXT, Unique)
  - `created_at`, `updated_at` (Timestamps)

- **pose_variations**: Stores variations of poses (public/shared)
  - `id` (UUID, Primary Key)
  - `pose_id` (UUID, Foreign Key to poses)
  - `name` (TEXT)
  - `is_default` (BOOLEAN) - Marks the default variation for each pose
  - `created_at`, `updated_at` (Timestamps)

- **sequences**: Stores yoga sequences with sections as JSON (user-specific)
  - `id` (UUID, Primary Key)
  - `name` (TEXT)
  - `sections` (JSONB) - Array of sections with poses and group blocks
  - `user_id` (UUID, Foreign Key to auth.users) - Links sequences to users
  - `created_at`, `updated_at` (Timestamps)

- **user_profiles**: Stores user roles and permissions
  - `id` (UUID, Primary Key)
  - `user_id` (UUID, Foreign Key to auth.users) - Links to user account
  - `role` (TEXT) - 'user' or 'admin'
  - `created_at`, `updated_at` (Timestamps)

### Features:

- **Authentication**: Users must sign up/login to access the app
- **Role-based Access**: Admin users can manage poses, regular users can only create sequences
- **User-specific sequences**: Each user only sees their own sequences
- **Shared pose library**: All users share the same poses and variations (read-only for regular users)
- **Admin permissions**: Only admins can add/edit/delete poses and variations
- **Row Level Security**: Database policies ensure proper data isolation and access control
- **Automatic timestamps**: created_at, updated_at fields
- **Foreign key relationships**: With cascade delete
- **Sample data**: 10 poses with default variations
- **Optimized performance**: Indexes on frequently queried fields
- **Unique constraints**: Prevent duplicate pose names and variation names per pose

## Authentication Features

- **Sign Up**: Users can create new accounts with email/password
- **Sign In**: Existing users can log in
- **Sign Out**: Users can log out and return to login screen
- **Session persistence**: Users stay logged in across browser sessions
- **User-specific data**: Sequences are tied to user accounts
- **Secure access**: Database policies ensure users only see their own sequences

## Next Steps

Once set up, you can:
- Sign up for an account
- Add more poses and variations (shared across all users)
- Create and manage your own sequences
- All data persists across sessions
- Each user has their own private sequence library
