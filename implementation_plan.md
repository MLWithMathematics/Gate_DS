# Connect Frontend to Backend — Full Integration Plan

## Goal
Wire all 7 frontend pages to the live FastAPI backend, replacing hardcoded mock data with real API calls. Fix type mismatches, remove broken direct Anthropic calls, and ensure all data flows end-to-end through the backend.

---

## Proposed Changes

### Component 1: Backend Schema Fix — Add `badges` to `UserResponse`

The frontend `User` type includes `badges: Badge[]`, but the backend's `UserResponse` omits it. The Dashboard crashes silently when rendering badges from real API data.

#### [MODIFY] [schemas.py](file:///d:/gate-da-platform/backend/app/schemas/schemas.py)
- Add `badges` field (default `[]`) to `UserResponse` so the shape matches the frontend `User` type
- Add a `Badge` schema model

#### [MODIFY] [auth.py](file:///d:/gate-da-platform/backend/app/api/routes/auth.py)
- Return default badges array in `register` and `login` responses (since badges aren't stored in DB yet, return hardcoded defaults)

---

### Component 2: Frontend API Service — Clean Up & Extend

#### [MODIFY] [api.ts](file:///d:/gate-da-platform/frontend/src/services/api.ts)
- **Remove** the broken `aiAPI` object (lines 92–223) which directly calls Anthropic without an API key header — this will always fail with 401
- **Add** a new `doubtAPI` that calls the backend's `/api/doubt/stream` (SSE) and `/api/doubt` endpoints
- **Add** `leaderboardAPI.get()` calling `GET /api/leaderboard`
- **Add** `studyPlanAPI.generate()` calling `POST /api/study-plan`
- **Add** `subjectsAPI.get()` calling `GET /api/subjects`
- Ensure `mcqAPI`, `mockTestAPI`, `progressAPI` match the backend's actual request/response shapes (minor field name tweaks)

---

### Component 3: Frontend Store — Hydrate from Backend

#### [MODIFY] [store/index.ts](file:///d:/gate-da-platform/frontend/src/store/index.ts)
- Remove `MOCK_USER` import and usage — user data now comes from login API
- Remove `MOCK_SUBJECT_PROGRESS` import from `useProgressStore` initial state — start empty, hydrate from `/api/progress/{user_id}`
- Remove `MOCK_CHAT_SESSIONS` import from `useChatStore` initial state — start with empty sessions
- Add `hydrateProgress(userId)` action to `useProgressStore` that calls `progressAPI.getUserProgress()` and sets state
- Update `useMockTestStore.submitTest()` to also call `mockTestAPI.submit()` on the backend

---

### Component 4: MCQ Page — Fetch from Backend

#### [MODIFY] [MCQPage.tsx](file:///d:/gate-da-platform/frontend/src/pages/MCQPage.tsx)
- Replace `import { MOCK_MCQs } from '@/data/mockData'` with `import { mcqAPI } from '@/services/api'`
- Add `useEffect` to fetch questions from `mcqAPI.getQuestions(subject, topic, difficulty)` on mount and when filters change
- Add loading state while fetching
- On "Submit Answer", call `mcqAPI.submitAnswer()` server-side (which updates XP/progress in Supabase)
- On "AI Deep Dive", call backend `doubtAPI.stream()` instead of `simulateStream(DEMO_RESPONSES.default)`
- Keep `MOCK_MCQs` as fallback if API fails (graceful degradation)

---

### Component 5: Mock Test Page — Fetch from Backend

#### [MODIFY] [MockTestPage.tsx](file:///d:/gate-da-platform/frontend/src/pages/MockTestPage.tsx)
- Replace `const QUESTIONS = MOCK_MCQs` with a call to `mockTestAPI.generate()` when starting a test
- On test submit, call `mockTestAPI.submit()` to get server-side scoring + XP + weak areas
- Show real result data from the backend response

---

### Component 6: Dashboard Page — Live Data

#### [MODIFY] [DashboardPage.tsx](file:///d:/gate-da-platform/frontend/src/pages/DashboardPage.tsx)
- Replace `RADAR_DATA`, `MOCK_WEEKLY_STATS`, `MOCK_LEADERBOARD`, `MOCK_DAILY_PROGRESS` imports with API calls
- Add `useEffect` to call `progressAPI.getUserProgress(userId)` on mount → populates radar, weekly stats, daily progress
- Add `useEffect` to call `leaderboardAPI.get()` on mount → populates leaderboard section
- Generate `RADAR_DATA` dynamically from `subjectProgress` array
- Keep mock data as fallback with `try/catch`

---

### Component 7: Analytics Page — Live Data

#### [MODIFY] [AnalyticsPage.tsx](file:///d:/gate-da-platform/frontend/src/pages/AnalyticsPage.tsx)
- Replace `MOCK_WEEKLY_STATS`, `MOCK_DAILY_PROGRESS`, `RADAR_DATA` with data fetched from `progressAPI.getUserProgress(userId)`
- Add loading skeleton while data fetches

---

### Component 8: Doubt Solver Page — Real AI Streaming

#### [MODIFY] [DoubtSolverPage.tsx](file:///d:/gate-da-platform/frontend/src/pages/DoubtSolverPage.tsx)
- Replace `simulateStream(DEMO_RESPONSES.default)` with real call to backend's `/api/doubt/stream` (SSE)
- Parse the SSE `data: {"token": "...", "done": false}` format from the backend
- Fallback to `simulateStream` if backend is unavailable

---

### Component 9: Leaderboard Page — Live Data

#### [MODIFY] [LeaderboardPage.tsx](file:///d:/gate-da-platform/frontend/src/pages/LeaderboardPage.tsx)
- Replace `MOCK_LEADERBOARD` with call to `leaderboardAPI.get(userId)`
- Map backend response to frontend `LeaderboardEntry` type

---

### Component 10: Study Plan Page — Real AI Generation

#### [MODIFY] [StudyPlanPage.tsx](file:///d:/gate-da-platform/frontend/src/pages/StudyPlanPage.tsx)
- Replace `simulateStream(hardcoded planText)` with a call to `studyPlanAPI.generate(userId, daysLeft, dailyHours)`
- Stream the response or display it after generation

---

### Component 11: Cleanup

#### [MODIFY] [mockData.ts](file:///d:/gate-da-platform/frontend/src/data/mockData.ts)
- Keep the file but mark exports as `/** @deprecated — fallback only */`
- These remain available for graceful degradation when the backend is unreachable

#### [MODIFY] [types/index.ts](file:///d:/gate-da-platform/frontend/src/types/index.ts)
- Make `badges` optional on `User` type: `badges?: Badge[]` (since backend may not return them initially)

---

## Execution Order

The changes have dependencies, so we follow this order:

```
Phase 1: Backend fix (schemas)
  1. schemas.py — add Badge + badges to UserResponse
  2. auth.py — return badges in login/register

Phase 2: Frontend API layer
  3. api.ts — remove broken Anthropic calls, add doubt/leaderboard/studyPlan APIs
  4. types/index.ts — make badges optional

Phase 3: Frontend store
  5. store/index.ts — remove mock imports, add hydration actions

Phase 4: Connect pages (independent of each other)
  6. MCQPage.tsx — fetch MCQs from backend
  7. MockTestPage.tsx — generate/submit via backend
  8. DashboardPage.tsx — live progress + leaderboard
  9. AnalyticsPage.tsx — live progress data
  10. DoubtSolverPage.tsx — real AI streaming
  11. LeaderboardPage.tsx — live leaderboard
  12. StudyPlanPage.tsx — real AI study plan

Phase 5: Cleanup
  13. mockData.ts — deprecation markers
```

---

## Verification Plan

### Automated Tests
1. **Backend health**: `curl http://localhost:8000/health` — verify all checks pass
2. **Auth flow**: Register → Login → `/api/auth/me` with token
3. **MCQ fetch**: `curl http://localhost:8000/api/mcq?limit=5` — verify returns data
4. **Leaderboard**: `curl http://localhost:8000/api/leaderboard` — verify returns entries

### Browser Testing
1. **Login flow** → verify dashboard loads with real user data (name, XP, streak from Supabase)
2. **MCQ Page** → verify questions load from backend, submit updates progress in Supabase
3. **Mock Test** → generate test → complete → submit → verify results show server-side scores
4. **Doubt Solver** → ask a question → verify real AI response streams (Groq/Gemini, not demo text)
5. **Dashboard** → verify charts show data from `/api/progress` not mock arrays
6. **Leaderboard** → verify shows real users from Supabase
7. **Study Plan** → generate → verify AI-generated content (not hardcoded markdown)
8. **Analytics** → verify heatmap/charts use real progress data

### Graceful Degradation
9. Stop backend → verify pages still load with fallback data, show appropriate error toasts

---

## Open Questions

> [!IMPORTANT]
> **Mock data fallback strategy**: Should we keep `mockData.ts` as a complete fallback when the backend is unreachable, or show error states? The plan above keeps mock data as fallback for a smoother demo experience.

> [!IMPORTANT]
> **Badges system**: The backend doesn't store badges in Supabase yet. Should I add a `badges` table + achievement logic now, or return hardcoded defaults from the backend for now? The plan above returns hardcoded defaults.

> [!IMPORTANT]
> **Doubt Solver routing**: The backend has a RAG pipeline (`/api/doubt/stream`) using Groq/Gemini. The frontend `api.ts` also has a direct Anthropic client (broken, no API key). The plan removes the Anthropic client entirely and routes everything through the backend's RAG pipeline. Is that correct?
