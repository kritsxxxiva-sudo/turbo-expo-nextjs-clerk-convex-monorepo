# 🚀 Production Deployment Guide

## Overview

This guide walks you through deploying your enterprise social media management platform to production. The platform consists of multiple components that need to be deployed and configured properly.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web App       │    │   Mobile App    │    │   Backend       │
│   (Next.js)     │    │   (React Native)│    │   (Convex)      │
│   Vercel/Netlify│    │   App Stores    │    │   Convex Cloud  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────┬─────┴─────┬─────────────────┐
         │                 │           │                 │
    ┌────▼────┐      ┌────▼────┐ ┌────▼────┐      ┌────▼────┐
    │  Clerk  │      │ Stripe  │ │Ayrshare │      │   CDN   │
    │  Auth   │      │Payments │ │ Social  │      │ Assets  │
    └─────────┘      └─────────┘ └─────────┘      └─────────┘
```

## Phase 1: Environment Setup

### 1.1 Production Environment Variables

Create production environment files:

**apps/web/.env.production**

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-production-convex.convex.cloud
CONVEX_DEPLOY_KEY=your_production_convex_deploy_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_clerk_key
CLERK_SECRET_KEY=sk_live_your_production_clerk_secret
CLERK_WEBHOOK_SECRET=whsec_your_production_webhook_secret

# Stripe Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_stripe_key
STRIPE_SECRET_KEY=sk_live_your_production_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_production_stripe_webhook

# Ayrshare Social Media
AYRSHARE_API_KEY=your_production_ayrshare_key
AYRSHARE_WEBHOOK_SECRET=your_production_ayrshare_webhook

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
APP_VERSION=1.0.0
NODE_ENV=production

# Security
NEXTAUTH_SECRET=your_super_secure_secret_key
ENCRYPTION_KEY=your_32_character_encryption_key

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key
```

**apps/native/.env.production**

```env
# Expo
EXPO_PUBLIC_CONVEX_URL=https://your-production-convex.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_production_clerk_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_stripe_key
EXPO_PUBLIC_APP_URL=https://your-domain.com

# App Store Configuration
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_BUILD_NUMBER=1
```

### 1.2 Domain and SSL Setup

1. **Purchase Domain**

   ```bash
   # Example domains
   yourbrand.com
   app.yourbrand.com
   api.yourbrand.com
   ```

2. **SSL Certificates**
   - Most hosting providers (Vercel, Netlify) provide automatic SSL
   - For custom domains, ensure SSL is properly configured

### 1.3 Third-Party Service Configuration

#### Clerk Authentication

```bash
# 1. Create production Clerk application
# 2. Configure production domains
# 3. Set up social login providers (Google, Facebook, etc.)
# 4. Configure webhook endpoints:
#    - https://your-domain.com/api/webhooks/clerk
```

#### Stripe Payments

```bash
# 1. Activate Stripe live mode
# 2. Create production products and prices
# 3. Configure webhook endpoints:
#    - https://your-domain.com/api/webhooks/stripe
# 4. Set up payment methods (cards, Apple Pay, Google Pay)
```

#### Ayrshare Social Media

```bash
# 1. Upgrade to production Ayrshare plan
# 2. Configure webhook endpoints:
#    - https://your-domain.com/api/webhooks/ayrshare
# 3. Set up social media app credentials for each platform
```

## Phase 2: Backend Deployment

### 2.1 Convex Backend Deployment

```bash
# 1. Install Convex CLI
npm install -g convex

# 2. Login to Convex
npx convex login

# 3. Create production deployment
npx convex deploy --prod

# 4. Configure production environment variables in Convex dashboard
# 5. Run database migrations if needed
npx convex run migrations:runAll --prod
```

### 2.2 Database Setup

```bash
# 1. Verify schema deployment
npx convex run deployment:validateDeployment --prod \
  --version "1.0.0" \
  --environment "production"

# 2. Seed initial data (if needed)
npx convex run testing:createTestData --prod \
  --template "production" \
  --count 0  # No test data in production

# 3. Verify health checks
curl https://your-convex-deployment.convex.cloud/api/health
```

## Phase 3: Frontend Deployment

### 3.1 Web Application (Next.js)

#### Option A: Vercel Deployment

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy to production
cd apps/web
vercel --prod

# 4. Configure environment variables in Vercel dashboard
# 5. Set up custom domain
vercel domains add your-domain.com
```

#### Option B: Netlify Deployment

```bash
# 1. Build the application
cd apps/web
npm run build

# 2. Deploy to Netlify
# - Connect GitHub repository
# - Set build command: npm run build
# - Set publish directory: .next
# - Configure environment variables
```

#### Option C: Docker Deployment

```dockerfile
# Dockerfile for web app
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

### 3.2 Mobile Application (React Native)

#### iOS Deployment

```bash
# 1. Configure app.json for production
{
  "expo": {
    "name": "Your Social Media Manager",
    "slug": "your-social-media-manager",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.yourbrand.socialmedia",
      "buildNumber": "1",
      "supportsTablet": true
    }
  }
}

# 2. Build for iOS
cd apps/native
eas build --platform ios --profile production

# 3. Submit to App Store
eas submit --platform ios
```

#### Android Deployment

```bash
# 1. Configure Android settings
"android": {
  "package": "com.yourbrand.socialmedia",
  "versionCode": 1,
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#FFFFFF"
  }
}

# 2. Build for Android
eas build --platform android --profile production

# 3. Submit to Google Play
eas submit --platform android
```

## Phase 4: Infrastructure Setup

### 4.1 CDN Configuration

```bash
# Configure CDN for static assets
# - Images, videos, documents
# - Use Cloudflare, AWS CloudFront, or similar
# - Set up proper caching headers
```

### 4.2 Monitoring and Logging

#### Application Monitoring

```bash
# 1. Set up Sentry for error tracking
npm install @sentry/nextjs @sentry/react-native

# 2. Configure Sentry
# apps/web/sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

#### Performance Monitoring

```bash
# 1. Set up DataDog or New Relic
# 2. Configure custom metrics
# 3. Set up alerts for:
#    - Response time > 500ms
#    - Error rate > 1%
#    - Database query time > 200ms
```

### 4.3 Security Configuration

```bash
# 1. Configure security headers
# apps/web/next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

# 2. Set up rate limiting
# 3. Configure CORS properly
# 4. Enable audit logging
```

## Phase 5: Testing and Validation

### 5.1 Production Health Checks

```bash
# 1. Test all health check endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/health?type=detailed
curl https://your-domain.com/api/health?type=readiness
curl https://your-domain.com/api/health?type=liveness

# 2. Validate deployment
curl -X POST https://your-domain.com/api/health/validate \
  -H "Content-Type: application/json" \
  -d '{"version": "1.0.0", "environment": "production"}'
```

### 5.2 End-to-End Testing

```bash
# 1. Test user registration and login
# 2. Test payment processing
# 3. Test social media posting
# 4. Test webhook processing
# 5. Test mobile app functionality
```

### 5.3 Performance Testing

```bash
# 1. Load testing with Artillery or k6
npm install -g artillery

# 2. Create load test script
# artillery-config.yml
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/health"

# 3. Run load tests
artillery run artillery-config.yml
```

## Phase 6: Launch Strategy

### 6.1 Soft Launch (Beta)

```bash
# 1. Deploy to staging environment first
# 2. Invite beta users (50-100 users)
# 3. Monitor performance and gather feedback
# 4. Fix any issues found
```

### 6.2 Production Launch

```bash
# 1. Announce launch date
# 2. Prepare marketing materials
# 3. Set up customer support
# 4. Monitor systems closely during launch
# 5. Have rollback plan ready
```

### 6.3 Post-Launch Monitoring

```bash
# 1. Monitor key metrics:
#    - User registrations
#    - Payment conversions
#    - Social media posts
#    - System performance
#    - Error rates

# 2. Set up alerts for:
#    - High error rates
#    - Slow response times
#    - Payment failures
#    - Webhook failures
```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**

   ```bash
   # Check environment variable configuration
   # Verify secrets are properly set
   # Check for typos in variable names
   ```

2. **Webhook Failures**

   ```bash
   # Verify webhook URLs are accessible
   # Check webhook signatures
   # Monitor webhook logs
   ```

3. **Database Connection Issues**

   ```bash
   # Check Convex deployment status
   # Verify API keys and permissions
   # Monitor database performance
   ```

4. **Payment Processing Errors**
   ```bash
   # Verify Stripe live mode configuration
   # Check webhook endpoints
   # Monitor payment logs
   ```

## Security Checklist

- [ ] All environment variables secured
- [ ] SSL certificates configured
- [ ] Security headers implemented
- [ ] Rate limiting enabled
- [ ] Audit logging configured
- [ ] Webhook signatures verified
- [ ] Database access restricted
- [ ] API endpoints protected
- [ ] User data encrypted
- [ ] Regular security audits scheduled

## Performance Checklist

- [ ] CDN configured for static assets
- [ ] Database queries optimized
- [ ] Caching implemented
- [ ] Image optimization enabled
- [ ] Code splitting configured
- [ ] Bundle size optimized
- [ ] Performance monitoring set up
- [ ] Load testing completed

## Compliance Checklist

- [ ] GDPR compliance implemented
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Data retention policies set
- [ ] User consent mechanisms
- [ ] Data export functionality
- [ ] Data deletion functionality
- [ ] Audit trails maintained

## Support and Maintenance

### 6.4 Ongoing Maintenance

```bash
# 1. Regular updates
npm update  # Update dependencies monthly
npx convex run deployment:validateDeployment  # Weekly health checks

# 2. Security patches
# Monitor security advisories
# Apply patches promptly
# Test thoroughly before deployment

# 3. Performance optimization
# Monitor performance metrics
# Optimize slow queries
# Update caching strategies

# 4. Feature updates
# Plan feature releases
# Test in staging first
# Use feature flags for gradual rollout
```

This deployment guide ensures your social media management platform launches successfully and operates reliably in production. Follow each phase carefully and monitor all systems closely during and after launch.
