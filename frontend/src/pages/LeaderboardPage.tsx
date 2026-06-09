import { motion } from 'framer-motion'
import { Trophy, Flame, Target, Crown, Medal, TrendingUp, Calendar, Infinity } from 'lucide-react'
import { useAuthStore, useProgressStore } from '@/store'
import { useEffect, useState } from 'react'

type Period = 'weekly' | 'all_time'

export default function LeaderboardPage() {
  const user = useAuthStore((state) => state.user)
  const leaderboard = useProgressStore((state) => state.leaderboard)
  const hydrateLeaderboard = useProgressStore((state) => state.hydrateLeaderboard)
  const [period, setPeriod] = useState<Period>('weekly')

  useEffect(() => {
    hydrateLeaderboard(period)
  }, [period])

  const displayLeaderboard = leaderboard

  const myRank = displayLeaderboard.find(e => e.name === user?.name)

  const top3 = displayLeaderboard.slice(0, 3)
  const rest = displayLeaderboard.slice(3)

  const periodLabel = period === 'weekly' ? 'This Week' : 'All Time'
  const periodSubtext = period === 'weekly' ? 'Resets every Monday' : 'Lifetime rankings'

  if (displayLeaderboard.length === 0) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-flux-dark font-display">Leaderboard</h2>
            <p className="text-sm text-flux-slate mt-0.5">{periodLabel} · {periodSubtext}</p>
          </div>
          <PeriodToggle period={period} onToggle={setPeriod} />
        </div>
        <div className="glass-card p-10 text-center rounded-2xl">
          <Trophy size={48} className="mx-auto text-flux-slate opacity-20 mb-4" />
          <h3 className="text-lg font-semibold text-flux-dark mb-1">No rankings yet</h3>
          <p className="text-sm text-flux-slate">Be the first to complete a practice session and get on the board!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-flux-dark font-display">Leaderboard</h2>
          <p className="text-sm text-flux-slate mt-0.5">{periodLabel} · {periodSubtext}</p>
        </div>
        <PeriodToggle period={period} onToggle={setPeriod} />
      </div>

      {/* My Rank Banner */}
      {myRank && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-blue-200 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-flux-blue">
              #{myRank.rank}
            </div>
            <div>
              <div className="text-sm font-semibold text-flux-dark">Your Rank</div>
              <div className="text-xs text-flux-slate">{myRank.score.toLocaleString()} XP · {myRank.accuracy}% accuracy</div>
            </div>
          </div>
          {myRank.rank > 1 && (
            <div className="text-right">
              <div className="text-xs text-flux-slate">To reach #{myRank.rank - 1}</div>
              <div className="text-sm font-bold text-flux-blue">
                +{(displayLeaderboard[myRank.rank - 2]?.score - myRank.score).toLocaleString()} XP needed
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-3 pt-4">
        {/* 2nd place */}
        {top3[1] && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 max-w-[160px]"
          >
            <div className="glass-card p-4 rounded-2xl text-center"
              style={{ background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)' }}>
              <div className="text-3xl mb-2">🥈</div>
              <img src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${top3[1].name}`}
                className="w-12 h-12 rounded-full mx-auto mb-2 ring-2 ring-slate-300" alt="" />
              <div className="text-sm font-semibold text-flux-dark truncate">{top3[1].name}</div>
              <div className="text-xs text-flux-slate mt-0.5">{top3[1].score.toLocaleString()} XP</div>
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <span className="text-[10px] text-flux-slate flex items-center gap-0.5">
                  <Flame size={10} className="text-amber-500" />{top3[1].streak}d
                </span>
                <span className="text-[10px] text-green-600 font-medium">{top3[1].accuracy}%</span>
              </div>
            </div>
            <div className="h-14 rounded-b-xl mt-0.5" style={{ background: 'linear-gradient(180deg, #F1F5F9, #F8FAFC)' }} />
          </motion.div>
        )}

        {/* 1st place */}
        {top3[0] && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="flex-1 max-w-[180px]"
          >
            <div className="relative glass-card p-5 rounded-2xl text-center border border-amber-200"
              style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', boxShadow: '0 4px 24px rgba(245,158,11,0.15)' }}>
              <Crown size={20} className="text-amber-500 mx-auto mb-2" />
              <img src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${top3[0].name}`}
                className="w-14 h-14 rounded-full mx-auto mb-2 ring-2 ring-amber-300" alt="" />
              <div className="text-sm font-bold text-flux-dark truncate">{top3[0].name}</div>
              <div className="text-xs text-amber-600 mt-0.5 font-semibold">{top3[0].score.toLocaleString()} XP</div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="badge-orange">{top3[0].accuracy}% acc</span>
                <span className="text-[10px] text-flux-slate flex items-center gap-0.5">
                  <Flame size={10} className="text-amber-500" />{top3[0].streak}d
                </span>
              </div>
            </div>
            <div className="h-20 rounded-b-xl mt-0.5" style={{ background: 'linear-gradient(180deg, #FEF3C7, #FFFBEB)' }} />
          </motion.div>
        )}

        {/* 3rd place */}
        {top3[2] && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 max-w-[160px]"
          >
            <div className="glass-card p-4 rounded-2xl text-center"
              style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)' }}>
              <div className="text-3xl mb-2">🥉</div>
              <img src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${top3[2].name}`}
                className="w-12 h-12 rounded-full mx-auto mb-2 ring-2 ring-orange-200" alt="" />
              <div className="text-sm font-semibold text-flux-dark truncate">{top3[2].name}</div>
              <div className="text-xs text-flux-slate mt-0.5">{top3[2].score.toLocaleString()} XP</div>
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <span className="text-[10px] text-flux-slate flex items-center gap-0.5">
                  <Flame size={10} className="text-amber-500" />{top3[2].streak}d
                </span>
                <span className="text-[10px] text-green-600 font-medium">{top3[2].accuracy}%</span>
              </div>
            </div>
            <div className="h-8 rounded-b-xl mt-0.5" style={{ background: 'linear-gradient(180deg, #FFEDD5, #FFF7ED)' }} />
          </motion.div>
        )}
      </div>

      {/* Rest of leaderboard */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-flux-border text-[11px] font-semibold text-flux-slate uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-4">Student</div>
          <div className="col-span-2 text-center hidden sm:block">Streak</div>
          <div className="col-span-2 text-center hidden sm:block">Accuracy</div>
          <div className="col-span-3 sm:col-span-3 text-right">Score</div>
        </div>

        {rest.map((entry, i) => {
          const isMe = entry.name === user?.name
          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className={`grid grid-cols-12 px-5 py-4 border-b border-flux-border items-center transition-all hover:bg-flux-light ${
                isMe ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="col-span-1">
                <span className={`text-sm font-bold ${isMe ? 'text-flux-blue' : 'text-flux-slate'}`}>
                  {entry.rank}
                </span>
              </div>
              <div className="col-span-4 flex items-center gap-3">
                <div className="relative">
                  <img
                    src={`https://api.dicebear.com/8.x/avataaars/svg?seed=${entry.name}`}
                    className={`w-9 h-9 rounded-full ${isMe ? 'ring-2 ring-blue-300' : ''}`}
                    alt=""
                  />
                  {isMe && <span className="absolute -bottom-1 -right-1 text-[10px]">✨</span>}
                </div>
                <div>
                  <div className={`text-sm font-medium ${isMe ? 'text-flux-blue' : 'text-flux-dark'}`}>
                    {entry.name} {isMe && <span className="text-[10px] text-flux-blue">(You)</span>}
                  </div>
                  <div className="text-[11px] text-flux-slate">{entry.badge} Top Student</div>
                </div>
              </div>
              <div className="col-span-2 text-center hidden sm:flex items-center justify-center gap-1">
                <Flame size={12} className="text-amber-500" />
                <span className="text-xs text-flux-slate">{entry.streak}d</span>
              </div>
              <div className="col-span-2 text-center hidden sm:block">
                <span className={`text-xs font-semibold ${entry.accuracy >= 70 ? 'text-green-600' : entry.accuracy >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                  {entry.accuracy}%
                </span>
              </div>
              <div className="col-span-5 sm:col-span-3 text-right">
                <span className={`text-sm font-bold ${isMe ? 'text-flux-blue' : 'text-flux-dark'}`}>
                  {entry.score.toLocaleString()}
                </span>
                <div className="text-[10px] text-flux-slate">XP</div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* How to climb */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-5 rounded-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-flux-blue" />
          <h3 className="text-sm font-semibold text-flux-dark">How to Earn XP</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { action: 'Correct MCQ', xp: '+10 XP', icon: '✅' },
            { action: 'Mock Test', xp: '+50-200 XP', icon: '📝' },
            { action: 'Daily Streak', xp: 'Auto-tracked', icon: '🔥' },
            { action: 'Perfect Score', xp: '+500 XP', icon: '💎' },
          ].map(({ action, xp, icon }) => (
            <div key={action} className="p-3 rounded-xl bg-flux-light border border-flux-border text-center">
              <div className="text-xl mb-1.5">{icon}</div>
              <div className="text-xs text-flux-dark font-medium">{action}</div>
              <div className="text-xs text-flux-blue font-bold mt-0.5">{xp}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

/** Weekly / All-Time toggle pill */
function PeriodToggle({ period, onToggle }: { period: Period; onToggle: (p: Period) => void }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
      <button
        onClick={() => onToggle('weekly')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          period === 'weekly'
            ? 'bg-white text-flux-blue shadow-sm border border-blue-200'
            : 'text-flux-slate hover:text-flux-dark'
        }`}
      >
        <Calendar size={12} />
        Weekly
      </button>
      <button
        onClick={() => onToggle('all_time')}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          period === 'all_time'
            ? 'bg-white text-flux-blue shadow-sm border border-blue-200'
            : 'text-flux-slate hover:text-flux-dark'
        }`}
      >
        <Infinity size={12} />
        All Time
      </button>
    </div>
  )
}
