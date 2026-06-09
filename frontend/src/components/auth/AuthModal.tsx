import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '@/store'
import { authAPI } from '@/services/api'
import { useNavigate } from 'react-router-dom'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (isLogin) {
        const data = await authAPI.login(formData.email, formData.password)
        login(data.user, data.access_token)
        toast.success('Welcome back!')
      } else {
        const data = await authAPI.register(formData.name, formData.email, formData.password)
        login(data.user, data.access_token)
        toast.success('Account created successfully!')
      }
      onClose()
      navigate('/app/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-flux-dark/40 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden pointer-events-auto"
              style={{ boxShadow: '0 24px 64px rgba(15,32,68,0.12)' }}
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-display text-2xl font-bold text-flux-dark">
                    {isLogin ? 'Welcome back' : 'Create an account'}
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 text-flux-slate hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="block text-xs font-semibold text-flux-dark mb-1.5 uppercase tracking-wider">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="John Doe"
                          required={!isLogin}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-flux-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-flux-dark mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-flux-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-flux-dark mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-flux-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-neon py-3 mt-6 flex justify-center items-center gap-2"
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-flux-slate">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-flux-blue font-semibold hover:underline"
                  >
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
