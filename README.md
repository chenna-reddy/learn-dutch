# Learn Dutch Reading

A web app for kids to practice Dutch reading, listening, and speaking. Parents can create multiple student profiles so each child has their own progress, fluency scores, and reading position.

Built with **Svelte 5 + TypeScript + Vite**, hosted on **Firebase Hosting**, with **Cloud Functions** for Azure Speech token management and **Firestore** for per-student progress.

## Features

- **Story library** — Dutch stories stored as Markdown files with YAML frontmatter
- **Sentence-by-sentence reader** — big font, listen button, read-aloud button
- **Text-to-speech** — device voice (free) or Azure Neural Dutch voice (`nl-NL-FennaNeural`)
- **Speech recognition & fluency scoring** — basic Web Speech scoring or Azure Pronunciation Assessment
- **Multiple student profiles** — one Firebase account can manage many kids; switch via top-right dropdown
- **Per-student progress in Firestore** — completed stories, current sentence, attempt history, and CEFR-style fluency level
- **Bilingual UI** — English and Dutch, toggle in the header
- **Firebase Authentication** — Google and Email/Password sign-in

## Tech Stack

| Layer          | Choice                                                        |
| -------------- | ------------------------------------------------------------- |
| Frontend       | Svelte 5 + TypeScript + Vite                                  |
| Routing        | Hash-based Svelte router (`src/lib/router.ts`)                |
| i18n           | `svelte-i18n` (EN / NL)                                       |
| Hosting        | Firebase Hosting                                              |
| Serverless     | Firebase Cloud Functions (2nd gen, Node.js 22)                |
| Auth           | Firebase Authentication (Google + Email/Password)             |
| Database       | Cloud Firestore                                               |
| TTS            | Web Speech API or Azure Speech Services                       |
| Speech scoring | Web Speech API + local diff or Azure Pronunciation Assessment |
| Stories        | Markdown + YAML frontmatter in `src/stories/`                 |

## Project Structure

```
learn-dutch/
├── firebase.json              # Hosting, Functions, Firestore config
├── firestore.rules            # Security rules (user-scoped data)
├── functions/                 # Cloud Functions
│   ├── src/index.ts           # getSpeechToken: mints short-lived Azure tokens
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── lib/
│   │   ├── firebase.ts        # Firebase app, auth, and Firestore init
│   │   ├── i18n/              # Translation files (en.json, nl.json)
│   │   ├── router.ts          # Hash-based SPA routing
│   │   ├── services/          # Stories, TTS, speech recognition, students, Azure auth
│   │   ├── stores/            # Auth, students, progress, settings Svelte stores
│   │   └── types.ts           # Shared TypeScript types
│   ├── components/            # Header, AccountMenu, StoryCard
│   ├── routes/                # Library, Reader, Settings, Login, Students
│   └── stories/               # Dutch story content (Markdown + YAML)
└── .env.example               # Required environment variables
```

## Development

### Prerequisites

- Node.js 22+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Blaze billing plan (Cloud Functions require it)
- An Azure Speech resource

### 1. Install dependencies

```bash
npm install
cd functions && npm install && cd ..
```

### 2. Configure Firebase

Copy `.env.example` to `.env.local` and fill in your Firebase web app config from the Firebase console (**Project Settings → General → Your apps → Web app**):

```bash
cp .env.example .env.local
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

### 3. Enable Firebase services

In the Firebase console:

1. **Authentication** → Sign-in method → enable **Google** and **Email/Password**
2. **Firestore Database** → Create database → choose a region close to your users (e.g., `eur3` for Europe)

### 4. Configure Azure Speech

Create an Azure Speech resource at https://portal.azure.com. Copy the **Key** and **Region** (e.g., `westeurope`).

Store them as Firebase Function secrets:

```bash
firebase functions:secrets:set AZURE_SPEECH_KEY
firebase functions:secrets:set AZURE_SPEECH_REGION
```

### 5. Configure Azure Translator (optional)

For word-by-word translation, create an Azure Translator resource at https://portal.azure.com. Copy the **Key** and **Region** (e.g., `westeurope`).

Store them as Firebase Function secrets:

```bash
firebase functions:secrets:set AZURE_TRANSLATOR_KEY
firebase functions:secrets:set AZURE_TRANSLATOR_REGION
firebase functions:secrets:set AZURE_TRANSLATOR_BASE_URL
```

- `AZURE_TRANSLATOR_REGION` — your Translator resource region (required for regional keys)
- `AZURE_TRANSLATOR_BASE_URL` — defaults to `api` if not set. Use `api` for the global endpoint, or a custom subdomain if needed

### 6. Run locally

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

> **Note:** To test Azure Neural voices or Azure Pronunciation Assessment locally, you must either deploy the function or run the Firebase emulator with the secrets set. The Web Speech API fallback works without Azure setup.

## Deployment

```bash
npm run build
cd functions && npm run build && cd ..
firebase deploy
```

Or deploy pieces separately:

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting
```

## Security Notes

- The Azure Speech key is stored in **Firebase Secret Manager** and never reaches the browser.
- The Cloud Function `/api/token` is public at the Cloud Run layer but verifies the Firebase ID token before minting an Azure token.
- Azure Speech tokens are short-lived (9 minutes) and tied to the region used by the function.
- Firestore data is scoped per user via security rules (`firestore.rules`).
- If you want to prevent token extraction entirely, switch to a backend proxy model where the function calls Azure on the browser's behalf. The current token model is a pragmatic trade-off for lower latency and simpler architecture.

## Adding Stories

Create a new Markdown file in `src/stories/`:

```markdown
---
id: my-story
title: My Dutch Story
level: A1
ageRange: [6, 8]
tags: [animals, nature]
---

Dit is de eerste zin.

Dit is de tweede zin.
```

Each paragraph becomes one sentence card in the reader.

## License

Private / personal-use project.
