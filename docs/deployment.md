# Deployment Guide

This guide covers deploying the web app, mobile app, and backend to production.

## Table of Contents

- [Overview](#overview)
- [Convex Backend](#convex-backend)
- [Web App (Vercel)](#web-app-vercel)
- [Mobile App (App Stores)](#mobile-app-app-stores)
- [Environment Variables](#environment-variables)
- [CI/CD](#cicd)

## Overview

### Deployment Architecture

```
┌──────────────┐
│   Vercel     │  ← Next.js Web App
│  (Edge CDN)  │
└──────┬───────┘
       │
       ├──────────────────┬───────────────┐
       │                  │               │
┌──────▼──────┐    ┌─────▼─────┐   ┌─────▼──────┐
│   Convex    │    │   Clerk   │   │  OpenAI    │
│  (Backend)  │    │   (Auth)  │   │  (AI API)  │
└─────────────┘    └───────────┘   └────────────┘

Mobile Apps
├── iOS (App Store)
└── Android (Play Store)
```

## Convex Backend

### 1. Create Production Project

```bash
cd packages/backend
npx convex deploy
```

This will:

1. Prompt you to create a production project
2. Deploy your schema and functions
3. Generate a production URL

### 2. Configure Environment Variables

In [Convex Dashboard](https://dashboard.convex.dev):

1. Go to **Settings** → **Environment Variables**
2. Add production variables:

```
CLERK_ISSUER_URL=https://your-production-clerk-domain.clerk.accounts.dev
OPENAI_API_KEY=sk-... (optional)
```

### 3. Production Deployment URL

Your production URL will be:

```
https://your-project-name.convex.cloud
```

Save this for frontend configuration.

### 4. Monitoring

Monitor your backend:

- **Dashboard**: https://dashboard.convex.dev
- **Logs**: Real-time function logs
- **Usage**: Track storage, bandwidth, function calls
- **Performance**: Function execution times

---

## Web App (Vercel)

### Prerequisites

- Vercel account
- GitHub repository connected
- Convex production deployment

### 1. Configure Vercel

The project includes `vercel.json`:

```json
{
  "buildCommand": "cd ../../packages/backend && npx convex deploy --cmd 'cd ../../apps/web && turbo run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

This ensures Convex deploys before building the web app.

### 2. Connect to Vercel

**Option A: Via Vercel Dashboard**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **New Project**
3. Import your GitHub repository
4. Set **Root Directory** to `apps/web`
5. Configure environment variables (see below)
6. Click **Deploy**

**Option B: Via CLI**

```bash
cd apps/web
npm install -g vercel
vercel login
vercel
```

### 3. Environment Variables

In Vercel project settings:

```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

### 4. Custom Domain (Optional)

1. In Vercel Dashboard → **Domains**
2. Add your custom domain
3. Configure DNS:

   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### 5. Deployment Workflow

**Automatic Deployments:**

- Push to `main` → Production deployment
- Push to other branches → Preview deployments

**Manual Deployment:**

```bash
cd apps/web
vercel --prod
```

### 6. Monitoring

- **Analytics**: Vercel Dashboard
- **Logs**: Vercel Functions logs
- **Speed Insights**: Enable in Vercel Dashboard

---

## Mobile App (App Stores)

### iOS (App Store)

#### Prerequisites

- Apple Developer Account ($99/year)
- Mac with Xcode installed
- Valid iOS distribution certificate

#### 1. Configure App

Update `apps/native/app.json`:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "buildNumber": "1",
      "supportsTablet": true
    }
  }
}
```

#### 2. Build for iOS

```bash
cd apps/native

# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure
eas build:configure

# Build
eas build --platform ios
```

#### 3. Submit to App Store

```bash
eas submit --platform ios
```

Or manually:

1. Download `.ipa` from EAS Dashboard
2. Open App Store Connect
3. Create new app
4. Upload build via Xcode or Transporter
5. Fill out app information
6. Submit for review

#### 4. TestFlight (Beta Testing)

```bash
eas build --platform ios --profile preview
eas submit --platform ios --latest
```

Then invite testers via App Store Connect.

---

### Android (Play Store)

#### Prerequisites

- Google Play Developer Account ($25 one-time)
- Valid signing key

#### 1. Configure App

Update `apps/native/app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.yourapp",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

#### 2. Build for Android

```bash
cd apps/native

# Build
eas build --platform android

# For AAB (recommended)
eas build --platform android --profile production
```

#### 3. Submit to Play Store

```bash
eas submit --platform android
```

Or manually:

1. Download `.aab` from EAS Dashboard
2. Open Google Play Console
3. Create new app
4. Upload build to Internal Testing
5. Progress through testing tracks
6. Submit for review

#### 4. Internal Testing

Before production:

1. Upload to **Internal Testing** track
2. Add test users
3. Test thoroughly
4. Promote to **Alpha** → **Beta** → **Production**

---

## Environment Variables

### Development

**Web** (`.env.local`):

```env
NEXT_PUBLIC_CONVEX_URL=https://dev-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Native** (`.env.local`):

```env
EXPO_PUBLIC_CONVEX_URL=https://dev-project.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Production

**Web** (Vercel):

```env
NEXT_PUBLIC_CONVEX_URL=https://prod-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Native** (EAS):

```bash
# Set in eas.json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_CONVEX_URL": "https://prod-project.convex.cloud",
        "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_live_..."
      }
    }
  }
}
```

**Backend** (Convex):

```env
CLERK_ISSUER_URL=https://your-prod-domain.clerk.accounts.dev
OPENAI_API_KEY=sk-...
```

---

## CI/CD

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: yarn install
      - run: cd packages/backend && npx convex deploy --prod
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

  deploy-web:
    needs: deploy-backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Required Secrets

In GitHub repository settings, add:

- `CONVEX_DEPLOY_KEY`: From Convex Dashboard → Settings → Deploy Keys
- `VERCEL_TOKEN`: From Vercel Dashboard → Settings → Tokens

---

## Rollback Strategy

### Web App

```bash
# Vercel automatic rollback
vercel rollback <deployment-url>

# Or redeploy previous commit
git revert HEAD
git push
```

### Backend

```bash
# Convex doesn't support rollback
# Deploy previous version manually
git checkout previous-commit
cd packages/backend
npx convex deploy --prod
```

### Mobile Apps

- iOS: Release previous build from App Store Connect
- Android: Roll back release in Play Console

---

## Health Checks

### After Deployment

1. **Web App**

   - [ ] Site loads correctly
   - [ ] Authentication works
   - [ ] Notes CRUD operations work
   - [ ] Real-time updates work
   - [ ] No console errors

2. **Backend**

   - [ ] All functions deployed
   - [ ] Environment variables set
   - [ ] Auth configuration correct
   - [ ] Database queries working

3. **Mobile Apps**
   - [ ] App launches
   - [ ] Authentication works
   - [ ] Notes sync with web
   - [ ] No crashes reported

---

## Monitoring & Alerts

### Vercel

- Enable **Speed Insights**
- Set up **Error Reporting**
- Configure **Deployment Notifications**

### Convex

- Monitor function execution times
- Watch error rates
- Track storage usage

### Mobile

- Use Expo **Error Reporting**
- Enable **Crash Analytics**
- Monitor app store ratings

---

## Performance Optimization

### Web

- Enable Vercel Edge Caching
- Optimize images (next/image)
- Enable compression
- Use ISR for static pages

### Mobile

- Enable Hermes engine
- Optimize bundle size
- Use ProGuard (Android)
- Enable BitCode (iOS)

### Backend

- Use proper indexes
- Cache frequently accessed data
- Optimize query patterns
- Monitor function performance

---

## Security Checklist

Before production:

- [ ] All secrets in environment variables
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Clerk production keys configured
- [ ] Rate limiting considered
- [ ] Input validation in place
- [ ] Authorization checks in all mutations
- [ ] No sensitive data in logs

---

## Cost Estimation

### Convex

- Free tier: 1 million function calls/month
- After free tier: Pay as you go

### Vercel

- Hobby: Free (personal projects)
- Pro: $20/month (commercial)

### Clerk

- Free tier: 10,000 MAU
- Pro: $25/month + usage

### Mobile

- Apple Developer: $99/year
- Google Play: $25 one-time

### OpenAI (Optional)

- Pay per API call
- Estimate: ~$0.002 per summarization

---

## Troubleshooting

### Web App Not Building

```bash
# Check Vercel logs
vercel logs <deployment-url>

# Test locally
cd apps/web
yarn build
```

### Convex Deployment Fails

```bash
# Check deployment status
cd packages/backend
npx convex deploy status

# View logs
npx convex logs
```

### Mobile Build Fails

```bash
# Check EAS build logs
eas build:list

# View specific build
eas build:view <build-id>
```

---

## Related Documentation

- [Getting Started](./getting-started.md)
- [Development Guide](./development.md)
- [Architecture](./architecture.md)
- [Vercel Docs](https://vercel.com/docs)
- [Expo EAS](https://docs.expo.dev/eas/)
- [Convex Production](https://docs.convex.dev/production)
