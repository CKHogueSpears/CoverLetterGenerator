# Deployment Guide

## Environment Setup

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Session
SESSION_SECRET=your-random-session-secret
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Set up database:
```bash
npm run db:push
```

3. Start development server:
```bash
npm run dev
```

## Production Deployment

### Option 1: Replit Deployment
1. Import project to Replit
2. Set environment variables in Secrets
3. Deploy using Replit's deployment feature

### Option 2: Cloud Platform (Vercel, Railway, etc.)
1. Connect repository to platform
2. Set environment variables
3. Configure build commands:
   - Build: `npm run build`
   - Start: `npm start`

### Option 3: Self-hosted
1. Clone repository on server
2. Install Node.js 20+
3. Set environment variables
4. Install dependencies: `npm install`
5. Build application: `npm run build`
6. Start with process manager: `pm2 start dist/index.js`

## Database Migration

The application uses Drizzle ORM with push-based migrations:

```bash
npm run db:push
```

This will automatically sync your schema with the database.

## Health Checks

- Application health: `GET /`
- Database status: Check if API endpoints return 200

## Performance Considerations

- Enable caching with Redis for production
- Use CDN for static assets
- Set up database connection pooling
- Monitor AI API usage and costs

## Security

- Use HTTPS in production
- Set secure session cookies
- Validate all user inputs
- Rate limit API endpoints
- Regularly update dependencies