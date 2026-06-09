import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from 'recharts'
import { Brain, Flame, Trophy, Target, TrendingUp, Zap, BookOpen, AlertTriangle, Star, ChevronRight, Loader2 } from 'lucide-react'
import { useAuthStore, useProgressStore } from '@/store'
import { MOCK_LEADERBOARD } from '@/tests/mocks/mockData'
import { SUBJECT_COLORS, GATE_DA_SUBJECTS } from '@/types'
import { useNavigate } from 'react-router-dom'

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; color: string }>; label?: string
}) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card px-3 py-2.5 text-xs shadow-card-md">
        <div className="text-flux-slate mb-1 font-medium">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="font-bold" style={{ color: p.color }}>{p.value}%</div>
        ))}
      </div>
    )
  }
  return null
}

function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: typeof Brain; label: string; value: string; sub?: string; color: string; trend?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="glass-card p-5 rounded-2xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {trend && (
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${color}12`, color }}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="font-display text-2xl font-bold text-flux-dark mb-0.5">{value}</div>
      <div className="text-xs text-flux-slate font-medium">{label}</div>
      {sub && <div className="text-[11px] text-flux-slate/70 mt-0.5">{sub}</div>}
    </motion.div>
  )
}

function HeatmapCell({ count }: { count: number }) {
  const opacity = count === 0 ? 0.06 : Math.min(0.85, 0.18 + count * 0.03)
  return (
    <div
      className="w-3 h-3 rounded-sm cursor-pointer hover:scale-125 transition-transform"
      style={{ background: `rgba(37, 99, 235, ${opacity})` }}
      title={`${count} questions`}
    />
  )
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const subjectProgress = useProgressStore((state) => state.subjectProgress)
  const weeklyStats = useProgressStore((state) => state.weeklyStats)
  const dailyProgress = useProgressStore((state) => state.dailyProgress)
  const leaderboard = useProgressStore((state) => state.leaderboard)
  const hydrateFromBackend = useProgressStore((state) => state.hydrateFromBackend)
  const hydrateLeaderboard = useProgressStore((state) => state.hydrateLeaderboard)
  const navigate             = useNavigate()
  const [isLoading, setIsLoading] = useState(true)

  // Hydrate data from backend on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      if (user?.id) {
        await Promise.all([
          hydrateFromBackend(user.id),
          hydrateLeaderboard(),
        ])
      }
      setIsLoading(false)
    }
    load()
  }, [user?.id])

  // Generate radar data from live subjectProgress
  const RADAR_DATA = subjectProgress.length > 0
    ? subjectProgress.map(sp => ({
        subject: sp.subject.length > 6 ? sp.subject.slice(0, 6) : sp.subject,
        value: sp.accuracy,
        fullMark: 100,
      }))
    : GATE_DA_SUBJECTS.map(sub => ({
        subject: sub.length > 6 ? sub.slice(0, 6) : sub,
        value: 0,
        fullMark: 100,
      }))

  // Use backend data (no mock fallbacks for user data)
  const displayWeeklyStats = weeklyStats
  const displayDailyProgress = dailyProgress
  const displayLeaderboard = leaderboard

  const avgAccuracy = subjectProgress.length > 0 ? Math.round(subjectProgress.reduce((s, p) => s + p.accuracy, 0) / subjectProgress.length) : 0
  const totalQuestions = subjectProgress.reduce((s, p) => s + p.attempts, 0)

  const weakSubjects  = [...subjectProgress]
    .filter(s => s.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
  const heatmapData   = displayDailyProgress.slice(-28)

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── Welcome bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-display text-xl font-bold text-flux-dark">
            Welcome back, <span style={{ color: '#2563EB' }}>{user?.name?.split(' ')[0]}</span> 👋
          </h2>
          <p className="text-sm text-flux-slate mt-0.5">Here's your GATE DS progress at a glance</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl
                        border border-amber-200 bg-amber-50">
          <Flame size={15} className="text-amber-500" />
          <span className="text-amber-600 font-bold text-sm">{user?.streak} Day Streak!</span>
        </div>
      </motion.div>

      {/* ── Daily challenge banner ── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl p-5 flex items-center justify-between cursor-pointer group
                   border transition-all duration-300 hover:shadow-card-hover"
        style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 100%)',
          borderColor: '#BFDBFE',
        }}
        onClick={() => navigate('/app/practice')}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-flux-dark font-bold text-sm">Daily Challenge</span>
              <span className="badge-purple text-[10px]">+50 XP</span>
            </div>
            <p className="text-xs text-flux-slate mt-0.5">5 Machine Learning questions · 10 min · Medium difficulty</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-flux-slate group-hover:text-flux-blue group-hover:translate-x-1 transition-all" />
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target}  label="Overall Accuracy"  value={`${avgAccuracy}%`}                          sub={avgAccuracy > 0 ? "+5% this week" : "No data"}    color="#2563EB" trend={avgAccuracy > 0 ? "↑ Improving" : ""} />
        <StatCard icon={Brain}   label="Questions Solved"  value={`${totalQuestions}`}                          sub={totalQuestions > 0 ? "32 today" : "0 today"}         color="#0891B2" trend={totalQuestions > 0 ? "+32" : ""} />
        <StatCard icon={Zap}     label="Total XP"          value={`${user?.xp?.toLocaleString() || 0}`} sub={`Level ${user?.level || 1}`} color="#D97706" trend={`Level ${user?.level || 1}`} />
        <StatCard icon={Trophy}  label="Mock Test Avg"     value="0%"                          sub="Take a test"          color="#059669" trend="" />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Radar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-5 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm font-bold text-flux-dark">Subject Mastery</h3>
              <p className="text-[11px] text-flux-slate mt-0.5">Your skill radar</p>
            </div>
            <span className="badge-purple">All Subjects</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA} cx="50%" cy="50%" outerRadius={80}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Plus Jakarta Sans' }} />
              <Radar
                name="Mastery" dataKey="value"
                stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2}
                dot={{ fill: '#2563EB', strokeWidth: 0, r: 3 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Accuracy trend */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 rounded-2xl lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm font-bold text-flux-dark">Accuracy Trend</h3>
              <p className="text-[11px] text-flux-slate mt-0.5">8-week performance</p>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} className="text-green-500" />
              <span className="text-xs text-green-600 font-semibold">+27% overall</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={displayWeeklyStats}>
              <defs>
                <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="week"     tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis                    tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="accuracy" stroke="#2563EB" strokeWidth={2}
                fill="url(#accGrad)" name="Accuracy" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ── Subject progress + weak areas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Subject progress */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 rounded-2xl lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-sm font-bold text-flux-dark">Subject Performance</h3>
            <button
              className="text-xs font-semibold text-flux-blue hover:text-blue-700 transition-colors"
              onClick={() => navigate('/app/analytics')}
            >
              View All →
            </button>
          </div>
          <div className="space-y-4">
            {subjectProgress.map(({ subject, accuracy, attempts }) => {
              const color = SUBJECT_COLORS[subject] || '#2563EB'
              return (
                <div key={subject}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-flux-dark">{subject}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-flux-slate">{attempts} solved</span>
                      <span className="text-sm font-bold" style={{ color }}>{accuracy}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${accuracy}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Weak areas */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 rounded-2xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className={weakSubjects.length > 0 ? "text-amber-500" : "text-green-500"} />
            <h3 className="font-display text-sm font-bold text-flux-dark">Weak Areas</h3>
          </div>
          <div className="space-y-3 mb-5">
            {weakSubjects.length > 0 ? (
              weakSubjects.map(({ subject, accuracy }) => (
                <div
                  key={subject}
                  className="flex items-center justify-between p-3 rounded-xl
                             bg-red-50 border border-red-100"
                >
                  <div>
                    <div className="text-sm font-medium text-flux-dark">{subject}</div>
                    <div className="text-[11px] text-flux-slate mt-0.5">Needs attention</div>
                  </div>
                  <div className="badge-red">{accuracy}%</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <span className="text-sm font-medium text-flux-slate block mb-1">Looking good!</span>
                <span className="text-xs text-flux-slate/70">No weak areas identified yet. Keep practicing!</span>
              </div>
            )}
          </div>

          <div className="neon-divider mb-4" />

          <div className="flex items-center gap-2 mb-3">
            <Star size={12} className="text-flux-blue" />
            <span className="text-xs font-bold text-flux-slate uppercase tracking-wide">AI Recommendations</span>
          </div>
          <div className="space-y-2">
            {[
              'Practice 10 Deep Learning MCQs today',
              'Revise Database normalization',
              'Take a Statistics mock test',
            ].map((rec, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-flux-blue-light
                           border border-blue-100 cursor-pointer hover:border-blue-300 transition-colors"
              >
                <Zap size={11} className="text-flux-blue flex-shrink-0" />
                <span className="text-xs text-flux-dark font-medium">{rec}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Activity heatmap ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-5 rounded-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-sm font-bold text-flux-dark">Study Activity</h3>
            <p className="text-[11px] text-flux-slate mt-0.5">Last 28 days</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-flux-slate">
            <span>Less</span>
            {[0.06, 0.2, 0.4, 0.6, 0.85].map(o => (
              <div key={o} className="w-3 h-3 rounded-sm" style={{ background: `rgba(37,99,235,${o})` }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {heatmapData.map((day, i) => (
            <HeatmapCell key={i} count={day.questions_attempted} />
          ))}
        </div>
      </motion.div>

      {/* ── Bar chart + Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5 rounded-2xl"
        >
          <h3 className="font-display text-sm font-bold text-flux-dark mb-4">Questions Attempted</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={displayWeeklyStats}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="week"    tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis                   tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="attempts" fill="url(#barGrad)" radius={[4, 4, 0, 0]} name="Questions" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Leaderboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-5 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-flux-dark">Leaderboard</h3>
            <button
              className="text-xs font-semibold text-flux-blue hover:text-blue-700 transition-colors"
              onClick={() => navigate('/app/leaderboard')}
            >
              Full Board →
            </button>
          </div>
          <div className="space-y-2">
            {displayLeaderboard.length > 0 ? displayLeaderboard.slice(0, 5).map(({ rank, name, score, accuracy, badge }) => {
              const isMe = name === user?.name
              return (
                <div
                  key={rank}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                    isMe
                      ? 'border border-blue-200 bg-flux-blue-light'
                      : 'hover:bg-flux-light'
                  }`}
                >
                  <span className="text-sm font-bold text-flux-slate w-5 text-center">{rank}</span>
                  <span className="text-base">{badge}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isMe ? 'text-flux-blue' : 'text-flux-dark'}`}>
                      {name} {isMe && '(You)'}
                    </div>
                    <div className="text-[11px] text-flux-slate">{accuracy}% accuracy</div>
                  </div>
                  <div className="font-display text-sm font-bold text-flux-dark">{score.toLocaleString()}</div>
                </div>
              )
            }) : (
              <div className="text-center py-4 text-sm text-flux-slate">No rankings yet. Complete questions to join!</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Achievements ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-5 rounded-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-flux-dark">Achievements</h3>
          <span className="text-xs text-flux-slate">
            {(user?.badges || []).filter(b => b.unlocked).length}/{(user?.badges || []).length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {(user?.badges || []).map(badge => (
            <div
              key={badge.id}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                badge.unlocked
                  ? 'border border-blue-100 bg-flux-blue-light'
                  : 'border border-flux-border bg-flux-light opacity-50 grayscale'
              }`}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-[10px] text-flux-slate text-center leading-tight font-medium">{badge.name}</span>
            </div>
          ))}
        </div>
      </motion.div>

    </div>
  )
}
