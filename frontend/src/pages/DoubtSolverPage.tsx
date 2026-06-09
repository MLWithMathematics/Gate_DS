import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import {
  Send, Brain, Plus, Trash2, MessageSquare, Sparkles, Lightbulb,
  Copy, Check, ChevronDown, BookOpen, Zap, RotateCcw
} from 'lucide-react'
import { useChatStore } from '@/store'
import { simulateStream, DEMO_RESPONSES, doubtAPI } from '@/services/api'
import { SUGGESTED_QUESTIONS } from '@/tests/mocks/mockData'
import type { ChatMessage } from '@/types'
import toast from 'react-hot-toast'

const QUICK_PROMPTS = [
  { label: 'Explain Simply', icon: Lightbulb, prompt: 'Explain this in the simplest way possible using an everyday analogy: ' },
  { label: 'Solve Step-by-Step', icon: BookOpen, prompt: 'Solve this step by step with detailed working: ' },
  { label: 'GATE Formula', icon: Zap, prompt: 'Give me all important formulas and shortcuts for GATE on: ' },
  { label: 'PYQ Pattern', icon: Brain, prompt: 'Show me GATE PYQ patterns and common question types for: ' },
]

function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-sm ${isUser
          ? 'bg-blue-50 border border-blue-200 text-flux-blue font-bold'
          : 'bg-gradient-to-br from-blue-600 to-cyan-600'
        }`}>
        {isUser ? 'A' : <Brain size={16} className="text-white" />}
      </div>

      {/* Bubble */}
      <div className={`relative max-w-[85%] group ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {isUser ? (
          <div className="chat-user">
            <p className="text-white text-sm leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <div className="chat-ai">
            {message.loading ? (
              <div className="flex gap-1.5 py-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-flux-blue"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }} />
                ))}
              </div>
            ) : (
              <div className="ai-prose">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Copy button */}
        {!message.loading && !isUser && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-6 right-0 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-flux-slate hover:text-flux-dark opacity-0 group-hover:opacity-100 transition-all"
          >
            {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
          </button>
        )}

        <span className="text-[10px] text-flux-slate mt-1.5 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

export default function DoubtSolverPage() {
  const [input, setInput] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { sessions, activeSessionId, isStreaming, createSession, setActiveSession, addMessage, updateLastMessage, setStreaming, deleteSession } = useChatStore()

  const activeSession = sessions.find(s => s.id === activeSessionId)
  const messages = activeSession?.messages || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isAtBottom) scrollToBottom()
  }, [messages])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50)
  }

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim()
    if (!content || isStreaming) return

    let sessionId = activeSessionId
    if (!sessionId) {
      sessionId = createSession()
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    addMessage(sessionId, userMsg)
    setInput('')

    // Add loading AI message
    const aiMsgId = `msg_${Date.now() + 1}`
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    }
    addMessage(sessionId, aiMsg)
    setStreaming(true)
    scrollToBottom()

    try {
      let fullContent = ''
      const stream = doubtAPI.stream(content)
      for await (const chunk of stream) {
        fullContent += chunk
        updateLastMessage(sessionId, fullContent)
      }
    } catch (e) {
      console.warn('Backend RAG failed, falling back to simulated stream', e)
      try {
        let fullContent = ''
        const stream = simulateStream(DEMO_RESPONSES.default, 12)
        for await (const chunk of stream) {
          fullContent += chunk
          updateLastMessage(sessionId, fullContent)
        }
      } catch {
        updateLastMessage(sessionId, '❌ AI service temporarily unavailable. Please check your API configuration.')
        toast.error('AI service error')
      }
    } finally {
      setStreaming(false)
    }
  }, [input, activeSessionId, isStreaming, createSession, addMessage, updateLastMessage, setStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleQuickPrompt = (prefix: string) => {
    setInput(prefix)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-[calc(100vh-65px)] overflow-hidden">
      {/* Sessions Sidebar */}
      <div className="hidden lg:flex flex-col w-64 border-r border-flux-border bg-flux-light p-3 flex-shrink-0">
        <button
          onClick={() => { createSession() }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-flux-blue text-sm font-medium hover:bg-blue-100 transition-all mb-3"
        >
          <Plus size={15} />
          New Conversation
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => setActiveSession(session.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${session.id === activeSessionId
                  ? 'bg-blue-50 border border-blue-200 text-flux-dark'
                  : 'text-flux-slate hover:bg-white hover:text-flux-dark'
                }`}
            >
              <MessageSquare size={13} className="flex-shrink-0" />
              <span className="text-xs truncate flex-1">{session.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 transition-all"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>

        {/* Quick prompts */}
        <div className="mt-3 pt-3 border-t border-flux-border">
          <div className="text-[10px] text-flux-slate mb-2 font-medium uppercase tracking-wider px-1">Quick Actions</div>
          {QUICK_PROMPTS.map(({ label, icon: Icon, prompt }) => (
            <button
              key={label}
              onClick={() => handleQuickPrompt(prompt)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-flux-slate hover:text-flux-dark hover:bg-white transition-all mb-0.5"
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-flux-border flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB, #0891B2)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
              <Brain size={17} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-flux-dark">AI Tutor</div>
              <div className="flex items-center gap-1.5 text-[11px] text-flux-slate">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Powered by AI · RAG-enhanced
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg glass-card text-flux-slate hover:text-flux-dark transition-all" title="Reset conversation">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-6 bg-flux-light"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
                style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)', border: '1px solid #BFDBFE' }}
              >
                <Brain size={36} className="text-flux-blue" />
              </motion.div>
              <h3 className="text-lg font-semibold text-flux-dark mb-2">Ask Me Anything</h3>
              <p className="text-sm text-flux-slate max-w-md mb-8">
                I'm your GATE DS AI tutor. Ask about ML concepts, math derivations, statistics, algorithms — I'll explain with formulas and examples.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTED_QUESTIONS.slice(0, 6).map((q) => (
                  <motion.button
                    key={q}
                    whileHover={{ y: -2 }}
                    onClick={() => sendMessage(q)}
                    className="glass-card-hover p-3 rounded-xl text-left text-xs text-flux-slate hover:text-flux-dark transition-all"
                  >
                    <Sparkles size={11} className="text-flux-blue mb-1.5 inline mr-1.5" />
                    {q}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Scroll to bottom */}
        <AnimatePresence>
          {!isAtBottom && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 p-2 rounded-full glass-card border border-flux-border text-flux-slate hover:text-flux-dark transition-all"
            >
              <ChevronDown size={16} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Suggested prompts when not empty */}
        {messages.length > 0 && (
          <div className="px-4 lg:px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-flux-border bg-white">
            {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl glass-card text-xs text-flux-slate hover:text-flux-dark whitespace-nowrap transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="px-4 lg:px-6 py-4 border-t border-flux-border flex-shrink-0 bg-white">
          <div className="flex items-end gap-3 glass-card px-4 py-3 rounded-2xl border border-flux-border focus-within:border-flux-blue transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about GATE DS... (Shift+Enter for new line)"
              className="flex-1 bg-transparent text-sm text-flux-dark placeholder:text-flux-slate/50 resize-none outline-none max-h-32 min-h-[24px]"
              rows={1}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 128)}px`
              }}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-flux-slate hidden sm:block">⏎ to send</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${input.trim() && !isStreaming
                    ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-card'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {isStreaming ? (
                  <motion.div className="w-4 h-4 border-2 border-flux-blue border-t-transparent rounded-full"
                    animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                ) : (
                  <Send size={15} />
                )}
              </motion.button>
            </div>
          </div>
          <p className="text-[10px] text-flux-slate text-center mt-2">
            responses use AI · Verify critical information · Not a substitute for textbooks
          </p>
        </div>
      </div>
    </div>
  )
}
