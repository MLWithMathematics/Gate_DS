# 🧠 GATE.AI — Data Science & AI Preparation Platform

> The most advanced AI-powered GATE DA prep platform. Practice MCQs, solve doubts with RAG AI, track progress with radar charts, and ace mock tests.

![GATE.AI Banner](https://via.placeholder.com/1200x400/050508/a855f7?text=GATE.AI+%E2%80%94+AI-Powered+GATE+DA+Preparation)

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎯 **MCQ Practice** | 10,000+ questions, subject/topic/difficulty filters, KaTeX formulas |
| 🤖 **AI Tutor** | RAG-powered doubt solver with streaming, markdown + LaTeX rendering |
| 📝 **Mock Tests** | Full-length timed tests, palette navigation, auto-submit, weak-area detection |
| 📊 **Analytics** | Radar charts, accuracy trends, heatmaps, topic mastery visualization |
| 🏆 **Leaderboard** | XP points, streaks, badges, weekly rankings |
| 📅 **Study Plan** | AI-generated personalized roadmap based on weak areas |
| ⏱ **Pomodoro Timer** | Built-in focus timer with break reminders |
| 🔥 **Streak System** | Daily challenge, streak tracking, achievement badges |

## 🛠 Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **TailwindCSS** — utility-first styling
- **Framer Motion** — smooth animations
- **Recharts** — radar charts, area charts, bar charts
- **KaTeX / react-markdown** — math formula rendering
- **Zustand** — state management with persistence
- **React Router v7** — client-side routing

### Backend
- **FastAPI** — async Python API
- **LangChain** — RAG orchestration
- **sentence-transformers** — `all-MiniLM-L6-v2` embeddings
- **Groq** — fast LLM inference (`llama-3.3-70b`)
- **Gemini** — MCQ generation & long explanations (`gemini-1.5-flash`)
- **Supabase** — PostgreSQL + pgvector + Auth + Realtime

### AI Architecture
```
User Question
     ↓
Embedding (sentence-transformers)
     ↓
pgvector Similarity Search (Supabase)
     ↓
Top-K Context Chunks Retrieved
     ↓
Contextual Prompt Built
     ↓
Groq (fast) / Gemini (fallback)
     ↓
Streamed Response → Frontend
     ↓
Cached in Supabase
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 22
- Python >= 3.12
- npm >= 10

### 1. Clone & Setup

```bash
git clone https://github.com/yourname/gate-da-platform.git
cd gate-da-platform
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at: **http://localhost:3000**

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your API keys in .env

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

Backend API at: **http://localhost:8000**  
API Docs: **http://localhost:8000/docs**

### 4. Docker (Full Stack)

```bash
# Copy env files first
cp backend/.env.example backend/.env
# Edit backend/.env with your keys

docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# AI APIs
GROQ_API_KEY=gsk_your_groq_key
GOOGLE_API_KEY=your_gemini_api_key

# App
DEBUG=true
SECRET_KEY=your-secret-key
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🗄️ Database Setup (Supabase)

1. Create a new Supabase project at https://app.supabase.com
2. Go to **SQL Editor**
3. Copy and run `backend/supabase_schema.sql`
4. Enable pgvector extension (already in schema)
5. Copy your project URL and keys to `.env`

## 📁 Project Structure

```
gate-da-platform/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/AppLayout.tsx
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── MCQPage.tsx
│   │   │   ├── MockTestPage.tsx
│   │   │   ├── DoubtSolverPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── LeaderboardPage.tsx
│   │   │   └── StudyPlanPage.tsx
│   │   ├── store/index.ts          # Zustand stores
│   │   ├── services/api.ts         # API + AI services
│   │   ├── data/mockData.ts        # Demo data
│   │   ├── types/index.ts          # TypeScript types
│   │   └── App.tsx
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── auth.py
│   │   │   ├── mcq.py
│   │   │   ├── doubt.py
│   │   │   ├── mock_test.py
│   │   │   └── progress.py
│   │   ├── services/
│   │   │   ├── rag/rag_pipeline.py   # RAG + LangChain
│   │   │   └── db/supabase_service.py
│   │   ├── core/config.py
│   │   ├── schemas/schemas.py
│   │   ├── data/seed_data.py
│   │   └── main.py
│   ├── supabase_schema.sql
│   └── requirements.txt
│
└── docker-compose.yml
```

## 🔑 Getting API Keys

| Service | URL | Free Tier |
|---------|-----|-----------|
| **Groq** | https://console.groq.com | ✅ Free |
| **Gemini** | https://aistudio.google.com | ✅ Free |
| **Supabase** | https://app.supabase.com | ✅ Free (500MB) |

## 🎨 Design System

- **Colors**: Black/zinc base, purple gradients (#7c3aed), cyan highlights (#06b6d4)
- **Typography**: Orbitron (display), Syne (body), JetBrains Mono (code)
- **Style**: Glassmorphism cards, neon glows, cyber grid backgrounds
- **Animations**: Framer Motion page transitions, chart animations

## 📱 Pages Overview

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero, features, stats, testimonials |
| Dashboard | `/app/dashboard` | Analytics, radar chart, streak, recommendations |
| MCQ Practice | `/app/practice` | Subject filter, timed questions, AI explanations |
| Mock Test | `/app/mock-test` | Full exam simulation with palette |
| AI Tutor | `/app/ai-tutor` | RAG-powered chat with streaming |
| Analytics | `/app/analytics` | Deep charts, heatmaps, topic mastery |
| Leaderboard | `/app/leaderboard` | Rankings, XP, streaks |
| Study Plan | `/app/study-plan` | AI-generated schedule |

## 🚢 Deployment

### Vercel (Frontend)

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

### Railway / Render (Backend)

```bash
# Set environment variables in Railway dashboard
# Deploy from GitHub with auto-build
```

## 📄 License

MIT License — Free for personal and commercial use.

---

Built with ❤️ for GATE DA 2025 aspirants · Powered by Claude AI, Groq, Gemini & Supabase
