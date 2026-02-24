# Do It - Setup Guide

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Name it anything (e.g., "do-it-app")
4. You can disable Google Analytics (not needed)
5. Click **Create project**

## Step 2: Enable Authentication

1. In your Firebase project, go to **Build > Authentication**
2. Click **Get started**
3. Click **Email/Password** under "Sign-in providers"
4. Toggle **Enable** to ON
5. Click **Save**

## Step 3: Create Firestore Database

1. Go to **Build > Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select a location close to you (e.g., us-central1)
5. Click **Enable**

## Step 4: Set Firestore Security Rules

1. In Firestore, click the **Rules** tab
2. Replace the default rules with the contents of `firestore.rules` from this project:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

## Step 5: Register a Web App

1. Go to **Project settings** (gear icon at top left)
2. Scroll to **"Your apps"** section
3. Click the web icon **(</>)**
4. Name it "Do It" (hosting not needed)
5. Click **Register app**
6. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

7. **Copy these values** - you'll need them next

## Step 6: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```
   cp .env.local.example .env.local
   ```

2. Fill in the values from Step 5:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

## Step 7: Generate App Icons

1. Open `scripts/generate-icons.html` in Chrome
2. Right-click each canvas image and "Save Image As..."
3. Save them to `public/icons/` as:
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable.png`

## Step 8: Install & Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 in Chrome. You should see the login page.

## Step 9: Deploy to Vercel

1. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/do-it.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com), click **"Add New Project"**
3. Import your GitHub repo
4. Add the same environment variables from Step 6
5. Click **Deploy**

## Step 10: Install on Your Phone

1. Open your Vercel URL in Chrome on Android
2. Chrome will show an "Install" or "Add to Home Screen" prompt
3. Tap it to install the PWA
4. Long-press the app icon for the "Quick Voice Add" shortcut

## Step 11: Set Up Email-to-Task (SendGrid)

This lets you create tasks by sending an email to a special address.

### 1. Create a SendGrid account
- Go to [sendgrid.com](https://sendgrid.com) and sign up for a free account
- Free tier includes 100 inbound emails/day which is plenty for personal use

### 2. Verify a sender domain
- In the SendGrid dashboard go to **Settings → Sender Authentication**
- Click **Authenticate Your Domain** and follow the steps to add DNS records to your domain
- This can take up to an hour

### 3. Set up Inbound Parse
- Go to **Settings → Inbound Parse**
- Click **Add Host & URL**
- Set **Receiving Domain** to a subdomain you want to receive tasks on (e.g. `inbox.yourdomain.com`)
- Set **Destination URL** to your webhook URL — see step 5 below

### 4. Add DNS MX record
- In your domain registrar (e.g. Namecheap, GoDaddy, Cloudflare), add an MX record:
  - **Host:** `inbox` (or whatever subdomain you chose)
  - **Value:** `mx.sendgrid.net`
  - **Priority:** `10`

### 5. Generate a webhook secret and set the URL
- Make up any random string of letters and numbers (e.g. `xK9mP2qR7vT4`) — this is your `SENDGRID_WEBHOOK_SECRET`
- Add it as an environment variable in Vercel: **Settings → Environment Variables → `SENDGRID_WEBHOOK_SECRET`**
- Your full webhook URL will be:
  ```
  https://your-vercel-domain.com/api/email-webhook?secret=xK9mP2qR7vT4
  ```
- Paste this URL into the **Destination URL** field in SendGrid Inbound Parse (step 3)

### 6. Test it
- Send an email from your registered account to `anything@inbox.yourdomain.com`
- The subject becomes the task title
- Add `#listname` in the subject to send it to a specific list (e.g. `Buy milk #shopping`)
- The email body becomes the task notes

## Troubleshooting

- **"Firebase: Error" on login**: Double-check your `.env.local` values match exactly
- **Tasks not syncing**: Check browser console for errors. Make sure Firestore rules are published
- **Voice not working**: Must use Chrome. Check that mic permissions are allowed
- **Offline not working**: The service worker needs a production build (`npm run build && npm start`)
