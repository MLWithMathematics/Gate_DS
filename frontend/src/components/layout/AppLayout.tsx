import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Brain, FlaskConical, MessageSquareText,
  BarChart3, Trophy, BookOpen, Menu, X, Zap, Bell, Settings,
  Timer, ChevronRight, Flame, User, LogOut, Edit3, Camera, CheckCheck, Bookmark, Layers, Database, Swords
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore, useUIStore, useNotificationStore, useProgressStore, useMCQStore } from '@/store'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

type NavItem = {
  path: string;
  icon: any;
  label: string;
  color: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard',   color: '#2563EB' },
  { path: '/app/practice',  icon: Brain,            label: 'MCQ Practice', color: '#0891B2' },
  { path: '/app/mock-test', icon: FlaskConical,     label: 'Mock Test',    color: '#059669' },
  { path: '/app/ai-tutor',  icon: MessageSquareText,label: 'AI Tutor',     color: '#D97706' },
  { path: '/app/analytics', icon: BarChart3,        label: 'Analytics',    color: '#DC2626' },
  { path: '/app/leaderboard',icon: Trophy,          label: 'Leaderboard',  color: '#7C3AED' },
  { path: '/app/study-plan',icon: BookOpen,         label: 'Study Plan',   color: '#0F766E' },
  { path: '/app/bookmarks', icon: Bookmark,         label: 'Bookmarks',    color: '#F59E0B' },
  { path: '/app/flashcards',icon: Layers,           label: 'Flashcards',   color: '#10B981' },
  { path: '/app/battle',    icon: Swords,           label: 'Battle Arena', color: '#EF4444' },
  { path: '/app/admin',     icon: Database,         label: 'Admin CMS',    color: '#64748B', adminOnly: true },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate  = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { sidebarCollapsed, toggleSidebar, pomodoroActive, pomodoroTime, setPomodoroActive, tickPomodoro } = useUIStore()
  const subjectProgress = useProgressStore((state) => state.subjectProgress)
  const dailyProgress = useProgressStore((state) => state.dailyProgress)
  const { notifications, markAsRead, markAllAsRead, generateSmartNotifications } = useNotificationStore()
  const unreadCount = notifications.filter(n => !n.read).length

  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: user?.name || '', email: user?.email || '', avatar: user?.avatar || '' })
  
  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!user) return
    generateSmartNotifications({
      streak: user.streak || 0,
      xp: user.xp || 0,
      level: user.level || 1,
      subjectProgress: subjectProgress,
      questionsToday: dailyProgress.length > 0 ? dailyProgress[dailyProgress.length - 1].questions_attempted : 0,
    })
    
    // Hydrate bookmarks from backend
    useMCQStore.getState().hydrateBookmarks(user.id)
  }, [user, subjectProgress, dailyProgress, generateSmartNotifications])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  useEffect(() => {
    if (!pomodoroActive) return
    const interval = setInterval(tickPomodoro, 1000)
    return () => clearInterval(interval)
  }, [pomodoroActive, tickPomodoro])

  const formatPomodoro = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const xpPercent = Math.round(((user?.xp ?? 0) % 1000) / 10)

  /* ── Sidebar inner content ── */
  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <button 
        onClick={() => navigate('/app/dashboard')}
        className={`flex items-center gap-3 px-4 py-5 border-b border-flux-border cursor-pointer text-left w-full hover:bg-flux-light transition-colors ${collapsed ? 'justify-center' : ''}`}
      >
        <img src="/logo.png" alt="NeuralLearning" className="w-8 h-8 object-contain flex-shrink-0" />
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="leading-none">
            <div className="font-display text-base font-bold text-flux-dark tracking-tight">NeuralLearning</div>
            <div className="text-[10px] text-flux-slate mt-0.5 font-mono">LEARN ANYWHERE</div>
          </motion.div>
        )}
      </button>

      {/* User card */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-3 my-3 p-3 rounded-xl border border-flux-border bg-flux-light"
        >
          <div className="flex items-center gap-2.5">
            <img src={user?.avatar} className="w-9 h-9 rounded-full ring-2 ring-blue-200 object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-flux-dark truncate">{user?.name}</div>
              <div className="text-[11px] text-flux-slate">Level {user?.level} · {user?.xp} XP</div>
            </div>
            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
              <Flame size={13} />
              {user?.streak}
            </div>
          </div>
          <div className="mt-2.5">
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
            </div>
            <div className="text-[10px] text-flux-slate mt-1 text-right">{xpPercent}% to Level {(user?.level ?? 0) + 1}</div>
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin').map(({ path, icon: Icon, label, color }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => { navigate(path); setMobileOpen(false) }}
              title={collapsed ? label : undefined}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 select-none
                ${collapsed ? 'justify-center' : ''}
                ${active
                  ? 'text-flux-blue bg-flux-blue-light border border-blue-200'
                  : 'text-flux-slate hover:text-flux-dark hover:bg-flux-light'}
              `}
            >
              <Icon size={17} style={{ color: active ? color : undefined }}
                className={active ? '' : 'text-flux-slate'} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{label}</span>
                  {active && <ChevronRight size={13} style={{ color }} />}
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* Pomodoro */}
      {!collapsed && (
        <div className="mx-3 mb-3 mt-2 p-3 rounded-xl border border-flux-border bg-flux-light">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-flux-slate font-medium">
              <Timer size={12} />
              <span>Pomodoro</span>
            </div>
            <span className={`font-mono text-sm font-bold ${
              pomodoroTime < 60 ? 'text-red-500' : 'text-flux-dark'
            }`}>
              {formatPomodoro(pomodoroTime)}
            </span>
          </div>
          <button
            onClick={() => setPomodoroActive(!pomodoroActive)}
            className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              pomodoroActive
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                : 'bg-flux-blue-light border-blue-200 text-flux-blue hover:bg-blue-100'
            }`}
          >
            {pomodoroActive ? '⏸ Pause' : '▶ Start Focus'}
          </button>
        </div>
      )}


    </div>
  )

  return (
    <div className="flex h-screen bg-flux-light overflow-hidden">

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col flex-shrink-0 border-r border-flux-border bg-white relative"
        style={{ boxShadow: '1px 0 0 #E2E8F0' }}
      >
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-[4.5rem] z-10 w-6 h-6 rounded-full bg-white
                     border border-flux-border flex items-center justify-center
                     text-flux-slate hover:text-flux-dark transition-colors shadow-sm"
        >
          {sidebarCollapsed
            ? <ChevronRight size={11} />
            : <X size={11} />}
        </button>
        <SidebarContent collapsed={sidebarCollapsed} />
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-flux-border lg:hidden"
            >
              <SidebarContent collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3
                           border-b border-flux-border bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-flux-slate hover:text-flux-dark hover:bg-flux-light transition-all"
            >
              <Menu size={18} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-flux-dark font-display">
                {NAV_ITEMS.find(n => n.path === location.pathname)?.label || 'Dashboard'}
              </h1>
              <p className="text-[11px] text-flux-slate hidden sm:block">GATE DS 2025 Preparation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Streak */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                            bg-amber-50 border border-amber-200 text-amber-600 text-xs font-bold">
              <Flame size={13} />
              {user?.streak} day streak
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 rounded-xl transition-all ${notifOpen ? 'bg-flux-light text-flux-dark' : 'text-flux-slate hover:text-flux-dark hover:bg-flux-light'}`}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>
              
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-flux-border z-50 overflow-hidden flex flex-col max-h-[400px]"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                  >
                    <div className="flex items-center justify-between p-4 border-b border-flux-border bg-flux-light">
                      <div>
                        <h3 className="font-bold text-flux-dark text-sm">Notifications</h3>
                        <p className="text-xs text-flux-slate">{unreadCount} unread</p>
                      </div>
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => markAllAsRead()}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-flux-blue hover:bg-blue-50 transition-colors"
                        >
                          <CheckCheck size={14} /> Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-flux-slate">
                          <Bell size={24} className="mx-auto mb-2 opacity-20" />
                          <p className="text-sm">You're all caught up!</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-flux-border">
                          {notifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => {
                                if (!n.read) markAsRead(n.id)
                                if (n.actionPath) {
                                  navigate(n.actionPath)
                                  setNotifOpen(false)
                                }
                              }}
                              className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 ${n.read ? 'opacity-60' : 'bg-white'}`}
                            >
                              <div className="flex gap-3">
                                <div 
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                                  style={{ background: n.color + '15', border: `1px solid ${n.color}30` }}
                                >
                                  {n.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start gap-2 mb-1">
                                    <h4 className={`text-sm truncate ${!n.read ? 'font-bold text-flux-dark' : 'font-semibold text-flux-slate'}`}>
                                      {n.title}
                                    </h4>
                                    <span className="text-[10px] text-flux-slate whitespace-nowrap mt-0.5">
                                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-flux-slate leading-relaxed">
                                    {n.message}
                                  </p>
                                  {n.actionLabel && !n.read && (
                                    <div className="mt-2 text-xs font-bold text-flux-blue flex items-center gap-1">
                                      {n.actionLabel} <ChevronRight size={12} />
                                    </div>
                                  )}
                                </div>
                                {!n.read && (
                                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.color }} />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar / Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)}>
                <img
                  src={user?.avatar}
                  className="w-8 h-8 rounded-full ring-2 ring-blue-100 cursor-pointer hover:ring-blue-300 transition-all object-cover"
                  alt=""
                />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-11 w-72 bg-white rounded-2xl border border-flux-border z-50"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                  >
                    {/* Profile header */}
                    <div className="p-4 border-b border-flux-border">
                      <div className="flex items-center gap-3">
                        <img src={user?.avatar} className="w-12 h-12 rounded-full ring-2 ring-blue-200 object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-flux-dark truncate">{user?.name}</div>
                          <div className="text-xs text-flux-slate truncate">{user?.email}</div>
                          <div className="text-[11px] text-flux-blue font-medium mt-0.5">Level {user?.level} · {user?.xp} XP</div>
                        </div>
                      </div>
                    </div>
                    {/* Menu items */}
                    <div className="p-2">
                      <button
                        onClick={() => { setEditProfileOpen(true); setProfileOpen(false); setEditForm({ name: user?.name || '', email: user?.email || '', avatar: user?.avatar || '' }) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-flux-slate hover:bg-flux-light hover:text-flux-dark transition-all"
                      >
                        <Edit3 size={15} />
                        Edit Profile
                      </button>
                      <button
                        onClick={() => { navigate('/app/analytics'); setProfileOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-flux-slate hover:bg-flux-light hover:text-flux-dark transition-all"
                      >
                        <BarChart3 size={15} />
                        My Analytics
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-flux-slate hover:bg-flux-light hover:text-flux-dark transition-all"
                      >
                        <Settings size={15} />
                        Settings
                      </button>
                      <div className="my-1 h-px bg-flux-border" />
                      <button
                        onClick={() => { handleLogout(); setProfileOpen(false) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-all"
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {editProfileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditProfileOpen(false)}
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
                      <h2 className="font-display text-2xl font-bold text-flux-dark">Edit Profile</h2>
                      <button
                        onClick={() => setEditProfileOpen(false)}
                        className="p-2 text-flux-slate hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Avatar edit */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <img src={editForm.avatar || user?.avatar} className="w-20 h-20 rounded-full ring-4 ring-blue-100 object-cover" alt="" />
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setEditForm(f => ({ ...f, avatar: reader.result as string }))
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-flux-blue text-white flex items-center justify-center border-2 border-white hover:bg-blue-700 transition-colors"
                        >
                          <Camera size={14} />
                        </button>
                      </div>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault()
                      const { updateUser } = useAuthStore.getState()
                      updateUser({ name: editForm.name, email: editForm.email, avatar: editForm.avatar })
                      toast.success('Profile updated successfully!')
                      setEditProfileOpen(false)
                    }} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-flux-dark mb-1.5 uppercase tracking-wider">
                          Full Name
                        </label>
                        <div className="relative">
                          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-flux-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-flux-dark mb-1.5 uppercase tracking-wider">
                          Email Address
                        </label>
                        <div className="relative">
                          <Bell size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-flux-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="p-3 rounded-xl bg-flux-light border border-flux-border text-center">
                          <div className="text-lg font-bold text-flux-dark">{user?.streak}</div>
                          <div className="text-[11px] text-flux-slate">Day Streak</div>
                        </div>
                        <div className="p-3 rounded-xl bg-flux-light border border-flux-border text-center">
                          <div className="text-lg font-bold text-flux-dark">Level {user?.level}</div>
                          <div className="text-[11px] text-flux-slate">{user?.xp} XP</div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full btn-neon py-3 mt-4 flex justify-center items-center gap-2"
                      >
                        Save Changes
                      </button>
                    </form>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
