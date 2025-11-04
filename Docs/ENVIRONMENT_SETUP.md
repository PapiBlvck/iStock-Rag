# Environment Configuration

## Web App Environment Variables

Create a file `apps/web/.env.local` with the following content:

```env
# Firebase Configuration
# Get these values from Firebase Console > Project Settings > General
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# tRPC Endpoint (for production)
# For local development with emulators, use:
# VITE_TRPC_URL=http://localhost:5001/your-project-id/us-central1/trpc
VITE_TRPC_URL=http://localhost:5001/your-project-id/us-central1/trpc
```

## Firebase Project Configuration

Update `.firebaserc` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-firebase-project-id"
  }
}
```

## Getting Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon (⚙️) next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. If you haven't added a web app, click the web icon (</>)
7. Register your app
8. Copy the config values to your `.env.local` file

## Enable Required Firebase Services

### 1. Authentication
- Go to Firebase Console > Authentication
- Click "Get started"
- Enable "Email/Password" sign-in method

### 2. Firestore Database
- Go to Firebase Console > Firestore Database
- Click "Create database"
- Start in "test mode" for development
- Choose a location

### 3. Cloud Functions (Optional for now)
- Functions will be set up when you're ready to deploy

## Local Development (No Firebase Project Required Initially)

You can start with Firebase emulators without creating a real Firebase project:

1. Keep the default values in the files
2. Run `firebase emulators:start`
3. The emulators will work with demo credentials

The app will connect to local emulators automatically in development mode.

