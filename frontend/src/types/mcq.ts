import type { Subject, Difficulty, SourceType } from './core'

export interface MCQOption {
  id: string
  text: string
  latex?: string
}

export interface MCQ {
  id: string
  subject: Subject
  topic: string
  question: string
  options: MCQOption[]
  answer: string
  explanation: string
  difficulty: Difficulty
  source_type: SourceType
  year?: number
  tags?: string[]
  bookmarked?: boolean
}

export interface MCQAttempt {
  mcq_id: string
  selected_option: string
  is_correct: boolean
  time_taken: number
  timestamp: Date
}

export interface MockTest {
  id: string
  title: string
  subject: Subject | 'Mixed'
  questions: MCQ[]
  duration: number // in minutes
  total_marks: number
}

export interface MockTestResult {
  id: string
  user_id: string
  test_id: string
  score: number
  total: number
  duration: number
  answers: Record<string, string>
  weak_areas: string[]
  accuracy: number
  created_at: Date
}
