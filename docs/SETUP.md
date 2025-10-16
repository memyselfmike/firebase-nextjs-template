# Detailed Setup Guide

This guide provides step-by-step instructions for setting up your Firebase + Next.js development environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Firebase Configuration](#firebase-configuration)
4. [Environment Variables](#environment-variables)
5. [Running the Application](#running-the-application)
6. [Verification](#verification)

## Prerequisites

### Required Software

- **Node.js** 18 or later ([Download](https://nodejs.org/))
- **npm** 8 or later (comes with Node.js)
- **Git** (for version control)
- **Firebase CLI** (will be checked by setup script)

### Firebase Account

- Create a free Firebase account at [firebase.google.com](https://firebase.google.com/)
- You'll need this for production deployment

## Initial Setup

### 1. Create Repository from Template

1. Click the "Use this template" button at the top of this repository
2. Choose a name for your new project
3. Select public or private visibility
4. Click "Create repository from template"

### 2. Clone Your Repository

```bash
git clone <your-repository-url>
cd <your-repository-name>
```

### 3. Run Automated Setup

```bash
npm run setup
```

This script will:
- ✅ Validate Node.js version (>= 18)
- ✅ Check Firebase CLI installation
- ✅ Install all npm dependencies
- ✅ Create `.env.local` from `.env.local.example`
- ✅ Run health checks

## Firebase Configuration

### Option 1: Development Only (Firebase Emulators)

For local development without a Firebase project:

1. **Skip Firebase project setup** - emulators work without a project
2. **Use default configuration** - already set in `.env.local`
3. **Start developing** - `npm run dev:all`

### Option 2: Full Setup (Development + Production)

For production deployment:

#### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name
4. Choose whether to enable Google Analytics
5. Click "Create project"

#### Step 2: Get Project Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app with a nickname
5. Copy the `firebaseConfig` object values

#### Step 3: Update .firebaserc

```bash
# Copy example file
cp .firebaserc.example .firebaserc

# Edit .firebaserc
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

#### Step 4: Update .env.local

```bash
# Edit apps/web/.env.local
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

#### Step 5: Enable Firebase Services

In Firebase Console, enable the services you need:

1. **Authentication**
   - Go to Authentication → Sign-in method
   - Enable desired providers (Email/Password, Google, etc.)

2. **Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in test mode" for development

3. **Cloud Functions**
   - Functions are automatically enabled when you deploy

4. **Storage** (if needed)
   - Go to Storage
   - Click "Get started"

## Environment Variables

### Development (.env.local)

```env
# Environment
NEXT_PUBLIC_APP_ENV=development

# Firebase Project (from Firebase Console)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# API Configuration (auto-configured from emulators in development)
# NEXT_PUBLIC_API_URL=http://localhost:5001/your-project/us-central1
```

### Production

For production, use environment variables in your hosting platform (Vercel, Firebase Hosting, etc.):

```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-your-project.cloudfunctions.net
```

## Running the Application

### Development Mode (Recommended)

Start everything with one command:

```bash
npm run dev:all
```

This starts:
- Firebase Auth Emulator (port 9099)
- Firebase Firestore Emulator (port 8080)
- Firebase Functions Emulator (port 5001)
- Next.js Dev Server (port 3004)

### Individual Services

Start services separately if needed:

```bash
# Firebase Emulators only
npm run firebase:emulators

# Next.js only (in another terminal)
npm run dev
```

## Verification

### 1. Check Services are Running

```bash
npm run e2e:health
```

Expected output:
```
✅ Firebase Auth Emulator: Running
✅ Firebase Firestore Emulator: Running
✅ Firebase Functions Emulator: Running
✅ Next.js Dev Server: Running
```

### 2. Access the Application

Open your browser to:
- **Application**: http://localhost:3004
- **Emulator UI**: http://localhost:4400

### 3. Test Firebase Connection

The ConfigService will log connection info to the console:

```
[ConfigService] ✅ Configuration loaded successfully
[ConfigService] Configuration Summary:
  Environment: development
  Project ID: your-project-id
  Emulator Mode: true
  API Base URL: http://localhost:5001/your-project/us-central1
  Emulator Endpoints:
    Auth: http://localhost:9099
    Firestore: http://localhost:8080
    Functions: http://localhost:5001/your-project/us-central1
```

## Next Steps

1. **Start building features** in `apps/web/src/app/`
2. **Add Firebase Functions** in `apps/functions/src/`
3. **Configure CI/CD** by adding GitHub secrets
4. **Deploy to production** with `npm run firebase:deploy`

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
