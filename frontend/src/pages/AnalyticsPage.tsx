import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, Brain, Target, Clock, BarChart3, Zap, Loader2 } from 'lucide-react'
import { useProgressStore, useAuthStore } from '@/store'
import { SUBJECT_COLORS, GATE_DA_SUBJECTS } from '@/types'

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs shadow-card-md">
        <div className="text-flux-slate mb-1.5">{label}</div>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-flux-slate">{p.name}:</span>
            <span className="font-bold" style={{ color: p.color }}>{p.value}{p.name.toLowerCase().includes('accuracy') ? '%' : ''}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}



function HeatmapGrid({ dailyProgress }: { dailyProgress: any[] }) {
  const weeks = 8
  const days = 7
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] text-flux-slate text-center">{d}</div>
        ))}
      </div>
      {Array.from({ length: weeks }).map((_, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {Array.from({ length: days }).map((_, di) => {
            const idx = wi * days + di
            const count = dailyProgress[idx]?.questions_attempted || 0
            const opacity = count === 0 ? 0.05 : Math.min(0.9, 0.15 + count * 0.025)
            return (
              <div
                key={di}
                className="aspect-square rounded-sm cursor-pointer hover:scale-125 transition-transform"
                style={{ background: `rgba(37, 99, 235, ${opacity})` }}
                title={`${count} questions`}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const user = useAuthStore((state) => state.user)
  const subjectProgress = useProgressStore((state) => state.subjectProgress)
  const weeklyStats = useProgressStore((state) => state.weeklyStats)
  const dailyProgress = useProgressStore((state) => state.dailyProgress)
  const hydrateFromBackend = useProgressStore((state) => state.hydrateFromBackend)
  const isLoading = useProgressStore((state) => state.isLoading)

  useEffect(() => {
    if (user?.id) {
      hydrateFromBackend(user.id)
    }
  }, [user?.id])

  const displayWeeklyStats = weeklyStats
  const displayDailyProgress = dailyProgress

  const avgAccuracy = subjectProgress.length > 0 ? Math.round(subjectProgress.reduce((s, p) => s + p.accuracy, 0) / subjectProgress.length) : 0
  const totalAttempts = subjectProgress.reduce((s, p) => s + p.attempts, 0)
  const bestSubject = [...subjectProgress].sort((a, b) => b.accuracy - a.accuracy)[0]

  const ACCURACY_TREND = displayDailyProgress.map(d => ({
    date: d.date.slice(5),
    accuracy: d.accuracy,
    questions: d.questions_attempted,
  }))

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

  const TOPIC_MASTERY = subjectProgress
    .flatMap(sp => sp.topics.map(t => ({ topic: t.topic, mastery: t.mastery, subject: sp.subject })))
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 10)

  const SUBJECT_DIST = subjectProgress
    .filter(sp => sp.attempts > 0)
    .map(sp => ({
      name: sp.subject.length > 8 ? sp.subject.slice(0, 8) : sp.subject,
      value: sp.attempts,
      color: SUBJECT_COLORS[sp.subject] || '#2563EB',
    }))

  if (isLoading && subjectProgress.length === 0) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-flux-blue">
          <Loader2 size={20} className="animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-flux-dark font-display">Analytics</h2>
        <p className="text-sm text-flux-slate mt-0.5">Deep insights into your GATE DS preparation</p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Overall Accuracy', value: `${avgAccuracy}%`, icon: Target, color: '#2563EB', trend: avgAccuracy > 0 ? '+5% vs last week' : 'No data', up: avgAccuracy > 0 },
          { label: 'Total Questions', value: totalAttempts, icon: Brain, color: '#0891B2', trend: totalAttempts > 0 ? '+47 this week' : '0 this week', up: totalAttempts > 0 },
          { label: 'Best Subject', value: bestSubject?.subject.slice(0, 10) || 'None', icon: TrendingUp, color: '#059669', trend: bestSubject ? `${bestSubject.accuracy}% accuracy` : '0% accuracy', up: !!bestSubject },
          { label: 'Study Time', value: totalAttempts > 0 ? '48h' : '0h', icon: Clock, color: '#D97706', trend: 'This month', up: totalAttempts > 0 },
        ].map(({ label, value, icon: Icon, color, trend, up }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 rounded-2xl"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <span className={`text-[10px] font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>{trend}</span>
            </div>
            <div className="text-2xl font-bold text-flux-dark">{value}</div>
            <div className="text-xs text-flux-slate mt-0.5">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Radar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-flux-dark mb-1">Skill Radar</h3>
          <p className="text-[11px] text-flux-slate mb-3">Across all GATE subjects</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={RADAR_DATA} cx="50%" cy="50%" outerRadius={85}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Plus Jakarta Sans' }} />
              <Radar name="Mastery" dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2} dot={{ fill: '#2563EB', r: 3 }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Accuracy Trend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass-card p-5 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-flux-dark">Daily Accuracy Trend</h3>
              <p className="text-[11px] text-flux-slate mt-0.5">Last 30 days</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <TrendingUp size={13} />
              Improving
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={ACCURACY_TREND}>
              <defs>
                <linearGradient id="accGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 9 }} axisLine={false} tickLine={false} domain={[40, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="accuracy" name="Accuracy" stroke="#2563EB" strokeWidth={2} fill="url(#accGrad2)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Subject Performance + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Horizontal bar chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-flux-dark mb-4">Subject Accuracy Breakdown</h3>
          <div className="space-y-4">
            {subjectProgress.map(({ subject, accuracy, attempts }) => {
              const color = SUBJECT_COLORS[subject] || '#2563EB'
              return (
                <div key={subject}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-xs text-flux-dark">{subject}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-flux-slate">{attempts} Qs</span>
                      <span className="text-xs font-bold" style={{ color }}>{accuracy}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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

        {/* Pie chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="glass-card p-5 rounded-2xl">
          <h3 className="text-sm font-semibold text-flux-dark mb-4">Questions by Subject</h3>
          <ResponsiveContainer width="100%" height={260}>
            {SUBJECT_DIST.length > 0 ? (
              <PieChart>
                <Pie data={SUBJECT_DIST} cx="45%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {SUBJECT_DIST.map((entry, index) => (
                    <Cell key={index} fill={entry.color} opacity={0.85} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} questions`, '']} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: '#475569', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-flux-slate">No questions attempted yet</div>
            )}
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Weekly Comparison */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-flux-dark">Weekly Performance</h3>
            <p className="text-[11px] text-flux-slate mt-0.5">Accuracy vs Questions Attempted</p>
          </div>
          <span className="badge-green">8 Weeks</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={displayWeeklyStats} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="week" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="attempts" name="Questions" fill="#2563EB" opacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar yAxisId="right" dataKey="accuracy" name="Accuracy" fill="#0891B2" opacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Topic Mastery + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Topic mastery bars */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-flux-dark">Topic Mastery</h3>
            <span className="badge-purple">Top 10</span>
          </div>
          <div className="space-y-3">
            {TOPIC_MASTERY.length > 0 ? TOPIC_MASTERY.map(({ topic, mastery, subject }) => {
              const color = SUBJECT_COLORS[subject as keyof typeof SUBJECT_COLORS] || '#2563EB'
              return (
                <div key={topic} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-flux-slate truncate">{topic}</div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mastery}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color }}>{mastery}%</span>
                </div>
              )
            }) : (
              <div className="text-center text-xs text-flux-slate py-4">Complete topics to see mastery</div>
            )}
          </div>
        </motion.div>

        {/* Activity heatmap */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-flux-dark">Activity Heatmap</h3>
            <p className="text-[11px] text-flux-slate">Last 56 days</p>
          </div>
          <HeatmapGrid dailyProgress={displayDailyProgress} />
          <div className="flex items-center gap-2 mt-4 justify-end">
            <span className="text-[10px] text-flux-slate">Less</span>
            {[0.05, 0.2, 0.4, 0.6, 0.85].map((o) => (
              <div key={o} className="w-3 h-3 rounded-sm" style={{ background: `rgba(37,99,235,${o})` }} />
            ))}
            <span className="text-[10px] text-flux-slate">More</span>
          </div>
        </motion.div>
      </div>

      {/* Study Time Line Chart */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="glass-card p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-flux-dark">Study Time vs XP Earned</h3>
            <p className="text-[11px] text-flux-slate mt-0.5">Last 30 days correlation</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-blue-500 rounded" />
              <span className="text-[11px] text-flux-slate">Study Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-cyan-500 rounded" />
              <span className="text-[11px] text-flux-slate">XP Earned</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={displayDailyProgress.slice(-14)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 9 }} axisLine={false} tickLine={false}
              tickFormatter={v => v.slice(5)} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="study_time" name="Study Time (min)" stroke="#2563EB" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="xp_earned" name="XP Earned" stroke="#0891B2" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* AI Insights */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card p-5 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)', border: '1px solid #BFDBFE' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={15} className="text-flux-blue" />
          <h3 className="text-sm font-semibold text-flux-dark">AI-Generated Insights</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '📈', title: 'Accuracy Trend', desc: 'Your accuracy improved 5% this week. Machine Learning is your fastest-improving subject.' },
            { icon: '⚠️', title: 'Attention Needed', desc: 'Deep Learning (61%) and Databases (55%) need immediate focus. Schedule 2 hours daily.' },
            { icon: '🎯', title: 'GATE Readiness', desc: "Based on current trajectory, you'll be exam-ready in 6 weeks if you maintain current pace." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="p-4 rounded-xl bg-white border border-flux-border">
              <div className="text-xl mb-2">{icon}</div>
              <div className="text-sm font-semibold text-flux-dark mb-1">{title}</div>
              <div className="text-xs text-flux-slate leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
