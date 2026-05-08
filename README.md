# 🌍 RoamGenie — AI-Powered Adaptive Travel Planner

> Plan trips dynamically with preferences, constraints, and real-time weather adaptation.

RoamGenie is an AI-powered travel planning engine that doesn't just generate itineraries — it **monitors and adapts** them in real-time when conditions change.

## ✨ Features

- **AI Itinerary Generation** — Describe your dream trip in natural language and get a detailed day-by-day plan
- **Google Maps Integration** — Interactive map with color-coded markers for every activity
- **Weather-Aware Adaptation** — Detects rain/storms and automatically re-plans with indoor alternatives
- **Conversational Refinement** — "Make day 2 less packed" — RoamGenie understands and adjusts
- **Trip Persistence** — Save/load trips via Firebase Firestore
- **Google Authentication** — One-click sign-in with Google

## 🏗️ Architecture

```
RoamGenie/
├── client/          # React 19 + Vite + TypeScript
├── server/          # Node.js + Express + TypeScript
└── shared/          # Shared type definitions
```

### Google Services Used (6)
| Service | Purpose |
|---|---|
| Gemini 2.0 Flash | AI itinerary generation with function calling |
| Maps JavaScript API | Interactive map display |
| Places API | Real place search, ratings, photos |
| Directions API | Route + transit time calculation |
| Firebase Auth | Google Sign-In |
| Cloud Firestore | Trip data persistence |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- API keys (see below)

### 1. Clone & Install

```bash
git clone <repo-url>
cd RoamGenie

# Install root dependencies
npm install

# Install client & server dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 2. Configure Environment

Copy `.env.example` to create your env files:

**Server env** (`server/.env`):
```env
GEMINI_API_KEY=your_gemini_key
GCP_MAPS_API_KEY=your_maps_key
OPENWEATHER_API_KEY=your_openweather_key
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**Client env** (`client/.env`):
```env
VITE_GCP_MAPS_API_KEY=your_maps_key
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Run

```bash
# From root — starts both client and server concurrently
npm run dev
```

- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

### 4. Test

```bash
npm test
```

## 🔒 Security

- All API keys stored in `.env` (never committed)
- Server-side rate limiting (30 req/min)
- Helmet.js security headers
- CORS restricted to frontend origin
- Zod input validation on all endpoints
- Firebase Auth token verification

## ♿ Accessibility

- Semantic HTML5 (`<main>`, `<nav>`, `<section>`, `<article>`)
- ARIA labels on all interactive elements
- Keyboard navigation throughout
- Skip-to-content link
- `prefers-reduced-motion` support
- WCAG AA color contrast (4.5:1+)
- Focus-visible outlines

## 📄 License

MIT
