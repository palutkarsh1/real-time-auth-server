# Vercel Deployment Guide

This guide explains how to deploy the backend server to Vercel with SQLite database.

## ⚠️ Important Limitations

**SQLite on Vercel has significant limitations:**

1. **Ephemeral Storage**: The `/tmp` directory is cleared between serverless function invocations
2. **No Persistence**: Data will be lost when:
   - The function goes cold (after inactivity)
   - Vercel redeploys your application
   - The serverless function restarts

**For production applications, consider:**
- **Turso** (SQLite-compatible cloud database)
- **Vercel Postgres** (managed PostgreSQL)
- **PlanetScale** (MySQL-compatible)
- **Supabase** (PostgreSQL)

## Prerequisites

1. Vercel account (sign up at [vercel.com](https://vercel.com))
2. Vercel CLI installed: `npm i -g vercel`

## Deployment Steps

### 1. Install Dependencies

```bash
cd real-time-auth-server
npm install
```

### 2. Set Environment Variables

In your Vercel project dashboard or via CLI:

```bash
vercel env add CLIENT_URL
# Enter your frontend URL (e.g., https://your-frontend.vercel.app)
```

Or set them in Vercel Dashboard:
- Go to your project → Settings → Environment Variables
- Add:
  - `CLIENT_URL`: Your frontend URL (e.g., `https://your-frontend.vercel.app`)
  - `PORT`: (Optional, not needed on Vercel)

### 3. Deploy to Vercel

**Option A: Using Vercel CLI**

```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

**Option B: Using GitHub Integration**

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure:
   - Framework Preset: Other
   - Root Directory: `real-time-auth-server`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
5. Add environment variables
6. Deploy

### 4. Update Frontend Configuration

After deployment, update your frontend `.env`:

```env
VITE_API_URL=https://your-backend.vercel.app
```

## Project Structure

```
real-time-auth-server/
├── api/
│   └── index.js          # Vercel serverless function entry point
├── db.js                 # SQLite database setup (uses /tmp on Vercel)
├── index.js              # Express app (works locally and on Vercel)
├── vercel.json           # Vercel configuration
└── package.json
```

## How It Works

1. **Local Development**: 
   - `index.js` runs as a standard Express server
   - Database stored in `database.sqlite` in project directory

2. **Vercel Deployment**:
   - `api/index.js` wraps the Express app as a serverless function
   - Database stored in `/tmp/database.sqlite` (ephemeral)
   - All routes are handled by the single serverless function

## Testing Locally with Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Run Vercel dev server (simulates Vercel environment)
vercel dev
```

## Troubleshooting

### Database Not Persisting

This is expected behavior. SQLite on Vercel is ephemeral. Consider migrating to:
- Turso (recommended for SQLite compatibility)
- Vercel Postgres
- Other cloud databases

### CORS Errors

Ensure `CLIENT_URL` environment variable matches your frontend URL exactly (including protocol and port if applicable).

### Function Timeout

Vercel has execution time limits:
- Hobby: 10 seconds
- Pro: 60 seconds

If you hit timeouts, optimize database queries or consider upgrading.

## Migration to Turso (Recommended)

For persistent SQLite on Vercel, use Turso:

1. Sign up at [turso.tech](https://turso.tech)
2. Create a database
3. Install Turso client: `npm install @libsql/client`
4. Update `db.js` to use Turso instead of SQLite3

Example:
```javascript
const { createClient } = require('@libsql/client');
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});
```

## Support

For issues:
- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
