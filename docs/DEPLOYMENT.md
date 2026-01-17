# Deployment Guide

This guide provides detailed instructions for deploying the Narrative Vaults application to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Frontend Deployment](#frontend-deployment)
  - [Vercel](#vercel-recommended)
  - [Netlify](#netlify)
- [Backend Deployment](#backend-deployment)
  - [Railway](#railway-recommended)
  - [Render](#render)
  - [Docker](#docker)
- [Database Setup](#database-setup)
  - [Supabase](#supabase-recommended)
  - [Neon](#neon)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- **GitHub account** with repository access
- **Vercel account** (for frontend)
- **Railway/Render account** (for backend)
- **Supabase/Neon account** (for database)
- **Environment variables** properly configured
- **API keys** for:
  - Hyperliquid/HyperEVM
  - Pear Protocol
  - Salt Protocol

---

## Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend/` directory based on `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=production

# Blockchain
HYPEREVM_RPC_URL=https://rpc.hyperliquid.xyz
BACKEND_WALLET_PRIVATE_KEY=your_private_key

# Salt Protocol
SALT_FACTORY_ADDRESS=0x...
ADMIN_ADDRESS=0x...

# Pear Protocol
PEAR_API_BASE_URL=https://api.pear.garden
PEAR_CLIENT_ID=your_client_id
PEAR_API_KEY=your_api_key
PEAR_EXECUTION_CONTRACT_ADDRESS=0x...

# Token Addresses
USDC_CONTRACT_ADDRESS=0x...

# Security
JWT_SECRET=your_jwt_secret
RATE_LIMIT_RPM=100

# Logging
LOG_LEVEL=info
```

### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_HYPERLIQUID_CHAIN_ID=421614
```

---

## Frontend Deployment

### Vercel (Recommended)

#### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Deploy from Frontend Directory

```bash
cd frontend
vercel
```

#### Step 4: Configure Environment Variables

1. Go to your project on Vercel Dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add all variables from `.env.local`
4. Redeploy: `vercel --prod`

#### Step 5: Set Up Custom Domain (Optional)

1. Go to **Settings** > **Domains**
2. Add your custom domain
3. Configure DNS records as instructed

### Netlify

#### Step 1: Connect Repository

1. Log in to [Netlify](https://netlify.com)
2. Click **New site from Git**
3. Select GitHub and your repository

#### Step 2: Configure Build Settings

- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `.next`

#### Step 3: Add Environment Variables

1. Navigate to **Site settings** > **Environment variables**
2. Add all variables from `.env.local`

---

## Backend Deployment

### Railway (Recommended)

#### Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
```

#### Step 2: Login to Railway

```bash
railway login
```

#### Step 3: Initialize Project

```bash
cd backend
railway init
```

#### Step 4: Add Environment Variables

```bash
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="redis://..."
# Add all other environment variables
```

#### Step 5: Deploy

```bash
railway up
```

#### Step 6: Get Your Deployment URL

```bash
railway domain
```

### Render

#### Step 1: Create New Web Service

1. Log in to [Render](https://render.com)
2. Click **New** > **Web Service**
3. Connect your GitHub repository

#### Step 2: Configure Service

- **Name**: narrative-vaults-backend
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`

#### Step 3: Add Environment Variables

1. Scroll to **Environment Variables**
2. Add all variables from `.env.example`

#### Step 4: Deploy

Click **Create Web Service**

### Docker

#### Step 1: Build Docker Image

```bash
cd backend
docker build -t narrative-vaults-backend .
```

#### Step 2: Run Container

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  narrative-vaults-backend
```

#### Step 3: Deploy to Cloud Provider

**For AWS ECS:**
```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag narrative-vaults-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/narrative-vaults-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/narrative-vaults-backend:latest
```

---

## Database Setup

### Supabase (Recommended)

#### Step 1: Create Project

1. Log in to [Supabase](https://supabase.com)
2. Click **New Project**
3. Choose a region close to your backend

#### Step 2: Get Connection String

1. Go to **Settings** > **Database**
2. Copy the **Connection string**
3. Update `DATABASE_URL` in your backend environment

#### Step 3: Run Migrations

```bash
cd backend
npm run prisma:migrate:deploy
```

### Neon

#### Step 1: Create Database

1. Log in to [Neon](https://neon.tech)
2. Create a new project
3. Select a region

#### Step 2: Configure Connection

1. Copy the connection string
2. Update `DATABASE_URL` in environment variables

#### Step 3: Apply Schema

```bash
cd backend
npx prisma db push
```

---

## Post-Deployment

### 1. Verify Deployment

**Frontend:**
```bash
curl https://your-frontend-url.vercel.app
```

**Backend:**
```bash
curl https://your-backend-url.railway.app/api/health
```

### 2. Test API Endpoints

```bash
# Get narratives
curl https://your-backend-url/api/narratives

# Health check
curl https://your-backend-url/api/health
```

### 3. Configure CORS

Update backend to allow your frontend domain:

```typescript
// backend/src/main.ts
app.enableCors({
  origin: ['https://your-frontend-url.vercel.app'],
  credentials: true,
});
```

### 4. Set Up SSL/TLS

Both Vercel and Railway provide automatic SSL certificates.

### 5. Configure DNS

Point your custom domain to:
- **Frontend**: Vercel's nameservers
- **Backend**: Railway/Render domain

---

## Monitoring

### Application Monitoring

**Recommended Tools:**
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Datadog** - APM

### Database Monitoring

**Supabase:**
- Navigate to **Database** > **Metrics**
- Monitor query performance

**Neon:**
- Check **Monitoring** dashboard
- Set up alerts

### Uptime Monitoring

**Recommended:**
- **UptimeRobot** - Free tier available
- **Pingdom**
- **StatusCake**

---

## Troubleshooting

### Frontend Issues

**Build Failures:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

**Environment Variables Not Loading:**
- Ensure variables are prefixed with `NEXT_PUBLIC_`
- Restart the Vercel build

### Backend Issues

**Database Connection Errors:**
```bash
# Test database connection
npx prisma db pull
```

**Port Already in Use:**
```bash
# Change PORT in environment variables
PORT=3002
```

**Migration Failures:**
```bash
# Reset database (development only)
npx prisma migrate reset

# Deploy migrations (production)
npx prisma migrate deploy
```

### Common Errors

**CORS Errors:**
- Verify frontend URL is in backend CORS whitelist
- Check for trailing slashes in URLs

**Authentication Failures:**
- Verify JWT_SECRET is set correctly
- Check wallet signatures

---

## CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Frontend
        run: |
          cd frontend
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy Backend
        run: |
          cd backend
          railway up --token=${{ secrets.RAILWAY_TOKEN }}
```

---

## Security Checklist

- [ ] All environment variables are set
- [ ] API keys are secured
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] SSL/TLS certificates are active
- [ ] Database has restricted access
- [ ] Backups are configured
- [ ] Monitoring is set up
- [ ] Logs are being collected
- [ ] Error tracking is enabled

---

## Support

For deployment issues:
- **Documentation**: [docs/](../)
- **GitHub Issues**: [github.com/MasteraSnackin/Narrative-Vaults/issues](https://github.com/MasteraSnackin/Narrative-Vaults/issues)
- **Discord**: [Join our community](https://discord.gg/narrativevaults)

---

**Last Updated**: January 2025
