import type { MCQ, Subject, Difficulty, MockTest, User, LeaderboardEntry, SubjectProgress, WeeklyStats, DailyProgress } from '@/types'
import { useAuthStore } from '@/store'

const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000')

// Helper fetch wrapper
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${res.status}`)
  }
  return res.json()
}

// ===== Auth API =====
export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    apiFetch<{ access_token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  getMe: () =>
    apiFetch<User>('/api/auth/me'),
}

// ===== MCQ API =====
export const mcqAPI = {
  getQuestions: (subject?: Subject, topic?: string, difficulty?: Difficulty, limit = 20) => {
    const params = new URLSearchParams()
    if (subject) params.set('subject', subject)
    if (topic) params.set('topic', topic)
    if (difficulty) params.set('difficulty', difficulty)
    params.set('limit', String(limit))
    return apiFetch<MCQ[]>(`/api/mcq?${params}`)
  },
  generateMCQ: (subject: Subject, topic: string, difficulty: Difficulty, count = 5) =>
    apiFetch<MCQ[]>('/api/mcq/generate', {
      method: 'POST',
      body: JSON.stringify({ subject, topic, difficulty, count }),
    }),
  submitAnswer: (mcqId: string, answer: string, userId: string, timeTaken?: number) =>
    apiFetch<{ correct: boolean; correct_answer: string; explanation: string; xp_earned: number; already_attempted: boolean }>('/api/mcq/submit', {
      method: 'POST',
      body: JSON.stringify({ mcq_id: mcqId, answer, user_id: userId, time_taken: timeTaken }),
    }),
  getExplanation: (mcqId: string) =>
    apiFetch<{ explanation: string }>(`/api/mcq/${mcqId}/explain`),
}

// ===== Mock Test API =====
export const mockTestAPI = {
  generate: (subject: string = 'Mixed', duration: number = 180, difficulty: string = 'Medium', questionCount: number = 65) =>
    apiFetch<MockTest>('/api/mock-test/generate', {
      method: 'POST',
      body: JSON.stringify({ subject, duration, difficulty, question_count: questionCount }),
    }),
  submit: (testId: string, answers: Record<string, string>, userId: string, timeTaken: number) =>
    apiFetch<{ score: number; total: number; accuracy: number; weak_areas: string[]; xp_earned: number }>('/api/mock-test/submit', {
      method: 'POST',
      body: JSON.stringify({ test_id: testId, answers, user_id: userId, time_taken: timeTaken }),
    }),
  getHistory: (userId: string) =>
    apiFetch<Array<{ id: string; score: number; total: number; accuracy: number; created_at: string }>>(`/api/mock-test/history/${userId}`),
}

// ===== Progress API =====
export const progressAPI = {
  getUserProgress: (userId: string) =>
    apiFetch<{
      subject_progress: SubjectProgress[]
      weekly_stats: WeeklyStats[]
      daily_progress: DailyProgress[]
      attempted_mcqs?: Record<string, boolean>
      total_questions: number
      overall_accuracy: number
    }>(`/api/progress/${userId}`),
  updateProgress: (userId: string, subject: Subject, topic: string, correct: boolean, timeTaken?: number) =>
    apiFetch<void>('/api/progress/update', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, subject, topic, correct, time_taken: timeTaken }),
    }),
  getWeakAreas: (userId: string) =>
    apiFetch<{ weak_areas: Array<{ subject: string; topic: string; accuracy: number }> }>(`/api/progress/weak-areas/${userId}`),
}

// ===== Doubt Solver API (streams via backend RAG pipeline) =====
export const doubtAPI = {
  async *stream(question: string, context?: string): AsyncGenerator<string> {
    const token = useAuthStore.getState().token
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${API_BASE}/api/doubt/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, context }),
    })

    if (!response.ok || !response.body) {
      throw new Error('AI service unavailable')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return
          try {
            const parsed = JSON.parse(data)
            if (parsed.token) {
              yield parsed.token
            } else if (parsed.text) {
              yield parsed.text
            } else if (typeof parsed === 'string') {
              yield parsed
            }
          } catch {
            // Non-JSON data line, yield as-is
            if (data.trim()) yield data
          }
        }
      }
    }
  },

  ask: (question: string, context?: string) =>
    apiFetch<{ answer: string; sources?: string[] }>('/api/doubt', {
      method: 'POST',
      body: JSON.stringify({ question, context }),
    }),

  explainSimply: (concept: string) =>
    apiFetch<{ explanation: string }>('/api/doubt/explain-simple', {
      method: 'POST',
      body: JSON.stringify({ concept }),
    }),
}

// ===== Bookmarks API =====
export const bookmarksAPI = {
  get: (userId: string) =>
    apiFetch<MCQ[]>(`/api/bookmarks/${userId}`),
  getIds: (userId: string) =>
    apiFetch<string[]>(`/api/bookmarks/${userId}/ids`),
  toggle: (userId: string, mcqId: string) =>
    apiFetch<{ status: string; bookmarked: boolean }>(`/api/bookmarks/${userId}/${mcqId}`, {
      method: 'POST',
    }),
}

// ===== Flashcards API =====
export const flashcardAPI = {
  getDailyCards: (userId: string, limit = 20) =>
    apiFetch<MCQ[]>(`/api/flashcards/${userId}?limit=${limit}`),
}

// ===== Admin API =====
export const adminAPI = {
  getMCQs: (limit = 50, offset = 0) =>
    apiFetch<MCQ[]>(`/api/admin/mcqs?limit=${limit}&offset=${offset}`),
  createMCQ: (data: Partial<MCQ>) =>
    apiFetch<MCQ>('/api/admin/mcqs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMCQ: (id: string, data: Partial<MCQ>) =>
    apiFetch<MCQ>(`/api/admin/mcqs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteMCQ: (id: string) =>
    apiFetch<{ status: string; message: string }>(`/api/admin/mcqs/${id}`, {
      method: 'DELETE',
    }),
  createSyllabus: (data: { subject: string; topic: string; content: string }) =>
    apiFetch('/api/admin/syllabus', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ===== Leaderboard API =====
export const leaderboardAPI = {
  get: (limit = 20, period: 'weekly' | 'all_time' = 'weekly') =>
    apiFetch<{ entries: LeaderboardEntry[]; my_rank: number | null; total_users: number }>(
      `/api/leaderboard?limit=${limit}&period=${period}`
    ),
}

// ===== Study Plan API =====
export const studyPlanAPI = {
  generate: (userId: string, daysLeft: number, dailyHours: number = 6) =>
    apiFetch<{ plan: string }>('/api/study-plan', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, days_until_exam: daysLeft, daily_hours: dailyHours }),
    }),
  get: (userId: string) =>
    apiFetch<{ plan: string }>(`/api/study-plan/${userId}`),
  save: (userId: string, planText: string) =>
    apiFetch<{ status: string }>('/api/study-plan/save', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, plan_text: planText }),
    }),
  async *chatStream(userId: string, message: string, chatHistory: any[] = []): AsyncGenerator<string> {
    const token = useAuthStore.getState().token
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(`${API_BASE}/api/study-plan/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id: userId, message, chat_history: chatHistory }),
    })

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Chat error')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield decoder.decode(value, { stream: true })
    }
  }
}

// ===== Subjects API =====
export const subjectsAPI = {
  get: () => apiFetch<string[]>('/api/subjects'),
}

// ===== Fallback: Simulated streaming for when backend AI is unavailable =====
export async function* simulateStream(text: string, delayMs = 20): AsyncGenerator<string> {
  const words = text.split(' ')
  for (const word of words) {
    yield word + ' '
    await new Promise((r) => setTimeout(r, delayMs))
  }
}

export const DEMO_RESPONSES: Record<string, string> = {
  default: `## Great Question! 🎯

Let me break this down step by step.

### Key Concept

This topic is fundamental to GATE DS preparation. The core idea involves understanding both the **theoretical foundation** and **practical applications**.

### Mathematical Foundation

For a given function $f(x)$, the key relationship is:

$$\\\\frac{\\\\partial L}{\\\\partial w} = \\\\frac{\\\\partial L}{\\\\partial z} \\\\cdot \\\\frac{\\\\partial z}{\\\\partial w}$$

This chain rule application is what powers most of machine learning optimization.

### Important Points for GATE

1. **Definition** — Always start with the formal definition
2. **Properties** — Understand key properties and edge cases  
3. **Applications** — Know when and why to use this
4. **Common mistakes** — Avoid typical errors seen in exam

### Quick Tip 💡

In GATE DS 2024, this concept appeared in **3 questions**. Focus on the mathematical derivation and intuitive understanding.

Would you like me to solve a practice problem on this topic?`,
}
