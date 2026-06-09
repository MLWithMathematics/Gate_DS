import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, Loader2, RefreshCw, CheckCircle2, XCircle, ChevronRight, Brain } from 'lucide-react'
import { flashcardAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import type { MCQ } from '@/types'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import toast from 'react-hot-toast'

export default function FlashcardsPage() {
  const user = useAuthStore((state) => state.user)
  const [cards, setCards] = useState<MCQ[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadCards()
    }
  }, [user])

  const loadCards = async () => {
    setLoading(true)
    setSessionCompleted(false)
    setCurrentIndex(0)
    setIsFlipped(false)
    try {
      const data = await flashcardAPI.getDailyCards(user!.id, 20)
      setCards(data)
    } catch (e) {
      toast.error('Failed to load flashcards')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150)
    } else {
      setSessionCompleted(true)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-flux-slate">
        <Loader2 size={32} className="animate-spin text-flux-blue" />
        <p>Preparing your daily review...</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto h-full flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-flux-dark font-display flex items-center gap-2">
            <Layers className="text-flux-blue" />
            Daily Flashcards
          </h2>
          <p className="text-sm text-flux-slate mt-1">Review mistakes to build active recall</p>
        </div>
        {!sessionCompleted && cards.length > 0 && (
          <div className="text-sm font-medium px-4 py-1.5 rounded-full bg-blue-50 text-flux-blue">
            {currentIndex + 1} / {cards.length}
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full glass-card p-10 rounded-2xl flex flex-col items-center justify-center text-center mt-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-green-500 opacity-50" />
          </div>
          <h3 className="text-lg font-bold text-flux-dark mb-2">You're all caught up!</h3>
          <p className="text-sm text-flux-slate mb-6 max-w-sm mx-auto">
            No mistakes found in your recent history. Keep practicing MCQs and come back later for a review.
          </p>
        </motion.div>
      ) : sessionCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full glass-card p-12 rounded-3xl flex flex-col items-center justify-center text-center max-w-lg mt-10 shadow-lg border-2 border-green-100"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 flex items-center justify-center mb-6 shadow-xl shadow-green-500/20 text-white">
            <Brain size={40} />
          </div>
          <h3 className="text-2xl font-bold text-flux-dark mb-3">Review Session Complete!</h3>
          <p className="text-flux-slate mb-8 max-w-xs mx-auto">
            Great job! You've reviewed {cards.length} concepts today. Active recall is key to acing GATE DA.
          </p>
          <button
            onClick={loadCards}
            className="btn-neon text-white px-8 py-3 rounded-xl flex items-center gap-2 font-medium"
          >
            <RefreshCw size={18} /> Review Again
          </button>
        </motion.div>
      ) : (
        <div className="w-full max-w-2xl relative perspective-1000 mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex + (isFlipped ? '-back' : '-front')}
              initial={{ rotateX: isFlipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: isFlipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
              className="w-full cursor-pointer"
              onClick={() => !isFlipped && setIsFlipped(true)}
            >
              <div className={`glass-card rounded-3xl p-8 min-h-[450px] flex flex-col shadow-xl ${isFlipped ? 'border-2 border-blue-200 bg-blue-50/30' : 'border border-slate-200 bg-white hover:border-blue-300 transition-colors'}`}>
                
                {/* Subject Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="badge-purple">{cards[currentIndex].subject}</span>
                  <span className="badge-cyan">{cards[currentIndex].topic}</span>
                  {isFlipped && <span className="ml-auto badge-orange">Answer Reveal</span>}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col">
                  {!isFlipped ? (
                    <>
                      <div className="ai-prose text-lg text-flux-dark mb-8">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {cards[currentIndex].question}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-auto pt-8 flex items-center justify-center text-flux-slate opacity-60">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Brain size={16} /> Tap card to reveal answer
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Correct Answer</div>
                      <div className="text-xl font-bold text-flux-dark mb-6 p-4 bg-green-100 rounded-xl border border-green-200 inline-block">
                        Option {cards[currentIndex].answer.toUpperCase()}
                      </div>
                      
                      <div className="text-xs font-bold text-flux-blue uppercase tracking-wider mb-2">Explanation</div>
                      <div className="ai-prose text-sm text-flux-dark mb-8">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {cards[currentIndex].explanation}
                        </ReactMarkdown>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons (Only on Back) */}
                {isFlipped && (
                  <div className="mt-auto pt-6 border-t border-blue-100/50 flex gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNext() }}
                      className="flex-1 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      <XCircle size={18} /> Still Learning
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNext() }}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                    >
                      <CheckCircle2 size={18} /> Got it <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
