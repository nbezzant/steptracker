# StepTracker 🏃

A team step-tracking app built with Next.js 14 and Firebase Firestore.

## Features
- Google OAuth login
- Join a team: Utah 🏔️, Texas ⭐, Virginia 🌿
- Log daily steps (today or any past day)
- Calendar heat-map view with inline step editing
- Personal leaderboard (all-time / today / yesterday)
- Team leaderboard (all-time / today / yesterday)
- Future days locked; past days editable

## Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Firebase Firestore, Firebase Auth (Google)
- **Hosting**: Vercel (recommended) or Firebase Hosting

## Firestore Collections

| Collection | Document ID | Fields |
|---|---|---|
| `users` | `{uid}` | uid, displayName, email, photoURL, teamId, totalSteps, createdAt |
| `steps` | `{uid}_{date}` | uid, date (YYYY-MM-DD), steps, updatedAt |
| `teams` | `utah` \| `texas` \| `virginia` | id, name, totalSteps, memberCount |

---

## Setup Guide

### 1. Clone & Install
```bash
git clone <your-repo>
cd steptracker
npm install
```

### 2. Firebase Project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it → disable Google Analytics (optional) → Create
3. In Project Settings > **Your apps** → click **</>** (Web) → Register app → copy the config

### 3. Enable Auth
- Firebase Console → **Authentication** → Get Started
- Sign-in method → **Google** → Enable → Save
- Add your domain to **Authorized domains**: `localhost` is already there; add your Vercel domain later.

### 4. Enable Firestore
- Firebase Console → **Firestore Database** → Create database
- Choose **Production mode** → select a region close to your users → Enable

### 5. Deploy Firestore Rules & Indexes
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # pick your project
firebase deploy --only firestore
```

### 6. Environment Variables
Copy `.env.local.example` to `.env.local` and fill in your Firebase config:
```bash
cp .env.local.example .env.local
```
Edit `.env.local` with your values from Step 2.

### 7. Run Locally
```bash
npm run dev
```
Open http://localhost:3000

---

## Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to https://vercel.com → New Project → Import your repo
3. In **Environment Variables**, add all the `NEXT_PUBLIC_FIREBASE_*` vars from your `.env.local`
4. Deploy!
5. Copy your Vercel domain (e.g. `steptracker.vercel.app`)
6. In Firebase Console → Authentication → Authorized domains → Add your Vercel domain

---

## Deploy Firestore Security Rules (Important!)
After any change to `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```

## Firestore Indexes
The `firestore.indexes.json` file defines required composite indexes. Deploy them:
```bash
firebase deploy --only firestore:indexes
```
Or click the auto-generated link in the browser console error the first time a query runs.
