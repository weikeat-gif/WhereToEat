# Firebase Auth Setup

Use this when you are ready to replace the local demo login with real Firebase Authentication.

## 1. Create Firebase Project

1. Go to <https://console.firebase.google.com/>.
2. Click **Add project**.
3. Name it `MakanMana`.
4. Analytics is optional for now.

## 2. Add Web App

1. Open the Firebase project.
2. Click the web icon `</>`.
3. Register the app as `MakanMana Web`.
4. Copy the Firebase config values.

## 3. Add Environment Variables

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

Fill these values:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Do not commit `.env.local`. It is already ignored by Git.

## 4. Enable Sign-In Methods

In Firebase Console:

1. Go to **Authentication**.
2. Click **Get started** if needed.
3. Open **Sign-in method**.
4. Enable:
   - Google
   - Email/Password
   - Phone

## 5. Add Authorized Domains

In **Authentication > Settings > Authorized domains**, make sure these are allowed:

```text
localhost
127.0.0.1
```

Add your production domain later after deployment.

## 6. Phone OTP Notes

For local testing, Firebase Phone Auth requires reCAPTCHA. The app already includes the invisible reCAPTCHA container.

To avoid SMS cost during testing:

1. Go to **Authentication > Sign-in method > Phone**.
2. Add a test phone number.
3. Set a fixed test OTP code.

## 7. Restart And Test

After editing `.env.local`, restart the dev server:

```bash
npm run dev
```

Then test:

1. Google sign-in opens a real Google popup.
2. Username/password creates/signs in with Firebase Email/Password.
3. Phone OTP sends through Firebase Phone Auth.
4. Profile shows the signed-in user name and joined date.

If `.env.local` is missing or incomplete, MakanMana automatically uses demo auth instead.
