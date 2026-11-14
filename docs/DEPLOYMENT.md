# Campus Buddies - Deployment Guide

This guide provides step-by-step instructions for deploying the Campus Buddies application to Cloudflare Pages and Workers.

## Prerequisites

1. **Cloudflare Account** - You need a Cloudflare account
2. **Node.js** - Version 22.12.0 or higher
3. **npm or yarn** - For package management
4. **Wrangler CLI** - For Cloudflare Workers deployment
5. **Git** - For version control

## Architecture Overview

The Campus Buddies application consists of:

1. **Frontend**: React + TypeScript application hosted on Cloudflare Pages
2. **Backend**: Cloudflare Workers providing API endpoints
3. **Database**: Cloudflare D1 (SQLite) database
4. **Storage**: Cloudflare KV for sessions (optional)

## Step 1: Clone the Repository

```bash
git clone https://github.com/ifejiofor/integre-buddy-night-by-mistral-ai.git
cd integre-buddy-night-by-mistral-ai
```

## Step 2: Set Up Cloudflare Resources

### Create a Cloudflare Account

If you don't have one, sign up at [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)

### Install Wrangler CLI

```bash
npm install -D wrangler@latest
```

### Authenticate Wrangler

```bash
npx wrangler login
```

This will open a browser window for authentication.

## Step 3: Create Cloudflare Resources

### Create a D1 Database

```bash
npx wrangler d1 create campus-buddies-db
```

This will create a new D1 database. Note the database ID from the output.

### Create a Workers Application

```bash
npx wrangler init campus-buddies-backend
cd campus-buddies-backend
```

### Configure Wrangler

Edit `wrangler.toml` in the backend directory:

```toml
name = "campus-buddies-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "campus-buddies-db"
database_id = "YOUR_D1_DATABASE_ID"

[vars]
ENVIRONMENT = "production"
DEBUG = "false"
```

Replace `YOUR_D1_DATABASE_ID` with the actual database ID from the D1 creation step.

## Step 4: Initialize the Database

### Create the Database Schema

```bash
# From the backend directory
npx wrangler d1 execute campus-buddies-db --file=../database/schema.sql
```

This will create all the necessary tables in your D1 database.

## Step 5: Configure Push Notifications (Optional)

For push notifications to work, you need to generate VAPID keys:

```bash
# Generate VAPID keys
npx web-push generate-vapid-keys
```

This will output a public and private key. Store these securely.

### Configure VAPID Keys in Wrangler

Add the VAPID keys to your `wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
DEBUG = "false"
VAPID_PUBLIC_KEY = "YOUR_PUBLIC_KEY"
VAPID_PRIVATE_KEY = "YOUR_PRIVATE_KEY"
```

## Step 6: Deploy the Backend

### Install Dependencies

```bash
cd backend
npm ci
```

### Build the Backend

```bash
npm run build
```

### Deploy to Cloudflare

```bash
npm run deploy
```

This will deploy your Workers application to Cloudflare.

## Step 7: Deploy the Frontend

### Install Dependencies

```bash
cd frontend
npm ci
```

### Configure the Frontend

Edit `vite.config.ts` to set the correct API base URL:

```typescript
// For production
API_BASE_URL = 'https://YOUR_WORKERS_SUBDOMAIN.workers.dev';
```

### Build the Frontend

```bash
npm run build
```

### Deploy to Cloudflare Pages

1. Go to Cloudflare Dashboard
2. Navigate to Pages
3. Create a new project
4. Connect your GitHub repository
5. Select the `frontend` directory as the build directory
6. Set the build command to `npm run build`
7. Set the build output directory to `dist`
8. Deploy the project

## Step 8: Configure Scheduled Campaign Deletion

### Create a Cron Trigger

For automatic campaign deletion after 24 hours, you need to create a scheduled worker:

1. Create a new Worker for cleanup
2. Set up a cron trigger to run every hour
3. Use the following code:

```typescript
// cleanup.ts
import { D1Database } from '@cloudflare/workers-types/experimental';

export default {
  async scheduled(controller: ScheduledController, env: { DB: D1Database }, ctx: ExecutionContext): Promise<void> {
    const now = Date.now();
    
    // Get all expired campaigns
    const expiredCampaigns = await env.DB
      .prepare(`SELECT id FROM campaigns WHERE status = 'ACTIVE' AND expires_at < ?`)
      .bind(now)
      .all();
    
    // Delete each expired campaign and its data
    for (const campaign of expiredCampaigns.results) {
      try {
        await env.DB.exec(`BEGIN TRANSACTION`);
        
        // Delete matching snapshots
        await env.DB.prepare(`DELETE FROM matching_snapshots WHERE campaign_id = ?`).bind(campaign.id).run();
        
        // Delete match members
        await env.DB.prepare(`DELETE FROM match_members WHERE match_id IN (SELECT id FROM matches WHERE campaign_id = ?)`).bind(campaign.id).run();
        
        // Delete matches
        await env.DB.prepare(`DELETE FROM matches WHERE campaign_id = ?`).bind(campaign.id).run();
        
        // Delete matching rounds
        await env.DB.prepare(`DELETE FROM matching_rounds WHERE campaign_id = ?`).bind(campaign.id).run();
        
        // Delete push subscriptions
        await env.DB.prepare(`DELETE FROM push_subscriptions WHERE campaign_id = ?`).bind(campaign.id).run();
        
        // Delete result tokens
        await env.DB.prepare(`DELETE FROM result_tokens WHERE campaign_id = ?`).bind(campaign.id).run();
        
        // Delete admin sessions
        await env.DB.prepare(`DELETE FROM admin_sessions WHERE campaign_id = ?`).bind(campaign.id).run();
        
        // Delete students
        await env.DB.prepare(`DELETE FROM students WHERE campaign_id = ?`).bind(campaign.id).run();
        
        // Update campaign status
        await env.DB.prepare(`UPDATE campaigns SET status = 'EXPIRED' WHERE id = ?`).bind(campaign.id).run();
        
        await env.DB.exec(`COMMIT`);
        
        console.log(`Campaign ${campaign.id} expired and data deleted`);
      } catch (error) {
        await env.DB.exec(`ROLLBACK`);
        console.error(`Failed to delete campaign ${campaign.id}:`, error);
      }
    }
  }
};
```

### Configure Cron Trigger

In your `wrangler.toml` for the cleanup worker:

```toml
name = "campus-buddies-cleanup"
main = "src/cleanup.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "campus-buddies-db"
database_id = "YOUR_D1_DATABASE_ID"

[triggers]
crons = ["0 * * * *"]  # Run every hour
```

Deploy the cleanup worker:

```bash
cd cleanup
npm install
npm run deploy
```

## Step 9: Configure Custom Domain (Optional)

If you want to use a custom domain:

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select your application
4. Go to Settings > Triggers
5. Add a custom domain

## Step 10: Test the Application

1. Visit your Cloudflare Pages URL
2. Create a new campaign
3. Test the registration flow
4. Test the admin dashboard
5. Test the public display

## Environment Variables

The application uses the following environment variables:

### Backend (Workers)

| Variable | Description | Required |
|----------|-------------|----------|
| `ENVIRONMENT` | Deployment environment (production, development) | Yes |
| `DEBUG` | Enable debug logging | No |
| `VAPID_PUBLIC_KEY` | VAPID public key for push notifications | No |
| `VAPID_PRIVATE_KEY` | VAPID private key for push notifications | No |

### Frontend (Pages)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_PUSH_PUBLIC_KEY` | VAPID public key for push notifications | No |

## Troubleshooting

### Database Connection Issues

1. Verify your D1 database ID is correct
2. Check that your Wrangler configuration has the correct binding
3. Ensure the database exists in your Cloudflare account

### Deployment Failures

1. Check the Wrangler logs for errors
2. Verify all dependencies are installed
3. Ensure your Node.js version is compatible

### CORS Issues

1. Verify that your frontend is making requests to the correct backend URL
2. Check that CORS headers are being set in the backend responses

### Push Notification Issues

1. Verify that VAPID keys are configured correctly
2. Ensure the service worker is registered and working
3. Check browser console for errors

## Free Tier Limits

Cloudflare provides generous free tier limits:

- **Workers**: 100,000 requests/day
- **D1**: 5 GB storage, 100,000 reads/day, 1,000 writes/day
- **Pages**: 100 GB bandwidth/month, 1 GB storage

For most university events, these limits should be sufficient.

## Monitoring

### View Logs

```bash
# View backend logs
npx wrangler tail

# View cleanup worker logs
cd cleanup
npx wrangler tail
```

### View Metrics

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Select your application
4. Go to Metrics tab

## Backup and Restore

### Backup Database

```bash
# Export database data
npx wrangler d1 execute campus-buddies-db --command="SELECT * FROM campaigns" > campaigns.json
```

### Restore Database

```bash
# Import database data
npx wrangler d1 execute campus-buddies-db --file=backup.sql
```

## Migration to Another Provider

The application is designed to be portable. To migrate to another provider:

1. **Export Database**: Use the D1 CLI to export all data
2. **Convert Schema**: Convert the SQLite schema to your target database format
3. **Update Backend**: Modify the database connection code for your target provider
4. **Update Frontend**: Update API endpoints if necessary
5. **Deploy**: Deploy to your new provider

## Security Considerations

1. **Secret Codes**: Always use strong secret codes for campaigns
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Consider implementing rate limiting for API endpoints
4. **Input Validation**: All user input is validated on the backend
5. **Authentication**: Admin sessions are protected with tokens

## Support

For issues or questions:

1. Check the GitHub repository issues
2. Review the documentation
3. Check Cloudflare's documentation for Workers and D1

## License

This application is provided as-is for educational purposes. See the LICENSE file for details.
