import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import {
  Clock, Flag, ChevronLeft, ChevronRight, Send, BarChart3,
  CheckCircle2, XCircle, AlertTriangle, Maximize2, Minimize2, Trophy, Brain
} from 'lucide-react'
import { MOCK_MCQs } from '@/tests/mocks/mockData'
import { useMockTestStore, useAuthStore } from '@/store'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { mockTestAPI } from '@/services/api'
import type { MCQ } from '@/types'
import toast from 'react-hot-toast'

// Start with mock data, will be replaced by backend data when test starts
let QUESTIONS: MCQ[] = MOCK_MCQs

function QuestionPalette({ total, answers, flagged, current, onGoto }: {
  total: number
  answers: Record<string, string>
  flagged: Set<string>
  current: number
  onGoto: (i: number) => void
}) {
  return (
    <div className="glass-card p-4 rounded-2xl">
      <div className="text-xs text-flux-slate font-medium mb-3">Question Palette</div>
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {QUESTIONS.map((q, i) => {
          const answered = !!answers[q.id]
          const isFlagged = flagged.has(q.id)
          const isCurrent = i === current
          return (
            <button
              key={q.id}
              onClick={() => onGoto(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center relative ${
                isCurrent ? 'ring-2 ring-flux-blue ring-offset-1 ring-offset-white' : ''
              } ${
                isFlagged ? 'bg-amber-50 border border-amber-300 text-amber-600' :
                answered ? 'bg-green-50 border border-green-300 text-green-600' :
                'bg-slate-50 border border-slate-200 text-flux-slate hover:border-blue-300'
              }`}
            >
              {i + 1}
              {isFlagged && <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />}
            </button>
          )
        })}
      </div>
      <div className="space-y-1.5">
        {[
          { color: 'bg-green-50 border-green-300', label: 'Answered', count: Object.keys(answers).length },
          { color: 'bg-amber-50 border-amber-300', label: 'Flagged', count: flagged.size },
          { color: 'bg-slate-50 border-slate-200', label: 'Not Attempted', count: total - Object.keys(answers).length },
        ].map(({ color, label, count }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-flux-slate">
            <div className={`w-4 h-4 rounded border ${color}`} />
            <span>{label}</span>
            <span className="ml-auto font-bold text-flux-dark">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

import type { MockTestResult as MockTestResultType } from '@/types'
function ResultView({ result, onRetake }: { result: MockTestResultType; onRetake: () => void }) {
  const accuracy = result.accuracy
  const radarData = [
    { subject: 'ML', value: 75 },
    { subject: 'Math', value: 80 },
    { subject: 'DL', value: 55 },
    { subject: 'Stats', value: 70 },
    { subject: 'Prog', value: 90 },
    { subject: 'Prob', value: 65 },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto p-4 lg:p-8 space-y-6"
    >
      {/* Result Header */}
      <div className="glass-card p-8 rounded-2xl text-center"
        style={{ background: accuracy >= 70 ? 'linear-gradient(135deg, #F0FDF4, #F0FDFA)' : 'linear-gradient(135deg, #FEF2F2, #FFFBEB)', border: `1px solid ${accuracy >= 70 ? '#BBF7D0' : '#FECACA'}` }}>
        <div className="text-5xl mb-4">{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🎯' : '📚'}</div>
        <div className="font-display text-4xl font-bold text-flux-dark mb-1">{result.score}/{result.total}</div>
        <div className="text-flux-slate mb-4">Score · {accuracy}% Accuracy</div>
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {[
            { label: 'Correct', value: result.score, color: '#10b981' },
            { label: 'Wrong', value: result.total - result.score, color: '#ef4444' },
            { label: 'Time', value: `${Math.round(result.duration / 60)}m`, color: '#2563EB' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-3 rounded-xl">
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
              <div className="text-[11px] text-flux-slate">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Radar + Weak Areas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="glass-card p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-flux-dark mb-3">Performance Radar</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={65}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 9 }} />
              <Radar dataKey="value" stroke={accuracy >= 70 ? '#10b981' : '#ef4444'} fill={accuracy >= 70 ? '#10b981' : '#ef4444'} fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-flux-dark">Weak Areas</h3>
          </div>
          <div className="space-y-2">
            {result.weak_areas.slice(0, 5).map((area: string) => (
              <div key={area} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                <XCircle size={13} className="text-red-500" />
                <span className="text-xs text-flux-dark">{area}</span>
              </div>
            ))}
            {result.weak_areas.length === 0 && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 size={14} />
                <span>Excellent! No major weak areas.</span>
              </div>
            )}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-flux-slate">
            💡 AI Recommendation: Focus on {result.weak_areas[0] || 'maintaining current performance'} next.
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button onClick={onRetake} className="btn-neon text-white px-8 py-3">
          Retake Test
        </button>
        <button className="btn-ghost px-8 py-3">
          Review Answers
        </button>
      </div>
    </motion.div>
  )
}

export default function MockTestPage() {
  const user = useAuthStore((state) => state.user)
  const [testQuestions, setTestQuestions] = useState<MCQ[]>(MOCK_MCQs)
  const [loadingTest, setLoadingTest] = useState(false)

  const {
    isActive, currentQuestionIndex, answers, flagged, timeRemaining, totalTime,
    isSubmitted, result, startTest, setAnswer, toggleFlag, goToQuestion,
    nextQuestion, prevQuestion, tickTimer, submitTest, resetTest,
  } = useMockTestStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const mcq = testQuestions[currentQuestionIndex]

  useEffect(() => {
    if (!isActive || isSubmitted) return
    const t = setInterval(tickTimer, 1000)
    return () => clearInterval(t)
  }, [isActive, isSubmitted, tickTimer])

  useEffect(() => {
    if (timeRemaining === 0 && isActive) {
      handleSubmitTest()
    }
  }, [timeRemaining, isActive])

  const handleStartTest = async () => {
    setLoadingTest(true)
    try {
      const data = await mockTestAPI.generate('Mixed', 180, 'Medium', 10)
      if (data?.questions?.length) {
        setTestQuestions(data.questions)
        QUESTIONS = data.questions
      }
    } catch {
      // Fallback to mock data
      setTestQuestions(MOCK_MCQs)
      QUESTIONS = MOCK_MCQs
    } finally {
      setLoadingTest(false)
      startTest(180)
    }
  }

  const handleSubmitTest = async () => {
    submitTest(testQuestions)
    // Also submit to backend for server-side scoring
    if (user?.id) {
      try {
        const timeTaken = totalTime - timeRemaining
        await mockTestAPI.submit('test_001', answers, user.id, timeTaken)
      } catch {
        // Server scoring failed silently, local result already computed
      }
    }
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const timerUrgent = timeRemaining < 300 && isActive

  if (isSubmitted && result) {
    return <ResultView result={result} onRetake={resetTest} />
  }

  if (!isActive) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 lg:p-12 rounded-3xl max-w-xl w-full text-center"
          style={{ boxShadow: '0 4px 32px rgba(37,99,235,0.1)' }}
        >
          <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2563EB, #0891B2)', boxShadow: '0 4px 24px rgba(37,99,235,0.3)' }}>
            <Brain size={36} className="text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold text-flux-dark mb-2">GATE DS Mock Test</h2>
          <p className="text-flux-slate text-sm mb-8">Full-length simulation with {QUESTIONS.length} questions</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: 'Questions', value: QUESTIONS.length },
              { label: 'Duration', value: '3 Hours' },
              { label: 'Total Marks', value: 100 },
              { label: 'Sections', value: 'All Subjects' },
            ].map(({ label, value }) => (
              <div key={label} className="glass-card p-3 rounded-xl">
                <div className="font-bold text-flux-dark text-lg">{value}</div>
                <div className="text-xs text-flux-slate">{label}</div>
              </div>
            ))}
          </div>

          <div className="text-xs mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
            ⚠️ Do not close or refresh the browser during the test. Timer will auto-submit.
          </div>

          <button
            onClick={handleStartTest}
            disabled={loadingTest}
            className="btn-neon text-white w-full py-4 text-base font-semibold flex items-center justify-center gap-2"
          >
            {loadingTest ? <><motion.div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} /> Loading...</> : 'Start Mock Test'}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-65px)] ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Test Header */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-flux-border flex-shrink-0 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-flux-dark hidden sm:block">GATE DS Mock Test</span>
          <span className="badge-purple">Q {currentQuestionIndex + 1}/{testQuestions.length}</span>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm ${
          timerUrgent
            ? 'border-red-300 bg-red-50 text-red-500 animate-pulse'
            : 'border-blue-200 bg-blue-50 text-flux-blue'
        }`}>
          <Clock size={15} />
          {formatTime(timeRemaining)}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 rounded-lg glass-card text-flux-slate hover:text-flux-dark transition-all">
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xs font-semibold hover:bg-green-100 transition-all"
          >
            <Send size={13} />
            Submit
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-slate-100 flex-shrink-0">
        <motion.div
          className="h-full"
          style={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%`, background: 'linear-gradient(90deg, #2563EB, #0891B2)' }}
          animate={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="glass-card p-6 lg:p-8 rounded-2xl max-w-3xl"
            >
              {/* Question meta */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-purple">{mcq.subject}</span>
                  <span className="badge-cyan">{mcq.topic}</span>
                </div>
                <button
                  onClick={() => toggleFlag(mcq.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    flagged.has(mcq.id)
                      ? 'bg-amber-50 border border-amber-200 text-amber-600'
                      : 'bg-slate-50 border border-slate-200 text-flux-slate hover:text-flux-dark'
                  }`}
                >
                  <Flag size={12} />
                  {flagged.has(mcq.id) ? 'Flagged' : 'Flag'}
                </button>
              </div>

              {/* Question */}
              <div className="ai-prose mb-6 text-base leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {mcq.question}
                </ReactMarkdown>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {mcq.options.map((opt) => {
                  const selected = answers[mcq.id] === opt.id
                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={{ x: 3 }}
                      onClick={() => setAnswer(mcq.id, opt.id)}
                      className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 text-sm font-medium ${
                        selected
                          ? 'border-blue-300 bg-blue-50 text-flux-blue'
                          : 'border-slate-200 bg-white text-flux-dark hover:border-blue-200 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-xs font-bold border ${
                          selected ? 'bg-blue-100 border-blue-300 text-flux-blue' : 'bg-slate-50 border-slate-200 text-flux-slate'
                        }`}>
                          {opt.id.toUpperCase()}
                        </span>
                        <div className="ai-prose flex-1">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {opt.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-7 pt-5 border-t border-flux-border">
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass-card text-sm text-flux-slate hover:text-flux-dark disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="text-xs text-flux-slate">
                  {Object.keys(answers).length}/{testQuestions.length} answered
                </span>
                <button
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === testQuestions.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl btn-neon text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar - Palette */}
        <div className="hidden lg:flex flex-col w-64 p-4 border-l border-flux-border flex-shrink-0 overflow-y-auto">
          <QuestionPalette
            total={QUESTIONS.length}
            answers={answers}
            flagged={flagged}
            current={currentQuestionIndex}
            onGoto={goToQuestion}
          />

          <div className="mt-4 glass-card p-4 rounded-2xl">
            <div className="text-xs text-flux-slate mb-2 font-medium">Test Progress</div>
            <div className="space-y-1.5 text-xs text-flux-slate">
              <div className="flex justify-between"><span>Attempted</span><span className="text-green-600 font-semibold">{Object.keys(answers).length}</span></div>
              <div className="flex justify-between"><span>Remaining</span><span className="text-amber-600 font-semibold">{QUESTIONS.length - Object.keys(answers).length}</span></div>
              <div className="flex justify-between"><span>Flagged</span><span className="text-amber-600 font-semibold">{flagged.size}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Submit Modal */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-flux-dark/40 backdrop-blur-sm"
              onClick={() => setShowConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-8 rounded-2xl max-w-sm w-full mx-4 text-center"
            >
              <Trophy size={32} className="text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-flux-dark mb-2">Submit Test?</h3>
              <p className="text-sm text-flux-slate mb-6">
                You've answered {Object.keys(answers).length} of {testQuestions.length} questions.
                {Object.keys(answers).length < testQuestions.length && ` ${testQuestions.length - Object.keys(answers).length} questions unanswered.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 btn-ghost py-2.5 text-sm">
                  Continue
                </button>
                <button
                  onClick={() => { setShowConfirm(false); handleSubmitTest() }}
                  className="flex-1 btn-neon text-white py-2.5 text-sm"
                >
                  Submit Final
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
