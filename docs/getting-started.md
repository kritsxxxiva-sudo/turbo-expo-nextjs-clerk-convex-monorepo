# Getting Started

This guide will help you set up the development environment and run the project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or later
- **Yarn**: v1.22.x or later (install with `npm install --global yarn`)
- **Git**: Latest version
- **Expo CLI** (optional): For mobile development
- **A code editor**: VS Code, Cursor, or similar

### Accounts Required

You'll need accounts for the following services:

- [Convex](https://convex.dev) (free tier available)
- [Clerk](https://clerk.com) (free tier available)
- [OpenAI](https://openai.com) (optional, for AI features)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd turbo-expo-nextjs-clerk-convex-monorepo
```

### 2. Install Dependencies

```bash
yarn install
```

This will install dependencies for all workspaces (web, native, backend).

### 3. Configure Convex

#### a. Setup Convex Project

```bash
npm run setup --workspace packages/backend
```

This command will:

- Log you into Convex (or prompt signup)
- Create a new Convex project
- Wait for environment variables to be configured

#### b. Configure Clerk in Convex

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application (or use existing)
3. Navigate to **JWT Templates** → **Convex** template
4. Copy the `Issuer URL`
5. Go to [Convex Dashboard](https://dashboard.convex.dev)
6. Navigate to **Settings** → **Environment Variables**
7. Add: `CLERK_ISSUER_URL` with the copied value

#### c. Enable Social Connections in Clerk

1. In Clerk Dashboard, go to **User & Authentication** → **Social Connections**
2. Enable **Google** and **Apple** (required for mobile app)
3. Configure OAuth credentials for each provider

#### d. (Optional) Add OpenAI API Key

1. Get API key from [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. In Convex Dashboard, add environment variable:
   - Key: `OPENAI_API_KEY`
   - Value: Your OpenAI API key

The Convex setup command should now complete successfully.

### 4. Configure Web App

```bash
cd apps/web
cp .example.env .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=<from packages/backend/.env.local>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>
CLERK_SECRET_KEY=<from Clerk dashboard>
```

**Where to find values:**

- `NEXT_PUBLIC_CONVEX_URL`: In `packages/backend/.env.local` after setup
- Clerk keys: [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)

### 5. Configure Native App

```bash
cd apps/native
cp .example.env .env.local
```

Edit `.env.local`:

```env
EXPO_PUBLIC_CONVEX_URL=<from packages/backend/.env.local>
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk dashboard>
```

## Running the Project

### Run Everything

From the root directory:

```bash
npm run dev
```

This starts:

- Convex backend (dev server)
- Web app (http://localhost:3000)
- Native app (Expo dev server)

**Navigation**: Use ⬆ and ⬇ arrow keys to switch between logs.

### Run Individual Apps

#### Web App Only

```bash
cd apps/web
yarn dev
```

Access at: http://localhost:3000

#### Native App Only

```bash
cd apps/native
yarn start
```

Options:

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on physical device

#### Backend Only

```bash
cd packages/backend
npx convex dev
```

## Verify Installation

### 1. Check Web App

1. Open http://localhost:3000
2. You should see the landing page
3. Click "Sign In" → Complete auth flow
4. Navigate to Notes Dashboard
5. Create a test note

### 2. Check Native App

1. Start Expo dev server
2. Open in simulator/device
3. Sign in (use same account as web)
4. Navigate to notes
5. Verify notes from web app appear

### 3. Check Real-time Sync

1. Open web app and native app side-by-side
2. Create a note in web app
3. Verify it appears in native app (real-time)
4. Edit in native app
5. Verify changes in web app

## Project Structure

```
.
├── apps/
│   ├── web/              # Next.js web application
│   │   ├── src/
│   │   │   ├── app/      # Next.js App Router pages
│   │   │   └── components/ # React components
│   │   └── public/       # Static assets
│   └── native/           # React Native mobile app
│       ├── src/
│       │   ├── screens/  # App screens
│       │   └── navigation/ # Navigation setup
│       └── assets/       # Mobile assets
├── packages/
│   └── backend/          # Convex backend
│       └── convex/
│           ├── schema.ts # Database schema
│           ├── notes.ts  # Notes functions
│           └── auth.config.js # Auth config
├── turbo.json            # Turborepo config
└── package.json          # Root package.json
```

## Development Workflow

### 1. Make Changes

- **Backend**: Edit files in `packages/backend/convex/`
- **Web**: Edit files in `apps/web/src/`
- **Native**: Edit files in `apps/native/src/`

### 2. Hot Reload

All three environments support hot reloading:

- **Convex**: Functions reload automatically
- **Web**: Next.js hot reloads components
- **Native**: Expo hot reloads on file save

### 3. View Logs

- **Convex logs**: Convex dashboard or terminal
- **Web logs**: Browser console or terminal
- **Native logs**: Expo Dev Tools or terminal

## Common Tasks

### Install a New Package

**For web app:**

```bash
cd apps/web
yarn add package-name
```

**For native app:**

```bash
cd apps/native
yarn add package-name
```

**For Convex backend:**

```bash
cd packages/backend
yarn add package-name
```

### Add a New Convex Function

1. Create file in `packages/backend/convex/`
2. Define query/mutation/action
3. The function is automatically available
4. Import in frontend: `api.yourFile.yourFunction`

### Add a New Page (Web)

1. Create in `apps/web/src/app/your-route/page.tsx`
2. Follows Next.js App Router conventions
3. Automatically routed

### Add a New Screen (Native)

1. Create in `apps/native/src/screens/YourScreen.tsx`
2. Add to navigation in `src/navigation/Navigation.tsx`

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000 (web)
npx kill-port 3000

# Kill process on port 19000 (expo)
npx kill-port 19000
```

### Convex Deployment URL Not Found

```bash
cd packages/backend
npx convex dev
# Copy the deployment URL
```

### Clerk Authentication Not Working

1. Verify environment variables are correct
2. Check Clerk application settings
3. Ensure Google/Apple OAuth is configured
4. Check Clerk Issuer URL in Convex

### Expo Not Starting

```bash
# Clear cache
cd apps/native
npx expo start --clear

# Or
rm -rf node_modules .expo
yarn install
```

### Module Not Found

```bash
# Clear all node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
yarn install
```

### TypeScript Errors

```bash
# Rebuild types
cd packages/backend
npx convex dev
# This regenerates types in _generated/
```

## Next Steps

- Read [Architecture Documentation](./architecture.md)
- Review [Development Guide](./development.md)
- Check [API Reference](./api-reference.md)
- Explore [Code Examples](./examples/)

## Getting Help

- Check [Troubleshooting Guide](./guides/troubleshooting.md)
- Review [Convex Documentation](https://docs.convex.dev)
- Review [Next.js Documentation](https://nextjs.org/docs)
- Review [Expo Documentation](https://docs.expo.dev)
- Ask in project discussions or issues
