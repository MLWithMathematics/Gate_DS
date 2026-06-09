import type { Subject } from './core'

export interface SubjectProgress {
  subject: Subject
  accuracy: number
  attempts: number
  last_attempt: Date
  mastery: number // 0-100
  topics: TopicProgress[]
}

export interface TopicProgress {
  topic: string
  accuracy: number
  attempts: number
  mastery: number
}

export interface DailyProgress {
  date: string
  questions_attempted: number
  correct: number
  accuracy: number
  study_time: number // minutes
  xp_earned: number
}

export interface RadarDataPoint {
  subject: string
  value: number
  fullMark: number
}

export interface StreakData {
  date: string
  active: boolean
  questions: number
}

export interface WeeklyStats {
  week: string
  accuracy: number
  attempts: number
  time: number
}

export interface StudyPlanTask {
  id: string
  subject: Subject
  topic: string
  type: 'MCQ' | 'PYQ' | 'Concept' | 'Mock'
  estimated_time: number
  completed: boolean
  due_date: Date
  priority: 'High' | 'Medium' | 'Low'
}

export interface StudyPlan {
  id: string
  user_id: string
  exam_date: Date
  daily_tasks: StudyPlanTask[]
  weekly_goals: string[]
  ai_recommendations: string[]
}
