import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType =
  | 'streak_risk'
  | 'daily_challenge'
  | 'mock_result'
  | 'weak_area'
  | 'study_reminder'
  | 'rank_change'
  | 'new_mcqs'
  | 'xp_milestone'

export type NotificationPriority = 'high' | 'medium'

export interface AppNotification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  icon: string       // emoji icon
  color: string      // accent color
  read: boolean
  timestamp: Date
  actionLabel?: string
  actionPath?: string
}

interface NotificationStore {
  notifications: AppNotification[]
  lastGeneratedAt: string | null // ISO date string
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismissNotification: (id: string) => void
  clearAll: () => void
  generateSmartNotifications: (ctx: NotificationContext) => void
}

export interface NotificationContext {
  streak: number
  xp: number
  level: number
  subjectProgress: Array<{ subject: string; accuracy: number; attempts: number }>
  leaderboardRank?: number
  prevLeaderboardRank?: number
  lastMockScore?: number
  lastMockTotal?: number
  questionsToday: number
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      lastGeneratedAt: null,

      addNotification: (n) =>
        set((state) => ({
          notifications: [
            {
              ...n,
              id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              read: false,
              timestamp: new Date(),
            },
            ...state.notifications,
          ].slice(0, 50), // keep last 50
        })),

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),

      generateSmartNotifications: (ctx) => {
        const { notifications, lastGeneratedAt } = get()
        const now = new Date()
        const today = now.toISOString().slice(0, 10)

        // Only generate once per day
        if (lastGeneratedAt === today) return

        const add = get().addNotification
        const existing = new Set(notifications.filter(n => !n.read).map(n => n.type))

        // ─── HIGH PRIORITY ───

        // 1. Streak at risk
        if (ctx.streak > 0 && ctx.questionsToday === 0 && now.getHours() >= 18 && !existing.has('streak_risk')) {
          add({
            type: 'streak_risk',
            priority: 'high',
            title: 'Streak at risk! 🔥',
            message: `Your ${ctx.streak}-day streak will break if you don't practice today. Solve at least 1 question to keep it alive!`,
            icon: '🔥',
            color: '#EF4444',
            actionLabel: 'Practice Now',
            actionPath: '/app/practice',
          })
        }

        // 2. Daily challenge available
        if (!existing.has('daily_challenge')) {
          const topics = ['Machine Learning', 'Statistics', 'Linear Algebra', 'Probability', 'Deep Learning']
          const todayTopic = topics[now.getDay() % topics.length]
          add({
            type: 'daily_challenge',
            priority: 'high',
            title: 'Daily Challenge Ready ⚡',
            message: `Today's challenge: 5 ${todayTopic} questions in 10 minutes. Earn +50 XP bonus!`,
            icon: '⚡',
            color: '#2563EB',
            actionLabel: 'Start Challenge',
            actionPath: '/app/practice',
          })
        }

        // 3. Mock test results
        if (ctx.lastMockScore !== undefined && ctx.lastMockTotal && !existing.has('mock_result')) {
          const pct = Math.round((ctx.lastMockScore / ctx.lastMockTotal) * 100)
          add({
            type: 'mock_result',
            priority: 'high',
            title: 'Mock Test Graded ✅',
            message: `You scored ${ctx.lastMockScore}/${ctx.lastMockTotal} (${pct}%). ${pct >= 70 ? 'Great job!' : 'Review your weak areas to improve.'}`,
            icon: '✅',
            color: pct >= 70 ? '#059669' : '#D97706',
            actionLabel: 'View Results',
            actionPath: '/app/analytics',
          })
        }

        // 4. Weak area detected
        const weakSubjects = ctx.subjectProgress.filter(
          (s) => s.attempts >= 5 && s.accuracy < 50
        )
        if (weakSubjects.length > 0 && !existing.has('weak_area')) {
          const weakNames = weakSubjects.map((s) => s.subject).join(', ')
          add({
            type: 'weak_area',
            priority: 'high',
            title: 'Weak Area Detected ⚠️',
            message: `Your accuracy in ${weakNames} is below 50%. Focus on ${weakSubjects.length === 1 ? 'this subject' : 'these subjects'} to boost your overall score.`,
            icon: '⚠️',
            color: '#DC2626',
            actionLabel: 'Study Now',
            actionPath: '/app/practice',
          })
        }

        // ─── MEDIUM PRIORITY ───

        // 5. Study plan reminder
        if (now.getHours() >= 9 && now.getHours() <= 10 && !existing.has('study_reminder')) {
          add({
            type: 'study_reminder',
            priority: 'medium',
            title: 'Study Time 📖',
            message: 'Your scheduled study session is about to begin. Check your study plan for today\'s tasks.',
            icon: '📖',
            color: '#0891B2',
            actionLabel: 'View Plan',
            actionPath: '/app/study-plan',
          })
        }

        // 6. Leaderboard rank change
        if (ctx.leaderboardRank && ctx.prevLeaderboardRank && !existing.has('rank_change')) {
          if (ctx.leaderboardRank < ctx.prevLeaderboardRank) {
            add({
              type: 'rank_change',
              priority: 'medium',
              title: 'Rank Up! 🏆',
              message: `You moved from #${ctx.prevLeaderboardRank} to #${ctx.leaderboardRank} on the leaderboard. Keep pushing!`,
              icon: '🏆',
              color: '#7C3AED',
              actionLabel: 'Leaderboard',
              actionPath: '/app/leaderboard',
            })
          } else if (ctx.leaderboardRank > ctx.prevLeaderboardRank) {
            add({
              type: 'rank_change',
              priority: 'medium',
              title: 'Rank Dropped 📉',
              message: `You dropped from #${ctx.prevLeaderboardRank} to #${ctx.leaderboardRank}. Practice more to reclaim your spot!`,
              icon: '📉',
              color: '#D97706',
              actionLabel: 'Practice',
              actionPath: '/app/practice',
            })
          }
        }

        // 7. New MCQs added (simulate)
        if (now.getDay() === 1 && !existing.has('new_mcqs')) {
          add({
            type: 'new_mcqs',
            priority: 'medium',
            title: 'Fresh Questions Added 📝',
            message: '150 new MCQs across Machine Learning, Statistics, and Linear Algebra are now available. Start practicing!',
            icon: '📝',
            color: '#0891B2',
            actionLabel: 'Explore',
            actionPath: '/app/practice',
          })
        }

        // 8. XP milestone
        const xpMilestones = [100, 500, 1000, 2500, 5000, 10000]
        const reachedMilestone = xpMilestones.find((m) => ctx.xp >= m && ctx.xp < m + 100)
        if (reachedMilestone && !existing.has('xp_milestone')) {
          add({
            type: 'xp_milestone',
            priority: 'medium',
            title: `${reachedMilestone.toLocaleString()} XP Milestone! 🎉`,
            message: `You've earned ${ctx.xp.toLocaleString()} XP total. You're now Level ${ctx.level}. Amazing progress!`,
            icon: '🎉',
            color: '#7C3AED',
            actionLabel: 'View Profile',
            actionPath: '/app/dashboard',
          })
        }

        set({ lastGeneratedAt: today })
      },
    }),
    { name: 'gate-notifications' }
  )
)
