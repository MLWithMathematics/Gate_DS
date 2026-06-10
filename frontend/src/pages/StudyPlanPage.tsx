import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Calendar, Zap, BookOpen, Target, Clock, CheckCircle2, Circle, Brain, Sparkles, MessageSquare, Send } from 'lucide-react'
import { useAuthStore, useProgressStore } from '@/store'
import { studyPlanAPI, simulateStream } from '@/services/api'
import type { Subject } from '@/types'

const DAILY_TASKS = [
  { id: 't1', subject: 'Machine Learning' as Subject, topic: 'SVM & Kernel Methods', type: 'MCQ' as const, time: 45, done: true, priority: 'High' as const },
  { id: 't2', subject: 'Statistics' as Subject, topic: 'Bayesian Inference', type: 'Concept' as const, time: 30, done: true, priority: 'High' as const },
  { id: 't3', subject: 'Deep Learning' as Subject, topic: 'Transformer Architecture', type: 'PYQ' as const, time: 60, done: false, priority: 'High' as const },
  { id: 't4', subject: 'Mathematics' as Subject, topic: 'Optimization Methods', type: 'MCQ' as const, time: 30, done: false, priority: 'Medium' as const },
  { id: 't5', subject: 'Databases' as Subject, topic: 'Query Optimization', type: 'MCQ' as const, time: 25, done: false, priority: 'Medium' as const },
  { id: 't6', subject: 'Programming' as Subject, topic: 'Dynamic Programming', type: 'Concept' as const, time: 40, done: false, priority: 'Low' as const },
]

const PRIORITY_COLORS = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' }
const TYPE_ICONS = { MCQ: '📝', PYQ: '📚', Concept: '💡', Mock: '🎯' }

function TaskCard({ task, onToggle }: { task: typeof DAILY_TASKS[0]; onToggle: (id: string) => void }) {
  return (
    <motion.div
      layout
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
        task.done
          ? 'border-flux-border bg-slate-50 opacity-60'
          : 'border-flux-border bg-white hover:border-blue-200 hover:shadow-sm'
      }`}
      onClick={() => onToggle(task.id)}
    >
      <button className="flex-shrink-0 transition-transform group-hover:scale-110">
        {task.done
          ? <CheckCircle2 size={20} className="text-green-500" />
          : <Circle size={20} className="text-slate-300 group-hover:text-flux-blue" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${task.done ? 'line-through text-flux-slate' : 'text-flux-dark'}`}>
          {task.topic}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-flux-slate">{task.subject}</span>
          <span className="text-slate-300">·</span>
          <span className="text-[11px]">{TYPE_ICONS[task.type]} {task.type}</span>
          <span className="text-slate-300">·</span>
          <Clock size={10} className="text-flux-slate" />
          <span className="text-[11px] text-flux-slate">{task.time}m</span>
        </div>
      </div>
      <div
        className="flex-shrink-0 w-1.5 h-8 rounded-full"
        style={{ background: PRIORITY_COLORS[task.priority] }}
      />
    </motion.div>
  )
}

export default function StudyPlanPage() {
  const user = useAuthStore((state) => state.user)
  const subjectProgress = useProgressStore((state) => state.subjectProgress)
  const [tasks, setTasks] = useState(DAILY_TASKS)
  const [aiPlan, setAiPlan] = useState('')
  const [generating, setGenerating] = useState(false)
  const [daysLeft, setDaysLeft] = useState(60)
  const [showPlan, setShowPlan] = useState(false)

  // Chat state
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatting, setIsChatting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.id) {
      studyPlanAPI.get(user.id)
        .then(res => {
          if (res.plan) {
            setAiPlan(res.plan)
            setShowPlan(true)
          }
        })
        .catch(e => console.log("No existing plan found", e))
    }
  }, [user?.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const completed = tasks.filter(t => t.done).length
  const totalTime = tasks.reduce((s, t) => s + t.time, 0)
  const completedTime = tasks.filter(t => t.done).reduce((s, t) => s + t.time, 0)

  let weakSubjects = [...subjectProgress]
    .filter(s => s.accuracy < 70 && s.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map(s => s.subject)

  if (weakSubjects.length === 0) {
    weakSubjects = ['Deep Learning' as Subject, 'Databases' as Subject, 'Statistics' as Subject]
  }

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const generatePlan = async () => {
    setGenerating(true)
    setShowPlan(true)
    setAiPlan('')
    setChatHistory([])

    try {
      const response = await studyPlanAPI.generate(user?.id || 'anonymous', daysLeft, 6)
      const stream = simulateStream(response.plan, 8)
      for await (const chunk of stream) {
        setAiPlan(p => p + chunk)
      }
    } catch {
      const planText = `## 📅 Your Personalized ${daysLeft}-Day GATE DS Study Plan\n\nStudy plan generation temporarily unavailable. Please try again.`
      const stream = simulateStream(planText, 8)
      for await (const chunk of stream) {
        setAiPlan(p => p + chunk)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !user?.id) return

    const newMsg = { role: 'user', content: chatInput }
    setChatHistory(prev => [...prev, newMsg])
    setChatInput('')
    setIsChatting(true)
    
    setChatHistory(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const stream = studyPlanAPI.chatStream(user.id, newMsg.content, chatHistory)
      let aiText = ''
      for await (const chunk of stream) {
        aiText += chunk
        setChatHistory(prev => {
          const newHist = [...prev]
          newHist[newHist.length - 1] = { role: 'assistant', content: aiText }
          return newHist
        })
      }
    } catch (err) {
      console.error(err)
      setChatHistory(prev => {
        const newHist = [...prev]
        newHist[newHist.length - 1] = { role: 'assistant', content: "Sorry, I couldn't process that right now." }
        return newHist
      })
    } finally {
      setIsChatting(false)
    }
  }

  const handleSetAsMainPlan = async (text: string) => {
    if (!user?.id) return
    setAiPlan(text)
    try {
      await studyPlanAPI.save(user.id, text)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-flux-dark font-display">Study Plan</h2>
          <p className="text-sm text-flux-slate mt-0.5">AI-generated personalized roadmap</p>
        </div>
        <div className="badge-purple">
          <Sparkles size={11} />
          AI-Powered
        </div>
      </div>

      {/* AI Plan Generator */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 rounded-2xl border border-blue-200"
        style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2563EB, #0891B2)' }}>
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-flux-dark">Generate AI Study Plan</h3>
            <p className="text-xs text-flux-slate">Personalized based on your weak areas and exam timeline</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="text-xs text-flux-slate mb-1.5 block font-medium">Days until GATE exam</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={14} max={180} value={daysLeft}
                onChange={e => setDaysLeft(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="text-sm font-bold text-flux-blue w-12">{daysLeft}d</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-flux-slate mb-1.5 block font-medium">Weak subjects detected</label>
            <div className="flex gap-1.5 flex-wrap">
              {weakSubjects.map(s => (
                <span key={s} className="badge-red text-[10px]">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={generatePlan}
          disabled={generating}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
            generating ? 'opacity-60 cursor-not-allowed bg-blue-50 border border-blue-200 text-flux-blue' : 'btn-neon text-white'
          }`}
        >
          {generating ? (
            <>
              <motion.div className="w-4 h-4 border-2 border-flux-blue border-t-transparent rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
              Generating Plan...
            </>
          ) : (
            <><Zap size={15} /> Generate My Study Plan</>
          )}
        </button>
      </motion.div>

      {/* AI Generated Plan & Refinement Chat */}
      <AnimatePresence>
        {showPlan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className="glass-card p-5 rounded-2xl border border-cyan-200" style={{ background: 'linear-gradient(135deg, #F0FDFA, #EFF6FF)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-cyan-600" />
                <h3 className="text-sm font-semibold text-flux-dark">Your AI Study Plan</h3>
                {generating && (
                  <div className="flex gap-1 ml-2">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-500"
                        animate={{ scale: [1,1.5,1] }} transition={{ duration: 0.6, delay: i*0.15, repeat: Infinity }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="ai-prose max-h-[500px] overflow-y-auto pr-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiPlan}</ReactMarkdown>
              </div>
            </div>

            {/* AI Refinement Chat */}
            <div className="glass-card p-5 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={15} className="text-flux-blue" />
                <h3 className="text-sm font-semibold text-flux-dark">Refine Plan with AI Tutor</h3>
              </div>
              
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-blue-50 ml-8 border border-blue-100' : 'bg-slate-50 mr-8 border border-slate-200'}`}>
                    <div className="text-[10px] text-slate-400 mb-1">{msg.role === 'user' ? 'You' : 'AI Tutor'}</div>
                    <div className="ai-prose text-xs"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
                    
                    {msg.role === 'assistant' && (
                      <button 
                        onClick={() => handleSetAsMainPlan(msg.content)}
                        className="mt-2 text-[10px] font-semibold text-flux-blue bg-blue-100/50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                      >
                        Set as Main Plan
                      </button>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="E.g., Can you remove Databases and add more Math?"
                  className="flex-1 input-field text-sm"
                  disabled={isChatting}
                />
                <button 
                  type="submit" 
                  disabled={isChatting || !chatInput.trim()}
                  className="bg-flux-blue text-white p-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's Tasks */}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-flux-blue" />
            <h3 className="text-sm font-semibold text-flux-dark">Today's Schedule</h3>
          </div>
          <span className="text-xs text-flux-slate">{completed}/{tasks.length} done</span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-flux-slate">Daily Progress</span>
            <span className="text-xs font-semibold text-flux-blue">{completedTime}/{totalTime} min</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #1E40AF, #2563EB)' }}
              animate={{ width: `${(completed / tasks.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onToggle={toggleTask} />
          ))}
        </div>
      </div>

      {/* Weekly Goals */}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Target size={15} className="text-cyan-600" />
          <h3 className="text-sm font-semibold text-flux-dark">This Week's Goals</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { goal: 'Solve 150 MCQs', current: 88, target: 150, color: '#2563EB' },
            { goal: 'Complete 2 Mock Tests', current: 1, target: 2, color: '#0891B2' },
            { goal: 'Study Deep Learning (8h)', current: 4.5, target: 8, color: '#D97706' },
            { goal: 'Revise Statistics Notes', current: 0, target: 1, color: '#059669' },
          ].map(({ goal, current, target, color }) => {
            const pct = Math.min(100, Math.round((current / target) * 100))
            return (
              <div key={goal} className="p-3 rounded-xl bg-flux-light border border-flux-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-flux-dark font-medium">{goal}</span>
                  <span className="text-xs font-bold" style={{ color }}>{current}/{target}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                <div className="text-[10px] text-flux-slate mt-1">{pct}% complete</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revision Reminders */}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={15} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-flux-dark">Smart Revision Reminders</h3>
        </div>
        <div className="space-y-2">
          {[
            { topic: 'SVM — Kernel Trick', lastStudied: '5 days ago', urgency: 'Due today', color: '#ef4444' },
            { topic: 'Bayesian Networks', lastStudied: '3 days ago', urgency: 'Due tomorrow', color: '#f59e0b' },
            { topic: 'PCA Derivation', lastStudied: '2 days ago', urgency: 'Due in 2 days', color: '#f59e0b' },
            { topic: 'Gradient Descent variants', lastStudied: '1 day ago', urgency: 'Due in 4 days', color: '#10b981' },
          ].map(({ topic, lastStudied, urgency, color }) => (
            <div key={topic} className="flex items-center justify-between p-3 rounded-xl hover:bg-flux-light transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <div>
                  <div className="text-sm text-flux-dark group-hover:text-flux-blue transition-colors">{topic}</div>
                  <div className="text-[11px] text-flux-slate">Last studied: {lastStudied}</div>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: `${color}15`, color }}>
                {urgency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
