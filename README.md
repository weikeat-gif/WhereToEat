# MakanMana

MakanMana is a mobile-first food finder app. In Malaysia, "makan mana" means "where to eat." The app helps users quickly search for nearby restaurants, cafes, and chill places, then open the selected place in Google Maps for directions, reviews, opening hours, and live shop details.

The app supports GPS search, manual location input, food/category filtering, restaurant cards, restaurant detail sheets, and shareable Maps links.

Login and sign up work in demo mode by default. If Firebase environment variables are added, the app can use Firebase Authentication for Google login, email/password login, and phone OTP.

## How To Run

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```text
http://127.0.0.1:5175/
```

## Firebase Auth Setup

Copy `.env.example` to `.env.local` and add your Firebase web app values:

```bash
cp .env.example .env.local
```

Required variables:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

In Firebase Console, enable these sign-in methods:

- Google
- Email/password
- Phone

Without `.env.local`, the app keeps using the local demo auth flow. The demo OTP is `123456`.

## Check The Project

```bash
npm test
npm run lint
npm run build
```
