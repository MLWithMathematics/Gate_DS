export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  latex?: string
  loading?: boolean
  sources?: string[]
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  created_at: Date
  updated_at: Date
}
