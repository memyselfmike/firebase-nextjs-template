# Firebase + Next.js Template

Zero-configuration development environment for Firebase + Next.js projects with TypeScript, automated setup, and CI/CD pipeline.

## 🚀 Quick Start

Get up and running in under 5 minutes:

```bash
# 1. Use this template to create your new repository (click "Use this template" button above)

# 2. Clone your new repository
git clone <your-repository-url>
cd <your-repository-name>

# 3. Run automated setup
npm run setup

# 4. Start development environment
npm run dev:all
```

**That's it!** Your app is now running at **http://localhost:3004**

## ✨ What's Included

- ✅ **Centralized Firebase Configuration** - Type-safe config service with environment-based settings
- ✅ **Automated Development Setup** - One-command environment initialization
- ✅ **CI/CD Pipeline** - GitHub Actions for testing and deployment
- ✅ **Firebase Emulator Integration** - Local development with emulators
- ✅ **TypeScript Monorepo** - Fully typed codebase with shared packages
- ✅ **Testing Infrastructure** - Unit and E2E testing setup
- ✅ **Development Scripts** - Automated workflows for common tasks

## 📋 Prerequisites

- **Node.js** 18 or later
- **npm** 8 or later
- **Firebase Project** (for production deployment)

## 🏗️ Architecture

This template uses a monorepo structure:

```
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── config/      # ConfigService (centralized configuration)
│   │   │   ├── app/         # Next.js App Router pages
│   │   │   └── components/  # React components
│   │   └── package.json
│   └── functions/           # Firebase Functions
│       ├── src/
│       └── package.json
├── packages/
│   └── shared-types/        # Shared TypeScript types
├── scripts/
│   ├── setup.js            # One-time setup automation
│   ├── e2e-start.js        # Start services for E2E tests
│   ├── e2e-stop.js         # Stop all services
│   └── e2e-health.js       # Health check services
├── .github/workflows/      # CI/CD pipelines
├── firebase.json           # Firebase configuration
└── package.json            # Monorepo configuration
```

## 🔧 Configuration

### Environment Variables

Copy `.env.local.example` to `.env.local` (done automatically by `npm run setup`):

```env
# Firebase Project Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Development (uses Firebase Emulators)
NEXT_PUBLIC_APP_ENV=development
```

### Firebase Project Setup

1. **Create Firebase Project** at [Firebase Console](https://console.firebase.google.com/)
2. **Get your project credentials** from Project Settings
3. **Update `.env.local`** with your credentials
4. **Update `.firebaserc`** with your project ID:
   ```bash
   cp .firebaserc.example .firebaserc
   # Edit .firebaserc and replace 'your-project-id-here' with your actual project ID
   ```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| **Setup & Development** | |
| `npm run setup` | One-time setup: validate environment and create config files |
| `npm run dev:all` | Start everything: Firebase Emulators + Next.js (recommended) |
| `npm run dev` | Start Next.js development server only |
| **Firebase** | |
| `npm run firebase:emulators` | Start Firebase emulators only |
| `npm run firebase:deploy` | Deploy to Firebase |
| **Testing & Quality** | |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Type check all workspaces |
| **Building** | |
| `npm run build` | Build web application |
| `npm run build:all` | Build all packages and applications |
| **E2E Testing** | |
| `npm run e2e:health` | Check if all services are running |
| `npm run e2e:start` | Start all services for E2E testing |
| `npm run e2e:stop` | Stop all E2E services |

## 🌐 Development URLs

| Service | URL |
|---------|-----|
| **Web Application** | **http://localhost:3004** |
| Auth Emulator | http://localhost:9099 |
| Firestore Emulator | http://localhost:8080 |
| Functions Emulator | http://localhost:5001 |
| Storage Emulator | http://localhost:9199 |
| Hosting Emulator | http://localhost:5000 |
| Emulator Hub | http://localhost:4400 |

## 🔄 CI/CD Pipeline

### Automated Testing

Every pull request triggers:
- ✅ Type checking
- ✅ Linting
- ✅ Unit tests
- ✅ Build validation
- ✅ E2E tests (optional)

### Automated Deployment

Pushes to `main` branch automatically:
1. Run all tests
2. Build application
3. Deploy to Firebase (if tests pass)

### GitHub Secrets Required

For CI/CD to work, add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON |

**To get service account:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy entire JSON content to GitHub secret

## 📚 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase Functions, Node.js 18
- **Database**: Cloud Firestore
- **Auth**: Firebase Authentication
- **Hosting**: Firebase Hosting
- **Development**: Firebase Emulator Suite
- **Testing**: Jest, Playwright (optional)
- **CI/CD**: GitHub Actions

## 🎯 Development Workflow

1. **Make changes** in `apps/web/src/` or `apps/functions/src/`
2. **Test locally** with `npm run dev:all`
3. **Run tests** with `npm test`
4. **Commit changes** and push to GitHub
5. **CI pipeline** runs automatically
6. **Merge to main** triggers deployment

## 📖 Documentation

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [Architecture Overview](docs/ARCHITECTURE.md) - System design and patterns
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🆘 Troubleshooting

### Services won't start

```bash
# Stop all services
npm run e2e:stop

# Check service health
npm run e2e:health

# Start again
npm run dev:all
```

### Port conflicts

```bash
# Windows: Check what's using the ports
netstat -ano | findstr ":3004 :9099 :8080"

# Mac/Linux: Kill processes on specific ports
lsof -ti:3004 | xargs kill -9
```

### Environment variables not loading

```bash
# Check .env.local exists
ls apps/web/.env.local

# If missing, run setup
npm run setup
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests (`npm test`)
5. Commit and push
6. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

This template is based on patterns developed during the SavvyProxy Firebase Infrastructure Modernization project (Epic 4).

---

**Happy coding!** 🎉

For questions or issues, please open a GitHub issue.
