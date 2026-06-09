import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Database, Plus, Edit, Trash2, Loader2, Save, X } from 'lucide-react'
import { adminAPI } from '@/services/api'
import { useAuthStore } from '@/store'
import type { MCQ } from '@/types'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const user = useAuthStore((state) => state.user)
  const [mcqs, setMcqs] = useState<MCQ[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMcq, setEditingMcq] = useState<Partial<MCQ> | null>(null)
  const [isSyllabusModalOpen, setIsSyllabusModalOpen] = useState(false)
  const [syllabusForm, setSyllabusForm] = useState({ subject: 'Machine Learning', topic: '', content: '' })

  useEffect(() => {
    if (user?.role === 'admin') {
      loadMCQs()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadMCQs = async () => {
    setLoading(true)
    try {
      const data = await adminAPI.getMCQs(100, 0)
      setMcqs(data)
    } catch (e) {
      toast.error('Failed to load MCQs')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this MCQ?')) return
    try {
      await adminAPI.deleteMCQ(id)
      setMcqs(mcqs.filter((m) => m.id !== id))
      toast.success('MCQ deleted')
    } catch (e) {
      toast.error('Failed to delete MCQ')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMcq) return
    try {
      if (editingMcq.id) {
        // Update
        const updated = await adminAPI.updateMCQ(editingMcq.id, editingMcq)
        setMcqs(mcqs.map((m) => (m.id === updated.id ? updated : m)))
        toast.success('MCQ updated')
      } else {
        // Create
        // Add random id generation if not handled by backend, but backend handles it or we should pass it
        // Actually Supabase can generate UUIDs, but our mock/schema expects string. 
        // We will assume backend inserts correctly.
        const created = await adminAPI.createMCQ(editingMcq)
        setMcqs([created, ...mcqs])
        toast.success('MCQ created')
      }
      setIsModalOpen(false)
    } catch (err) {
      toast.error('Failed to save MCQ')
    }
  }

  const handleSaveSyllabus = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminAPI.createSyllabus(syllabusForm)
      toast.success('Syllabus topic added to Knowledge Base')
      setIsSyllabusModalOpen(false)
      setSyllabusForm({ subject: 'Machine Learning', topic: '', content: '' })
    } catch (err) {
      toast.error('Failed to save syllabus topic')
    }
  }

  const openEditModal = (mcq?: MCQ) => {
    if (mcq) {
      setEditingMcq(mcq)
    } else {
      setEditingMcq({
        subject: 'Machine Learning',
        topic: 'Basics',
        difficulty: 'Medium',
        question: '',
        answer: 'a',
        options: [
          { id: 'a', text: '' },
          { id: 'b', text: '' },
          { id: 'c', text: '' },
          { id: 'd', text: '' },
        ],
        explanation: '',
      })
    }
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-flux-slate">
        <Loader2 size={32} className="animate-spin text-flux-blue" />
        <p>Verifying access...</p>
      </div>
    )
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-flux-slate p-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <ShieldAlert size={32} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-flux-dark">Access Denied</h2>
        <p className="text-center max-w-md">You do not have permission to view the Admin CMS. Please ensure your account has the 'admin' role.</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-flux-dark font-display flex items-center gap-2">
            <Database className="text-flux-blue" />
            Content Management
          </h2>
          <p className="text-sm text-flux-slate mt-1">Manage platform MCQs</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSyllabusModalOpen(true)}
            className="px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-amber-200"
          >
            <Database size={18} /> New Syllabus Topic
          </button>
          <button
            onClick={() => openEditModal()}
            className="btn-neon text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium"
          >
            <Plus size={18} /> New MCQ
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto glass-card rounded-2xl border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-flux-slate">
              <th className="p-4 font-semibold">Subject / Topic</th>
              <th className="p-4 font-semibold">Question (Preview)</th>
              <th className="p-4 font-semibold">Difficulty</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mcqs.map((mcq) => (
              <tr key={mcq.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-flux-dark">{mcq.subject}</div>
                  <div className="text-xs text-flux-slate">{mcq.topic}</div>
                </td>
                <td className="p-4 text-sm text-flux-slate max-w-md truncate">
                  {mcq.question}
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${mcq.difficulty === 'Easy' ? 'bg-green-100 text-green-700' : mcq.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {mcq.difficulty}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => openEditModal(mcq)} className="p-2 text-flux-blue hover:bg-blue-50 rounded-lg transition-colors inline-flex">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(mcq.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {mcqs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-flux-slate">No MCQs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && editingMcq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-flux-dark/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-flux-dark">
                {editingMcq.id ? 'Edit MCQ' : 'Create MCQ'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-flux-slate hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-flux-dark mb-1">Subject</label>
                  <input required value={editingMcq.subject || ''} onChange={(e) => setEditingMcq({...editingMcq, subject: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-flux-blue focus:ring-1 focus:ring-flux-blue" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-flux-dark mb-1">Topic</label>
                  <input required value={editingMcq.topic || ''} onChange={(e) => setEditingMcq({...editingMcq, topic: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-flux-blue focus:ring-1 focus:ring-flux-blue" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-flux-dark mb-1">Difficulty</label>
                <select required value={editingMcq.difficulty || 'Medium'} onChange={(e) => setEditingMcq({...editingMcq, difficulty: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-flux-blue focus:ring-1 focus:ring-flux-blue">
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-flux-dark mb-1">Question (Markdown/LaTeX)</label>
                <textarea required rows={4} value={editingMcq.question || ''} onChange={(e) => setEditingMcq({...editingMcq, question: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-flux-blue focus:ring-1 focus:ring-flux-blue" />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-flux-dark mb-1">Options</label>
                {editingMcq.options?.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold bg-slate-100 w-8 h-8 flex items-center justify-center rounded-lg">{opt.id.toUpperCase()}</span>
                    <input required value={opt.text} onChange={(e) => {
                      const newOptions = [...(editingMcq.options || [])];
                      newOptions[idx].text = e.target.value;
                      setEditingMcq({...editingMcq, options: newOptions})
                    }} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-flux-blue focus:ring-1 focus:ring-flux-blue" />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="correct_answer" checked={editingMcq.answer === opt.id} onChange={() => setEditingMcq({...editingMcq, answer: opt.id})} className="w-4 h-4 text-flux-blue border-slate-300 focus:ring-flux-blue" />
                      <span className="text-sm text-flux-slate">Correct</span>
                    </label>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-flux-dark mb-1">Explanation</label>
                <textarea required rows={3} value={editingMcq.explanation || ''} onChange={(e) => setEditingMcq({...editingMcq, explanation: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-flux-blue focus:ring-1 focus:ring-flux-blue" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-flux-slate hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="btn-neon text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-medium">
                  <Save size={18} /> Save MCQ
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isSyllabusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-flux-dark/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-flux-dark flex items-center gap-2">
                <Database className="text-amber-500" />
                Add Syllabus Topic
              </h3>
              <button onClick={() => setIsSyllabusModalOpen(false)} className="p-2 text-flux-slate hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSyllabus} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-flux-dark mb-1">Subject</label>
                  <input required value={syllabusForm.subject} onChange={(e) => setSyllabusForm({...syllabusForm, subject: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-flux-dark mb-1">Topic</label>
                  <input required placeholder="e.g. Graph Theory" value={syllabusForm.topic} onChange={(e) => setSyllabusForm({...syllabusForm, topic: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-flux-dark mb-1">Content (Syllabus Data / Notes)</label>
                <textarea required rows={8} placeholder="Enter the detailed notes, formulas, or concepts for the RAG AI pipeline to learn..." value={syllabusForm.content} onChange={(e) => setSyllabusForm({...syllabusForm, content: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                <p className="text-xs text-flux-slate mt-2">This content will be vectorized and stored in the AI Knowledge Base (pgvector) to answer student doubts.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsSyllabusModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-flux-slate hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-colors">
                  <Save size={18} /> Save to Knowledge Base
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
