import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import {
  ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Lightbulb,
  Timer, Filter, RefreshCw, CheckCircle2, XCircle, Zap, Brain,
  Shuffle, BarChart3, Loader2
} from 'lucide-react'
import { MOCK_MCQs } from '@/tests/mocks/mockData'
import { GATE_DA_SUBJECTS, SUBJECT_TOPICS, type Subject, type Difficulty, type MCQ } from '@/types'
import { useMCQStore, useProgressStore, useAuthStore } from '@/store'
import { mcqAPI, doubtAPI, simulateStream, DEMO_RESPONSES } from '@/services/api'
import toast from 'react-hot-toast'

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']
const DIFFICULTY_COLORS = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' }

function QuestionCard({ mcq, onSelect, selectedOption, isAnswered }: {
  mcq: MCQ
  onSelect: (id: string) => void
  selectedOption: string | null
  isAnswered: boolean
}) {
  const getOptionClass = (optId: string) => {
    if (!isAnswered) return selectedOption === optId ? 'selected' : ''
    if (optId === mcq.answer) return 'correct'
    if (optId === selectedOption && optId !== mcq.answer) return 'incorrect'
    return ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge-purple">{mcq.subject}</span>
        <span className="badge-cyan">{mcq.topic}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: `${DIFFICULTY_COLORS[mcq.difficulty]}15`,
            border: `1px solid ${DIFFICULTY_COLORS[mcq.difficulty]}40`,
            color: DIFFICULTY_COLORS[mcq.difficulty],
          }}
        >
          {mcq.difficulty}
        </span>
        {mcq.source_type === 'PYQ' && (
          <span className="badge-orange">PYQ {mcq.year}</span>
        )}
      </div>

      <div className="ai-prose">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {mcq.question}
        </ReactMarkdown>
      </div>

      <div className="space-y-2.5 mt-6">
        {mcq.options.map((opt) => (
          <motion.button
            key={opt.id}
            whileHover={!isAnswered ? { x: 4 } : {}}
            whileTap={!isAnswered ? { scale: 0.99 } : {}}
            onClick={() => !isAnswered && onSelect(opt.id)}
            className={`mcq-option ${getOptionClass(opt.id)}`}
            disabled={isAnswered}
          >
            <div className="flex items-start gap-3">
              <span className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold border transition-colors ${
                getOptionClass(opt.id) === 'correct' ? 'bg-green-50 border-green-300 text-green-600' :
                getOptionClass(opt.id) === 'incorrect' ? 'bg-red-50 border-red-300 text-red-600' :
                getOptionClass(opt.id) === 'selected' ? 'bg-blue-50 border-blue-300 text-blue-600' :
                'bg-slate-50 border-slate-200 text-flux-slate'
              }`}>
                {opt.id.toUpperCase()}
              </span>
              <div className="ai-prose flex-1 text-left">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {opt.text}
                </ReactMarkdown>
              </div>
              {isAnswered && opt.id === mcq.answer && (
                <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
              )}
              {isAnswered && opt.id === selectedOption && opt.id !== mcq.answer && (
                <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function ExplanationPanel({ mcq, onAIExplain }: { mcq: MCQ; onAIExplain: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-5 p-5 rounded-2xl border border-green-200 bg-green-50"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={15} className="text-green-600" />
          <span className="text-sm font-semibold text-green-700">Explanation</span>
        </div>
        <button
          onClick={onAIExplain}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 border border-blue-200 text-flux-blue hover:bg-blue-100 transition-all"
        >
          <Zap size={12} />
          AI Deep Dive
        </button>
      </div>
      <div className="ai-prose text-sm">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {mcq.explanation}
        </ReactMarkdown>
      </div>
    </motion.div>
  )
}

function AIPanel({ content, loading }: { content: string; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 p-5 rounded-2xl border border-blue-200 bg-blue-50"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center">
          <Brain size={11} className="text-flux-blue" />
        </div>
        <span className="text-xs font-semibold text-flux-blue">AI Tutor</span>
        {loading && (
          <div className="flex gap-1 ml-auto">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-flux-blue"
                animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
            ))}
          </div>
        )}
      </div>
      <div className="ai-prose text-sm">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {content}
        </ReactMarkdown>
      </div>
    </motion.div>
  )
}

export default function MCQPage() {
  const [filteredSubject, setFilteredSubject] = useState<Subject | 'All'>('All')
  const [filteredDifficulty, setFilteredDifficulty] = useState<Difficulty | 'All'>('All')
  const [filteredTopic, setFilteredTopic] = useState('All')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [aiContent, setAiContent] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [allFetchedQuestions, setAllFetchedQuestions] = useState<MCQ[]>([])
  const [questions, setQuestions] = useState<MCQ[]>(MOCK_MCQs)
  const [fetchingQuestions, setFetchingQuestions] = useState(false)

  const { selectedOption, isAnswered, showExplanation, bookmarkedIds, setCurrentMCQ, selectOption, revealAnswer, toggleBookmark, currentMCQ } = useMCQStore()
  const updateProgress = useProgressStore((state) => state.updateProgress)
  const user = useAuthStore((state) => state.user)

  // Fetch questions from backend on mount and when filters change
  useEffect(() => {
    const fetchQuestions = async () => {
      setFetchingQuestions(true)
      try {
        const subject = filteredSubject !== 'All' ? filteredSubject : undefined
        const difficulty = filteredDifficulty !== 'All' ? filteredDifficulty : undefined
        // Fetch all topics for this subject from backend
        const data = await mcqAPI.getQuestions(subject, undefined, difficulty, 500)
        setAllFetchedQuestions(data || [])
      } catch {
        // Fallback to local mock data ONLY if backend fails
        const filtered = MOCK_MCQs.filter(q => {
          if (filteredSubject !== 'All' && q.subject !== filteredSubject) return false
          if (filteredDifficulty !== 'All' && q.difficulty !== filteredDifficulty) return false
          return true
        })
        setAllFetchedQuestions(filtered)
      } finally {
        setFetchingQuestions(false)
        setQuestionIndex(0)
      }
    }
    fetchQuestions()
  }, [filteredSubject, filteredDifficulty])

  // Apply topic filter locally so we have access to all unique topics
  useEffect(() => {
    if (filteredTopic === 'All') {
      setQuestions(allFetchedQuestions)
    } else {
      setQuestions(allFetchedQuestions.filter(q => q.topic === filteredTopic))
    }
    setQuestionIndex(0)
  }, [allFetchedQuestions, filteredTopic])

  const mcq = questions[questionIndex]

  useEffect(() => {
    if (mcq) {
      setCurrentMCQ(mcq)
      setTimeLeft(mcq.difficulty === 'Easy' ? 60 : mcq.difficulty === 'Medium' ? 90 : 120)
      setTimerActive(true)
      setAiContent('')
    }
  }, [questionIndex, questions])

  // Timer
  useEffect(() => {
    if (!timerActive || timeLeft <= 0 || isAnswered) return
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [timerActive, timeLeft, isAnswered])

  const handleAnswer = async () => {
    if (!selectedOption) { toast.error('Please select an option!'); return }
    if (!user?.id) { toast.error('Please login to save progress'); return }

    revealAnswer()
    const correct = selectedOption === mcq.answer
    setTimerActive(false)

    // Check local cache for UI hint (but server is authoritative)
    const userAttempts = useProgressStore.getState().attemptedQuestions[user.id] || {}
    const pastAttempt = userAttempts[mcq.id]
    const isNewAttempt = pastAttempt === undefined
    const isCorrection = pastAttempt === false && correct

    // Submit to server — server decides XP (prevents cross-browser duplication)
    let xpEarned = 0
    let alreadyAttempted = false

    try {
      const result = await mcqAPI.submitAnswer(mcq.id, selectedOption, user.id)
      xpEarned = result.xp_earned
      alreadyAttempted = result.already_attempted

      // Sync local progress from server
      await useProgressStore.getState().hydrateFromBackend(user.id)
    } catch {
      // Offline fallback: compute XP locally (best-effort)
      if (isNewAttempt) {
        xpEarned = correct ? 10 : 2
      } else if (isCorrection) {
        xpEarned = 8
      }
    }

    // Update local cache for instant UI feedback
    updateProgress(mcq.subject, mcq.topic, correct, isNewAttempt, isCorrection, mcq.id, user.id)

    // Update user XP using server-authoritative value
    if (xpEarned > 0) {
      useAuthStore.getState().updateUser({ xp: (user.xp || 0) + xpEarned })
    }

    let message = ''
    if (alreadyAttempted && pastAttempt === true) {
      message = '✅ Correct! (Already Solved)'
    } else if (alreadyAttempted) {
      message = correct ? '✅ Correct! (Already Solved)' : '❌ Incorrect (Already Attempted)'
    } else if (isNewAttempt) {
      message = correct ? `✅ Correct! +${xpEarned} XP` : `❌ Incorrect. +${xpEarned} XP.`
    } else if (isCorrection) {
      message = `✅ Corrected! +${xpEarned} XP`
    } else {
      message = '❌ Still Incorrect. Review explanation'
    }

    toast[correct ? 'success' : 'error'](message)
  }

  const handleNext = () => {
    setQuestionIndex(i => (i + 1) % questions.length)
    setAiContent('')
  }
  const handlePrev = () => {
    setQuestionIndex(i => (i - 1 + questions.length) % questions.length)
    setAiContent('')
  }
  const handleShuffle = () => {
    setQuestionIndex(Math.floor(Math.random() * questions.length))
    setAiContent('')
  }

  const handleAIExplain = useCallback(async () => {
    setAiLoading(true)
    setAiContent('')
    try {
      // Try backend RAG pipeline first
      const stream = doubtAPI.stream(
        `Explain this GATE DS question in detail:\n\n${mcq.question}\n\nCorrect answer: ${mcq.answer}\n\nGive a deep dive with formulas and intuition.`,
        mcq.subject
      )
      for await (const chunk of stream) {
        setAiContent(p => p + chunk)
      }
    } catch {
      // Fallback to simulated stream
      try {
        const gen = simulateStream(DEMO_RESPONSES.default, 15)
        for await (const chunk of gen) {
          setAiContent(p => p + chunk)
        }
      } catch {
        setAiContent('AI explanation temporarily unavailable. Please try again.')
      }
    } finally {
      setAiLoading(false)
    }
  }, [mcq])

  const topics = useMemo(() => {
    if (filteredSubject === 'All') return []
    const uniqueTopics = Array.from(new Set(allFetchedQuestions.map(q => q.topic))).filter(Boolean)
    return uniqueTopics.sort()
  }, [allFetchedQuestions, filteredSubject])
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const timerPct = mcq ? (timeLeft / (mcq.difficulty === 'Easy' ? 60 : mcq.difficulty === 'Medium' ? 90 : 120)) * 100 : 100

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-flux-dark font-display">MCQ Practice</h2>
          <p className="text-sm text-flux-slate mt-0.5">{questions.length} questions • Topic-wise practice</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleShuffle} className="p-2.5 rounded-xl glass-card text-flux-slate hover:text-flux-dark transition-all" title="Shuffle">
            <Shuffle size={16} />
          </button>
          <button onClick={() => setShowFilter(!showFilter)} className={`p-2.5 rounded-xl glass-card transition-all ${showFilter ? 'text-flux-blue border-blue-200' : 'text-flux-slate hover:text-flux-dark'}`}>
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 rounded-2xl mb-5 overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Subject filter */}
              <div>
                <label className="text-xs text-flux-slate mb-2 block font-medium">Subject</label>
                <div className="flex flex-wrap gap-1.5">
                  {['All', ...GATE_DA_SUBJECTS].map(s => (
                    <button
                      key={s}
                      onClick={() => { setFilteredSubject(s as Subject | 'All'); setFilteredTopic('All'); setQuestionIndex(0) }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filteredSubject === s ? 'bg-blue-50 border border-blue-200 text-flux-blue' : 'bg-slate-50 border border-slate-200 text-flux-slate hover:text-flux-dark'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {/* Difficulty filter */}
              <div>
                <label className="text-xs text-flux-slate mb-2 block font-medium">Difficulty</label>
                <div className="flex gap-1.5">
                  {(['All', ...DIFFICULTIES] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => { setFilteredDifficulty(d as Difficulty | 'All'); setQuestionIndex(0) }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        filteredDifficulty === d
                          ? d === 'All' ? 'bg-flux-dark text-white border border-flux-dark'
                            : `border`
                          : 'bg-slate-50 border border-slate-200 text-flux-slate'
                      }`}
                      style={filteredDifficulty === d && d !== 'All' ? {
                        background: `${DIFFICULTY_COLORS[d as Difficulty]}15`,
                        borderColor: `${DIFFICULTY_COLORS[d as Difficulty]}40`,
                        color: DIFFICULTY_COLORS[d as Difficulty],
                      } : {}}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              {/* Topic filter */}
              {topics.length > 0 && (
                <div>
                  <label className="text-xs text-flux-slate mb-2 block font-medium">Topic</label>
                  <select
                    value={filteredTopic}
                    onChange={e => { setFilteredTopic(e.target.value); setQuestionIndex(0) }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-flux-dark focus:outline-none focus:border-flux-blue"
                  >
                    <option value="All">All Topics</option>
                    {topics.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator */}
      {fetchingQuestions && (
        <div className="flex items-center gap-2 mb-4 text-sm text-flux-blue">
          <Loader2 size={14} className="animate-spin" />
          Loading questions from server...
        </div>
      )}

      {/* Question or Empty State */}
      {questions.length === 0 ? (
        !fetchingQuestions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10 rounded-2xl flex flex-col items-center justify-center text-center mt-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Brain size={32} className="text-flux-blue opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-flux-dark mb-2">No questions found</h3>
            <p className="text-sm text-flux-slate mb-6 max-w-sm mx-auto">
              We couldn't find any questions matching your current filters. Try selecting a different topic or clearing your filters.
            </p>
            <button
              onClick={() => {
                setFilteredSubject('All')
                setFilteredTopic('All')
                setFilteredDifficulty('All')
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-flux-dark font-medium text-sm hover:bg-slate-200 transition-colors"
            >
              Clear Filters
            </button>
          </motion.div>
        )
      ) : mcq ? (
        <>
          {/* Progress bar + Timer row */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-flux-slate">{questionIndex + 1} / {questions.length}</span>
            <span className="text-xs text-flux-slate">{Math.round(((questionIndex) / questions.length) * 100)}% complete</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #1E40AF, #2563EB)' }}
              animate={{ width: `${((questionIndex) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Timer size={14} className={timeLeft < 15 ? 'text-red-500 animate-pulse' : 'text-flux-slate'} />
          <span className={`font-mono text-sm font-bold ${timeLeft < 15 && !isAnswered ? 'text-red-500' : 'text-flux-dark'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Question Card */}
      <motion.div
        key={mcq.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
        className="glass-card p-6 lg:p-8 rounded-2xl"
      >
        {/* Timer bar */}
        <div className="h-0.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: timeLeft < 15 ? '#ef4444' : 'linear-gradient(90deg, #2563EB, #0891B2)' }}
            animate={{ width: `${timerPct}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        {/* Bookmark button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => toggleBookmark(mcq.id, user?.id)}
            className={`p-2 rounded-lg transition-all ${bookmarkedIds.has(mcq.id) ? 'text-amber-500 bg-amber-50' : 'text-flux-slate hover:text-flux-dark'}`}
          >
            {bookmarkedIds.has(mcq.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
        </div>

        <QuestionCard
          mcq={mcq}
          onSelect={selectOption}
          selectedOption={selectedOption}
          isAnswered={isAnswered}
        />

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-7 pt-5 border-t border-flux-border">
          {!isAnswered ? (
            <button
              onClick={handleAnswer}
              disabled={!selectedOption}
              className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-semibold text-sm transition-all ${
                selectedOption
                  ? 'btn-neon text-white'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Submit Answer
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 text-sm font-semibold ${selectedOption === mcq.answer ? 'text-green-600' : 'text-red-500'}`}>
                {selectedOption === mcq.answer ? <><CheckCircle2 size={16} /> Correct!</> : <><XCircle size={16} /> Incorrect</>}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={handlePrev} className="p-2.5 rounded-xl glass-card text-flux-slate hover:text-flux-dark transition-all">
              <ChevronLeft size={18} />
            </button>
            <button onClick={handleNext} className="btn-neon text-white px-5 py-2.5 flex items-center gap-1.5 text-sm">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && <ExplanationPanel mcq={mcq} onAIExplain={handleAIExplain} />}

        {/* AI Panel */}
        {(aiContent || aiLoading) && <AIPanel content={aiContent} loading={aiLoading} />}
      </motion.div>
        </>
      ) : null}

      {/* Stats bar */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Bookmarked', value: bookmarkedIds.size, icon: Bookmark, color: '#D97706' },
          { label: 'Attempted', value: questionIndex + 1, icon: BarChart3, color: '#0891B2' },
          { label: 'Accuracy', value: '78%', icon: Brain, color: '#2563EB' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-3 rounded-xl flex items-center gap-2.5">
            <Icon size={14} style={{ color }} />
            <div>
              <div className="text-xs text-flux-slate">{label}</div>
              <div className="text-sm font-bold text-flux-dark">{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
