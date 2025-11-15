# Yoga Sequence Builder

A web application for building and managing yoga sequences with pose libraries, variations, and class scheduling.

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Yarn package manager
- A Supabase project (for database and authentication)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Sculpt-Sequences
```

2. Install dependencies:
```bash
yarn install
```

### Environment Setup

1. Copy the environment template file:
```bash
cp env.template .env.local
```

2. Edit `.env.local` and add your Supabase credentials:
   - `VITE_SUPABASE_URL`: Your Supabase project URL (found in Settings > API)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key (found in Settings > API)

**About `env.template`:**
The `env.template` file contains placeholder values for required environment variables. These variables are used by the application to connect to your Supabase backend. The template file is safe to commit to version control since it doesn't contain any actual secrets—you must copy it to `.env.local` and fill in your own credentials.

**Getting Supabase Credentials:**
1. Go to https://app.supabase.com
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy the **Project URL** and **anon public** key into your `.env.local` file

### Database Setup

Run the `supabase-schema.sql` file in your Supabase SQL Editor to set up the database schema, tables, and policies.

### Running the Development Server

Start the development server:
```bash
yarn dev
```

To run with network access (accessible from other devices on your network):
```bash
yarn dev --host
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal).

## Additional Resources

- See `SUPABASE_SETUP.md` for detailed Supabase setup instructions
- See `PERMISSIONS_SETUP.md` for information about the permissions system
- See `IMAGE_UPLOAD_SETUP.md` for image upload configuration
- See `TRANSITIONAL_CUES_SETUP.md` for AI-generated transitional cues setup
