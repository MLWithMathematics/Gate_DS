import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bookmark, BookmarkMinus, Loader2, Brain } from 'lucide-react'
import { bookmarksAPI } from '@/services/api'
import { useAuthStore, useMCQStore } from '@/store'
import type { MCQ } from '@/types'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function BookmarksPage() {
  const user = useAuthStore((state) => state.user)
  const bookmarkedIds = useMCQStore((state) => state.bookmarkedIds)
  const toggleBookmark = useMCQStore((state) => state.toggleBookmark)
  
  const [bookmarks, setBookmarks] = useState<MCQ[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.id) {
      loadBookmarks()
    }
  }, [user])

  const loadBookmarks = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await bookmarksAPI.get(user.id)
      setBookmarks(data)
    } catch (e) {
      toast.error('Failed to load bookmarks')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBookmark = async (mcqId: string) => {
    await toggleBookmark(mcqId, user?.id)
    setBookmarks((prev) => prev.filter((m) => m.id !== mcqId))
    toast.success('Removed from bookmarks')
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-flux-slate">
        <Loader2 size={32} className="animate-spin text-flux-blue" />
        <p>Loading your collections...</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-flux-dark font-display flex items-center gap-2">
            <Bookmark className="text-amber-500" />
            My Bookmarks
          </h2>
          <p className="text-sm text-flux-slate mt-1">Review your saved questions</p>
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 glass-card p-10 rounded-2xl flex flex-col items-center justify-center text-center mt-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
            <Bookmark size={32} className="text-amber-500 opacity-50" />
          </div>
          <h3 className="text-lg font-bold text-flux-dark mb-2">No bookmarks yet</h3>
          <p className="text-sm text-flux-slate mb-6 max-w-sm mx-auto">
            When practicing MCQs, click the bookmark icon to save tricky questions here for later review.
          </p>
          <button
            onClick={() => navigate('/app/practice')}
            className="btn-neon text-white px-5 py-2.5 rounded-xl flex items-center gap-2"
          >
            <Brain size={16} /> Go Practice
          </button>
        </motion.div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4 pb-10">
          <AnimatePresence>
            {bookmarks.map((mcq) => (
              <motion.div
                key={mcq.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ duration: 0.2 }}
                className="glass-card p-5 rounded-2xl relative group overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="badge-purple">{mcq.subject}</span>
                      <span className="badge-cyan">{mcq.topic}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600 border border-amber-200">
                        {mcq.difficulty}
                      </span>
                    </div>
                    <div className="ai-prose text-sm text-flux-dark">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {mcq.question}
                      </ReactMarkdown>
                    </div>
                    
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <div className="text-xs font-bold text-green-700 mb-1">Correct Answer: {mcq.answer.toUpperCase()}</div>
                      <div className="text-xs text-green-800 line-clamp-2">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {mcq.explanation}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveBookmark(mcq.id)}
                    className="p-2 text-flux-slate hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove Bookmark"
                  >
                    <BookmarkMinus size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
