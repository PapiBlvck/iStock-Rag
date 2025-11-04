# Firebase Setup - Configuration Complete ✅

## What's Been Done

✅ **Firebase Project Created**: `rag-farming-platform`
✅ **Web App Registered**: App ID `1:211577522015:web:9efc442ca93cd8b3eb58ea`
✅ **Environment Variables Created**: `apps/web/.env.local` with your Firebase config
✅ **Firebase Project Selected**: Your CLI is now using `rag-farming-platform`

## Your Firebase Configuration

- **Project ID**: `rag-farming-platform`
- **Project Console**: https://console.firebase.google.com/project/rag-farming-platform/overview

## Next Steps - Enable Firebase Services

### 1. Enable Firestore Database

Visit: https://console.firebase.google.com/project/rag-farming-platform/firestore

1. Click **"Create database"**
2. Choose **"Start in test mode"** (we'll deploy secure rules after)
3. Select location: **"us-central (Iowa)"** or your preferred region
4. Click **"Enable"**

### 2. Enable Authentication

Visit: https://console.firebase.google.com/project/rag-farming-platform/authentication

1. Click **"Get started"**
2. Click on **"Email/Password"** provider
3. **Enable** the first toggle (Email/Password)
4. Click **"Save"**

### 3. Deploy Your Security Rules (After Firestore is enabled)

Once Firestore is enabled, run from your project directory:

```bash
firebase deploy --only firestore:rules
```

This will deploy the secure Firestore rules that implement:
- Principle of Least Privilege
- Users can only access their own data
- Validation for data integrity

### 4. Initialize Firebase Functions (Optional - for later)

When you're ready to deploy cloud functions:

```bash
# Initialize functions in your project
firebase init functions

# Or deploy existing functions
cd functions
npm run build
firebase deploy --only functions
```

## Quick Start Guide

### Option A: Use Firebase Emulators (Recommended for Development)

Start the Firebase emulators locally (no real Firebase services needed):

```bash
firebase emulators:start
```

This starts:
- 🔐 Auth Emulator: http://localhost:9099
- 🗄️ Firestore Emulator: http://localhost:8080
- ⚡ Functions Emulator: http://localhost:5001
- 🖥️ Emulator UI: http://localhost:4000

Then in a **new terminal**, start your web app:

```bash
cd apps/web
pnpm dev
```

Visit: http://localhost:3000

### Option B: Use Real Firebase Services

After enabling Firestore and Authentication (steps 1 & 2 above):

1. Update your `.env.local` to use production URLs (already configured)
2. Deploy security rules: `firebase deploy --only firestore:rules`
3. Start your web app:
   ```bash
   cd apps/web
   pnpm dev
   ```

## Environment Configuration

Your Firebase config is stored in `apps/web/.env.local`:

```env
VITE_FIREBASE_API_KEY=AIzaSyBqhmu3nW6SG_FJEVI0JpZCjSQNbgxQh-g
VITE_FIREBASE_AUTH_DOMAIN=rag-farming-platform.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rag-farming-platform
VITE_FIREBASE_STORAGE_BUCKET=rag-farming-platform.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=211577522015
VITE_FIREBASE_APP_ID=1:211577522015:web:9efc442ca93cd8b3eb58ea
```

## Install Dependencies

If you haven't already:

```bash
pnpm install
```

## Testing Your Setup

1. **With Emulators** (Easiest):
   - Run `firebase emulators:start`
   - Run `pnpm dev` in apps/web
   - Visit http://localhost:3000
   - Sign up with any test email (no real verification needed)

2. **With Real Firebase**:
   - Enable Firestore & Auth in console (see above)
   - Deploy rules: `firebase deploy --only firestore:rules`
   - Run `pnpm dev` in apps/web
   - Sign up with a real email

## Project Structure

```
RAG/
├── apps/web/
│   ├── .env.local          ✅ Created with your Firebase config
│   └── src/
│       ├── config/firebase.ts  ✅ Auto-connects to emulators in dev
│       └── ...
├── functions/              ✅ tRPC backend ready
├── packages/shared/        ✅ Zod schemas ready
├── firebase.json          ✅ Configured
├── firestore.rules        ✅ Secure rules ready to deploy
└── .firebaserc            ✅ Project ID: rag-farming-platform
```

## Important Notes

🔒 **Security**: Your Firestore rules implement Principle of Least Privilege
- Users can ONLY read/write their own data
- All operations are validated

🚀 **Auto-Emulator Detection**: The app automatically uses emulators in development mode

📱 **Firebase Console**: Bookmark this for monitoring: https://console.firebase.google.com/project/rag-farming-platform/overview

## Troubleshooting

### "Missing or insufficient permissions"
- You haven't enabled Firestore yet - see Step 1 above
- Or you haven't deployed security rules yet

### "Auth domain is not configured"
- You haven't enabled Authentication yet - see Step 2 above

### Port conflicts
- Emulators use ports 9099, 8080, 5001, 4000
- Web app uses port 3000
- Make sure these are available or change in configs

## What's Next?

1. ✅ **Firebase Project**: DONE
2. ⏳ **Enable Firestore**: Do this now (1 minute)
3. ⏳ **Enable Authentication**: Do this now (1 minute)
4. ⏳ **Install Dependencies**: Run `pnpm install`
5. ⏳ **Start Development**: Run emulators and dev server
6. 🎉 **Test the App**: Sign up and create a farm profile!

## Quick Command Reference

```bash
# Check current Firebase project
firebase use

# List all projects
firebase projects:list

# Switch projects
firebase use [project-id]

# Start emulators
firebase emulators:start

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy functions
firebase deploy --only functions

# Install all dependencies
pnpm install

# Start web app
cd apps/web && pnpm dev
```

---

**Ready to proceed?** 

1. Enable Firestore: https://console.firebase.google.com/project/rag-farming-platform/firestore
2. Enable Auth: https://console.firebase.google.com/project/rag-farming-platform/authentication
3. Then run: `firebase emulators:start`

