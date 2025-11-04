# Setup Guide

This guide will help you set up and run the RAG-powered farming knowledge platform.

## Prerequisites

- Node.js >= 18.0.0
- PNPM >= 8.0.0
- Firebase CLI (install with `npm install -g firebase-tools`)

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

This will install all dependencies across the monorepo.

### 2. Configure Firebase

#### a. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the prompts
3. Enable Authentication (Email/Password provider)
4. Enable Firestore Database

#### b. Update Firebase Configuration

1. Update `.firebaserc` with your project ID:
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

2. Get your Firebase config from Firebase Console > Project Settings > General
3. Create `apps/web/.env.local` with your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_TRPC_URL=http://localhost:5001/your-project-id/us-central1/trpc
```

#### c. Deploy Firebase Security Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Development Mode

You can run the entire stack locally using Firebase Emulators:

#### Start Firebase Emulators

```bash
firebase emulators:start
```

This will start:
- Authentication Emulator (port 9099)
- Firestore Emulator (port 8080)
- Functions Emulator (port 5001)
- Emulator UI (port 4000)

#### Start the Web App

In a separate terminal:

```bash
cd apps/web
pnpm dev
```

The web app will be available at http://localhost:3000

### 4. Build Functions

Before deploying or running functions locally:

```bash
cd functions
pnpm build
```

## Project Structure

```
.
├── apps/
│   └── web/                    # React frontend (Vite + React + TypeScript)
│       ├── src/
│       │   ├── components/     # React components
│       │   │   ├── ui/        # shadcn/ui components
│       │   │   ├── FarmProfileForm.tsx
│       │   │   └── Layout.tsx
│       │   ├── contexts/       # React contexts (Auth)
│       │   ├── config/         # Firebase config
│       │   ├── lib/            # Utilities and tRPC setup
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── package.json
│       └── vite.config.ts
│
├── functions/                  # Firebase Cloud Functions
│   ├── src/
│   │   ├── config/            # Firebase Admin setup
│   │   ├── routers/           # tRPC routers
│   │   │   ├── user.router.ts
│   │   │   ├── farm-profile.router.ts
│   │   │   └── index.ts
│   │   ├── trpc/              # tRPC configuration
│   │   │   ├── context.ts
│   │   │   └── trpc.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── packages/
│   ├── shared/                 # Shared Zod schemas and types
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   │   ├── user.schema.ts
│   │   │   │   ├── farm-profile.schema.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── rag-service/            # RAG logic (placeholder)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── firebase.json               # Firebase configuration
├── firestore.rules            # Firestore Security Rules
├── firestore.indexes.json     # Firestore indexes
├── pnpm-workspace.yaml        # PNPM workspace configuration
├── turbo.json                 # Turborepo configuration
├── tsconfig.json              # Root TypeScript config
├── package.json               # Root package.json
└── README.md
```

## Key Features Implemented

### 1. Type-Safe Schema Validation

- Zod schemas defined in `packages/shared`
- Used across frontend (React Hook Form) and backend (tRPC)
- Ensures data consistency and type safety

### 2. Secure Authentication

- Firebase Authentication with Email/Password
- Auth context in React app
- Token verification in tRPC context

### 3. Firestore Security Rules

- Principle of Least Privilege implemented
- Users can only read/write their own data
- Validation rules for data structure
- Located in `firestore.rules`

### 4. tRPC API

- Type-safe API with full TypeScript support
- User management router
- Farm profile management router
- Protected procedures requiring authentication

### 5. Modern UI with Tailwind CSS

- Beautiful, responsive design
- shadcn/ui components
- Green-themed for agricultural context
- Dark mode support

### 6. Form Validation

- React Hook Form with Zod resolver
- Client-side validation
- User-friendly error messages
- Multi-step farm profile form

## Available Scripts

### Root Level

```bash
pnpm dev          # Run all packages in dev mode (Turborepo)
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm format       # Format code with Prettier
pnpm type-check   # Type check all packages
```

### Web App (`apps/web`)

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Lint code
pnpm type-check   # Type check
```

### Functions

```bash
pnpm build        # Build TypeScript
pnpm dev          # Watch mode
pnpm serve        # Serve with Firebase emulator
pnpm deploy       # Deploy to Firebase
pnpm lint         # Lint code
pnpm type-check   # Type check
```

## Testing the Application

1. Start the Firebase emulators and web app (as described above)
2. Navigate to http://localhost:3000
3. Sign up with a test email and password
4. Fill out the Farm Profile form
5. The data is validated with Zod schemas
6. Form submission shows a confirmation (currently demo mode)

## Next Steps

To complete the integration:

1. **Connect tRPC to Frontend**: Update the tRPC client in the web app to actually call the backend endpoints
2. **Implement RAG Service**: Add actual RAG logic in `packages/rag-service`
3. **Add More Features**: 
   - Dashboard with farm analytics
   - RAG-powered Q&A
   - Recommendations based on farm profile
4. **Testing**: Add unit and integration tests
5. **Deployment**: Deploy to Firebase Hosting and Cloud Functions

## Security Considerations

✅ **Implemented:**
- Firestore Security Rules (Principle of Least Privilege)
- Firebase Authentication
- Token verification in backend
- Input validation with Zod
- Type safety across the stack

🔐 **Additional Recommendations:**
- Enable reCAPTCHA for authentication
- Implement rate limiting
- Add audit logging
- Use environment variables for all secrets
- Enable HTTPS in production

## Troubleshooting

### "Module not found" errors

Run `pnpm install` from the root directory to ensure all dependencies are installed.

### Firebase emulator issues

Make sure you're logged in to Firebase CLI:
```bash
firebase login
```

### TypeScript errors

Run type checking:
```bash
pnpm type-check
```

### Port conflicts

Change ports in:
- `firebase.json` (emulator ports)
- `apps/web/vite.config.ts` (dev server port)

## Support

For issues or questions, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [tRPC Documentation](https://trpc.io)
- [Zod Documentation](https://zod.dev)
- [shadcn/ui Documentation](https://ui.shadcn.com)

