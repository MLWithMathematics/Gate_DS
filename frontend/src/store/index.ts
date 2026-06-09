import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, MCQ, ChatMessage, ChatSession, SubjectProgress, Subject } from '@/types'
import type { MockTestResult } from '@/types'
import { progressAPI, leaderboardAPI, bookmarksAPI } from '@/services/api'
import type { LeaderboardEntry, WeeklyStats, DailyProgress } from '@/types'

// ===== Auth Store =====
interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  resetAuth: () => void
  updateUser: (updates: Partial<User>) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        useProgressStore.getState().resetProgress?.()
        useChatStore.getState().resetChat?.()
        useMCQStore.getState().resetMCQStore?.()
        useMockTestStore.getState().resetTest?.()
      },
      resetAuth: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'gate-auth' }
  )
)

// ===== MCQ Store =====
interface MCQStore {
  currentMCQ: MCQ | null
  selectedOption: string | null
  isAnswered: boolean
  showExplanation: boolean
  bookmarkedIds: Set<string>
  attemptHistory: Array<{ mcq_id: string; correct: boolean; timestamp: Date }>
  setCurrentMCQ: (mcq: MCQ) => void
  selectOption: (option: string) => void
  revealAnswer: () => void
  toggleBookmark: (id: string, userId?: string) => Promise<void>
  hydrateBookmarks: (userId: string) => Promise<void>
  nextQuestion: () => void
  resetQuestion: () => void
  resetMCQStore: () => void
}

export const useMCQStore = create<MCQStore>((set) => ({
  currentMCQ: null,
  selectedOption: null,
  isAnswered: false,
  showExplanation: false,
  bookmarkedIds: new Set(),
  attemptHistory: [],
  setCurrentMCQ: (mcq) => set({ currentMCQ: mcq, selectedOption: null, isAnswered: false, showExplanation: false }),
  selectOption: (option) => set({ selectedOption: option }),
  revealAnswer: () =>
    set((state) => ({
      isAnswered: true,
      showExplanation: true,
      attemptHistory: state.currentMCQ
        ? [
            ...state.attemptHistory,
            {
               mcq_id: state.currentMCQ.id,
               correct: state.selectedOption === state.currentMCQ.answer,
               timestamp: new Date(),
            },
          ]
        : state.attemptHistory,
    })),
  toggleBookmark: async (id, userId) => {
    // Optimistic update
    set((state) => {
      const next = new Set(state.bookmarkedIds)
      next.has(id) ? next.delete(id) : next.add(id)
      return { bookmarkedIds: next }
    })
    // Sync with backend if user is logged in
    if (userId) {
      try {
        await bookmarksAPI.toggle(userId, id)
      } catch (e) {
        console.warn('Failed to sync bookmark:', e)
        // Revert on failure
        set((state) => {
          const next = new Set(state.bookmarkedIds)
          next.has(id) ? next.delete(id) : next.add(id)
          return { bookmarkedIds: next }
        })
      }
    }
  },
  hydrateBookmarks: async (userId: string) => {
    try {
      const ids = await bookmarksAPI.getIds(userId)
      set({ bookmarkedIds: new Set(ids) })
    } catch (e) {
      console.warn('Failed to hydrate bookmarks:', e)
    }
  },
  nextQuestion: () => set({ currentMCQ: null, selectedOption: null, isAnswered: false, showExplanation: false }),
  resetQuestion: () => set({ selectedOption: null, isAnswered: false, showExplanation: false }),
  resetMCQStore: () => set({ currentMCQ: null, selectedOption: null, isAnswered: false, showExplanation: false, bookmarkedIds: new Set(), attemptHistory: [] }),
}))

// ===== Mock Test Store =====
interface MockTestStore {
  isActive: boolean
  currentQuestionIndex: number
  answers: Record<string, string>
  flagged: Set<string>
  timeRemaining: number
  totalTime: number
  isSubmitted: boolean
  result: MockTestResult | null
  startTest: (totalTime: number) => void
  setAnswer: (mcqId: string, optionId: string) => void
  toggleFlag: (mcqId: string) => void
  goToQuestion: (index: number) => void
  nextQuestion: () => void
  prevQuestion: () => void
  tickTimer: () => void
  submitTest: (questions: MCQ[]) => void
  resetTest: () => void
}

export const useMockTestStore = create<MockTestStore>((set, get) => ({
  isActive: false,
  currentQuestionIndex: 0,
  answers: {},
  flagged: new Set(),
  timeRemaining: 0,
  totalTime: 0,
  isSubmitted: false,
  result: null,
  startTest: (totalTime) =>
    set({ isActive: true, timeRemaining: totalTime * 60, totalTime: totalTime * 60, answers: {}, flagged: new Set(), currentQuestionIndex: 0, isSubmitted: false, result: null }),
  setAnswer: (mcqId, optionId) =>
    set((state) => ({ answers: { ...state.answers, [mcqId]: optionId } })),
  toggleFlag: (mcqId) =>
    set((state) => {
      const next = new Set(state.flagged)
      next.has(mcqId) ? next.delete(mcqId) : next.add(mcqId)
      return { flagged: next }
    }),
  goToQuestion: (index) => set({ currentQuestionIndex: index }),
  nextQuestion: () => set((state) => ({ currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, 100) })),
  prevQuestion: () => set((state) => ({ currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0) })),
  tickTimer: () =>
    set((state) => {
      if (state.timeRemaining <= 0) return { isSubmitted: true }
      return { timeRemaining: state.timeRemaining - 1 }
    }),
  submitTest: (questions) => {
    const { answers } = get()
    let correct = 0
    const weakAreas: string[] = []
    questions.forEach((q) => {
      if (answers[q.id] === q.answer) correct++
      else weakAreas.push(q.topic)
    })
    const userId = useAuthStore.getState().user?.id || 'anonymous'
    const result: MockTestResult = {
      id: `result_${Date.now()}`,
      user_id: userId,
      test_id: 'test_001',
      score: correct,
      total: questions.length,
      duration: get().totalTime - get().timeRemaining,
      answers,
      weak_areas: [...new Set(weakAreas)],
      accuracy: Math.round((correct / questions.length) * 100),
      created_at: new Date(),
    }
    set({ isSubmitted: true, isActive: false, result })
  },
  resetTest: () =>
    set({ isActive: false, currentQuestionIndex: 0, answers: {}, flagged: new Set(), timeRemaining: 0, isSubmitted: false, result: null }),
}))

// ===== Chat Store =====
interface ChatStore {
  sessions: ChatSession[]
  activeSessionId: string | null
  isStreaming: boolean
  createSession: () => string
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, message: ChatMessage) => void
  updateLastMessage: (sessionId: string, content: string) => void
  setStreaming: (streaming: boolean) => void
  deleteSession: (id: string) => void
  resetChat: () => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      isStreaming: false,
      createSession: () => {
        const id = `chat_${Date.now()}`
        const session: ChatSession = {
          id,
          title: 'New Conversation',
          messages: [],
          created_at: new Date(),
          updated_at: new Date(),
        }
        set((state) => ({ sessions: [session, ...state.sessions], activeSessionId: id }))
        return id
      },
      setActiveSession: (id) => set({ activeSessionId: id }),
      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, message],
                  title: s.messages.length === 0 ? message.content.slice(0, 40) + '...' : s.title,
                  updated_at: new Date(),
                }
              : s
          ),
        })),
      updateLastMessage: (sessionId, content) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m, i) =>
                    i === s.messages.length - 1 ? { ...m, content, loading: false } : m
                  ),
                }
              : s
          ),
        })),
      setStreaming: (isStreaming) => set({ isStreaming }),
      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? state.sessions[0]?.id || null : state.activeSessionId,
        })),
      resetChat: () => set({ sessions: [], activeSessionId: null, isStreaming: false }),
    }),
    { name: 'gate-chat' }
  )
)

// ===== Progress Store =====
interface ProgressStore {
  subjectProgress: SubjectProgress[]
  weeklyStats: WeeklyStats[]
  dailyProgress: DailyProgress[]
  leaderboard: LeaderboardEntry[]
  attemptedQuestions: Record<string, Record<string, boolean>>
  offlineSubjectProgress: Record<string, SubjectProgress[]>
  selectedSubject: Subject | null
  isLoading: boolean
  isHydrated: boolean
  setSelectedSubject: (subject: Subject | null) => void
  updateProgress: (subject: Subject, topic: string, correct: boolean, isNewAttempt: boolean, isCorrection: boolean, mcqId: string, userId: string) => void
  hydrateFromBackend: (userId: string) => Promise<void>
  hydrateLeaderboard: (period?: 'weekly' | 'all_time') => Promise<void>
  resetProgress: () => void
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      subjectProgress: [],
      weeklyStats: [],
      dailyProgress: [],
      leaderboard: [],
      attemptedQuestions: {},
      offlineSubjectProgress: {},
      selectedSubject: null,
      isLoading: false,
      isHydrated: false,
      setSelectedSubject: (subject) => set({ selectedSubject: subject }),
      updateProgress: (subject, topic, correct, isNewAttempt, isCorrection, mcqId, userId) =>
        set((state) => {
          if (!isNewAttempt && !isCorrection) {
            return {
              attemptedQuestions: { 
                ...state.attemptedQuestions, 
                [userId]: { ...(state.attemptedQuestions[userId] || {}), [mcqId]: correct } 
              }
            }
          }

          let subjectExists = false
          let newProgress = state.subjectProgress.map((sp) => {
            if (sp.subject === subject) {
              subjectExists = true
              let topicExists = false
              let newTopics = sp.topics.map((t) => {
                if (t.topic === topic) {
                  topicExists = true
                  const currentCorrect = Math.round((t.accuracy * t.attempts) / 100)
                  const newCorrect = currentCorrect + (isCorrection ? 1 : correct ? 1 : 0)
                  const newAttempts = t.attempts + (isNewAttempt ? 1 : 0)
                  const newAccuracy = newAttempts > 0 ? Math.round((newCorrect / newAttempts) * 100) : 0
                  
                  return {
                    ...t,
                    attempts: newAttempts,
                    accuracy: newAccuracy,
                    mastery: newAccuracy,
                  }
                }
                return t
              })

              if (!topicExists) {
                newTopics.push({
                  topic,
                  attempts: 1,
                  accuracy: correct ? 100 : 0,
                  mastery: correct ? 100 : 0,
                })
              }

              const currentSpCorrect = Math.round((sp.accuracy * sp.attempts) / 100)
              const newSpCorrect = currentSpCorrect + (isCorrection ? 1 : correct ? 1 : 0)
              const newSpAttempts = sp.attempts + (isNewAttempt ? 1 : 0)
              const newSpAccuracy = newSpAttempts > 0 ? Math.round((newSpCorrect / newSpAttempts) * 100) : 0

              return {
                ...sp,
                attempts: newSpAttempts,
                accuracy: newSpAccuracy,
                mastery: newSpAccuracy,
                last_attempt: new Date(),
                topics: newTopics,
              }
            }
            return sp
          })

          if (!subjectExists) {
            newProgress.push({
              subject,
              attempts: 1,
              accuracy: correct ? 100 : 0,
              mastery: correct ? 100 : 0,
              last_attempt: new Date(),
              topics: [{
                topic,
                attempts: 1,
                accuracy: correct ? 100 : 0,
                mastery: correct ? 100 : 0,
              }],
            })
          }

          // Also update daily progress and weekly stats locally if needed? 
          // For now just updating subjectProgress is enough to show in the UI.

          return { 
            subjectProgress: newProgress,
            offlineSubjectProgress: {
              ...state.offlineSubjectProgress,
              [userId]: newProgress
            },
            attemptedQuestions: { 
              ...state.attemptedQuestions, 
              [userId]: { ...(state.attemptedQuestions[userId] || {}), [mcqId]: correct } 
            }
          }
        }),
      hydrateFromBackend: async (userId: string) => {
        set({ isLoading: true })
        try {
          const data = await progressAPI.getUserProgress(userId)
          set((state) => {
            if (data.subject_progress?.length === 0) {
              // If backend has no data, fallback to our offline cache for this user
              const cached = state.offlineSubjectProgress[userId]
              if (cached && cached.length > 0) {
                return { subjectProgress: cached, isHydrated: true }
              }
            }
            return {
              subjectProgress: data.subject_progress || [],
              weeklyStats: data.weekly_stats || [],
              dailyProgress: data.daily_progress || [],
              attemptedQuestions: {
                ...state.attemptedQuestions,
                [userId]: { 
                  ...(state.attemptedQuestions[userId] || {}), 
                  ...(data.attempted_mcqs || {}) 
                }
              },
              isHydrated: true,
            }
          })
        } catch (e) {
          console.warn('Failed to hydrate progress from backend, using local data:', e)
        } finally {
          set({ isLoading: false })
        }
      },
      hydrateLeaderboard: async (period: 'weekly' | 'all_time' = 'weekly') => {
        try {
          const response = await leaderboardAPI.get(20, period)
          if (response?.entries?.length) {
            set({ leaderboard: response.entries })
          } else {
            set({ leaderboard: [] })
          }
        } catch (e) {
          console.warn('Failed to load leaderboard:', e)
        }
      },
      resetProgress: () => set({ subjectProgress: [], weeklyStats: [], dailyProgress: [], isHydrated: false, selectedSubject: null }),
    }),
    { name: 'gate-progress' }
  )
)

// ===== UI Store =====
interface UIStore {
  sidebarCollapsed: boolean
  currentPage: string
  isDarkMode: boolean
  pomodoroActive: boolean
  pomodoroTime: number
  toggleSidebar: () => void
  setCurrentPage: (page: string) => void
  toggleDarkMode: () => void
  setPomodoroActive: (active: boolean) => void
  tickPomodoro: () => void
  resetPomodoro: () => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      currentPage: 'dashboard',
      isDarkMode: false,
      pomodoroActive: false,
      pomodoroTime: 25 * 60,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setCurrentPage: (page) => set({ currentPage: page }),
      toggleDarkMode: () =>
        set((state) => {
          const next = !state.isDarkMode
          document.documentElement.classList.toggle('dark', next)
          return { isDarkMode: next }
        }),
      setPomodoroActive: (pomodoroActive) => set({ pomodoroActive }),
      tickPomodoro: () => set((state) => ({ pomodoroTime: Math.max(0, state.pomodoroTime - 1) })),
      resetPomodoro: () => set({ pomodoroTime: 25 * 60, pomodoroActive: false }),
    }),
    { name: 'gate-ui' }
  )
)

// ===== Multiplayer Store =====
export interface MultiplayerState {
  ws: WebSocket | null
  status: 'disconnected' | 'connecting' | 'waiting' | 'playing' | 'finished'
  players: Record<string, string>
  scores: Record<string, number>
  currentMCQ: any | null
  currentIndex: number
  totalMCQs: number
  timeLimit: number
  timeLeft: number
  winner: string | null
  gameOverReason: string | null
  
  connect: (userId: string, userName: string) => void
  disconnect: () => void
  submitAnswer: (mcqId: string, answer: string) => void
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => {
  let timerInterval: any = null

  return {
    ws: null,
    status: 'disconnected',
    players: {},
    scores: {},
    currentMCQ: null,
    currentIndex: 0,
    totalMCQs: 0,
    timeLimit: 15,
    timeLeft: 15,
    winner: null,
    gameOverReason: null,

    connect: (userId: string, userName: string) => {
      if (get().ws) return
      set({ status: 'connecting' })
      // Use ws:// for http, wss:// for https
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      // Assuming backend is on the same host or port 8000
      // Vite proxy doesn't always handle ws easily in all environments, 
      // but let's try relative or absolute
      const host = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL).host : window.location.host
      
      // If we are proxying, ws://localhost:5173/api/multiplayer... might not be set up for ws.
      // We will point directly to the backend if VITE_API_URL is set.
      const wsUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/api/multiplayer/ws/${userId}?name=${encodeURIComponent(userName)}`
        : `${protocol}//localhost:8000/api/multiplayer/ws/${userId}?name=${encodeURIComponent(userName)}`

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        set({ status: 'waiting', ws })
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch(data.type) {
          case 'room_state':
            set({ status: data.status, players: data.players })
            break
          case 'game_start':
            set({ status: 'playing', players: data.players, scores: {} })
            break
          case 'question':
            clearInterval(timerInterval)
            set({ 
              currentMCQ: data.mcq, 
              currentIndex: data.index, 
              totalMCQs: data.total,
              timeLimit: data.time_limit,
              timeLeft: data.time_limit
            })
            // Start local timer countdown
            timerInterval = setInterval(() => {
              const { timeLeft } = get()
              if (timeLeft > 0) {
                set({ timeLeft: timeLeft - 1 })
              } else {
                clearInterval(timerInterval)
              }
            }, 1000)
            break
          case 'answer_reveal':
            clearInterval(timerInterval)
            // Can show correct answer visually. 
            // Also update scores
            set({ scores: data.scores })
            break
          case 'score_update':
            set({ scores: data.scores })
            break
          case 'game_over':
            clearInterval(timerInterval)
            set({ 
              status: 'finished', 
              scores: data.scores || get().scores,
              gameOverReason: data.reason || null 
            })
            break
        }
      }

      ws.onclose = () => {
        clearInterval(timerInterval)
        set({ status: 'disconnected', ws: null })
      }
    },

    disconnect: () => {
      const { ws } = get()
      if (ws) {
        ws.close()
      }
      clearInterval(timerInterval)
      set({ status: 'disconnected', ws: null, currentMCQ: null })
    },

    submitAnswer: (mcqId: string, answer: string) => {
      const { ws } = get()
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'submit_answer', mcqId, answer }))
      }
    }
  }
})

export * from './notificationStore'
