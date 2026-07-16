# Yoga Sequence Builder

Note: This README file was automatically generated and may contain inaccuracies.

A web application for building and managing yoga sequences with pose libraries, variations, and class scheduling.

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Yarn package manager
- A [Turso](https://turso.tech) database

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

2. Edit `.env.local` and add your Turso credentials (see `TURSO_SETUP.md` for full instructions):
   - `TURSO_DATABASE_URL` — Turso database URL
   - `TURSO_AUTH_TOKEN` — Turso auth token
   - `JWT_SECRET` — Secret for signing auth tokens

For local development without Turso cloud, you can use `TURSO_DATABASE_URL=file:local.db`.

### Database Setup

Run the Turso schema:

```bash
turso db shell sculpt-sequences < sql/turso-schema.sql
# Or locally:
sqlite3 local.db < sql/turso-schema.sql
```

### Running the Development Server

Start both the API server and frontend:

```bash
# Terminal 1: API server
yarn dev:api

# Terminal 2: Frontend
yarn dev
```

The application will be available at `http://localhost:3000`.

## Additional Resources

- See `TURSO_SETUP.md` for detailed Turso setup and deployment
- See `PERMISSIONS_SETUP.md` for information about the permissions system
- See `TRANSITIONAL_CUES_SETUP.md` for AI-generated transitional cues setup
