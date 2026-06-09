import type { Subject } from './core'

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  unlocked_at?: Date
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  streak: number
  total_score: number
  xp: number
  level: number
  weak_subjects: Subject[]
  created_at: Date
  badges?: Badge[]
  role?: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  avatar?: string
  score: number
  streak: number
  accuracy: number
  badge: string
}
