import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Loader2, Trophy, Clock, XCircle, Brain, Target, User as UserIcon } from 'lucide-react'
import { useAuthStore, useMultiplayerStore } from '@/store'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

export default function BattlePage() {
  const user = useAuthStore((state) => state.user)
  const {
    status, players, scores, currentMCQ, currentIndex, totalMCQs,
    timeLeft, connect, disconnect, submitAnswer, gameOverReason
  } = useMultiplayerStore()

  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  useEffect(() => {
    // Reset selected option when a new question arrives
    setSelectedOption(null)
  }, [currentMCQ])

  const handleConnect = () => {
    if (user) {
      connect(user.id, user.name)
    }
  }

  const handleSelectOption = (optionId: string) => {
    if (!selectedOption && currentMCQ) {
      setSelectedOption(optionId)
      submitAnswer(currentMCQ.id, optionId)
    }
  }

  // Helper to render players and scores
  const renderScoreBoard = () => {
    const playerIds = Object.keys(players)
    if (playerIds.length === 0) return null

    const me = playerIds.find(id => id === user?.id)
    const opponent = playerIds.find(id => id !== user?.id)

    return (
      <div className="flex justify-between items-center bg-white/50 backdrop-blur-md rounded-2xl p-4 mb-6 shadow-sm border border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-500">
            <UserIcon className="text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-flux-dark">{me ? players[me] : 'You'}</div>
            <div className="text-xl font-black text-blue-600">{me ? scores[me] || 0 : 0} <span className="text-xs text-flux-slate font-medium">pts</span></div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-red-50 text-red-500 font-black text-xs px-3 py-1 rounded-full border border-red-100 mb-1">VS</div>
          {status === 'playing' && (
            <div className={`text-2xl font-black tabular-nums ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-flux-dark'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-sm font-bold text-flux-dark">{opponent ? players[opponent] : 'Opponent'}</div>
            <div className="text-xl font-black text-orange-500">{opponent ? scores[opponent] || 0 : 0} <span className="text-xs text-flux-slate font-medium">pts</span></div>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center border-2 border-orange-500">
            <UserIcon className="text-orange-600" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-flux-dark font-display flex items-center gap-2">
            <Swords className="text-red-500" />
            Multiplayer Arena
          </h2>
          <p className="text-sm text-flux-slate mt-1">Challenge others in real-time battles</p>
        </div>
        {status === 'playing' && (
          <div className="text-sm font-medium px-4 py-1.5 rounded-full bg-blue-50 text-flux-blue">
            Question {currentIndex} of {totalMCQs}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        {status === 'disconnected' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 glass-card rounded-3xl p-10 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
              <Swords size={48} className="text-red-500" />
            </div>
            <h3 className="text-3xl font-black text-flux-dark mb-4 tracking-tight">Ready to Battle?</h3>
            <p className="text-flux-slate mb-8 max-w-md">Test your speed and accuracy against other GATE aspirants. Answer correctly and faster to win.</p>
            <button onClick={handleConnect} className="btn-neon text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center gap-3">
              <Target size={24} /> Find Match
            </button>
          </motion.div>
        )}

        {(status === 'connecting' || status === 'waiting') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 glass-card rounded-3xl flex flex-col items-center justify-center text-center">
            <div className="relative">
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-ping opacity-20"></div>
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center relative z-10">
                <Loader2 size={40} className="text-blue-500 animate-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-flux-dark mt-6 mb-2">
              {status === 'connecting' ? 'Connecting to Arena...' : 'Searching for Opponent...'}
            </h3>
            <p className="text-flux-slate text-sm">Please wait while we match you with another player.</p>
            <button onClick={disconnect} className="mt-8 text-sm text-red-500 hover:text-red-600 font-medium">Cancel</button>
          </motion.div>
        )}

        {status === 'playing' && (
          <div className="flex-1 flex flex-col">
            {renderScoreBoard()}
            
            <AnimatePresence mode="wait">
              {currentMCQ ? (
                <motion.div
                  key={currentMCQ.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 glass-card rounded-3xl p-6 lg:p-8 flex flex-col"
                >
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="badge-purple">{currentMCQ.subject}</span>
                    <span className="badge-cyan">{currentMCQ.topic}</span>
                  </div>
                  
                  <div className="ai-prose text-lg text-flux-dark mb-8 flex-1">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {currentMCQ.question}
                    </ReactMarkdown>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
                    {currentMCQ.options.map((opt: any) => {
                      const isSelected = selectedOption === opt.id;
                      // We don't show right/wrong immediately in multiplayer until timer ends (answer_reveal)
                      // Actually, for simplicity we just lock it.
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          disabled={selectedOption !== null || timeLeft === 0}
                          className={`
                            p-4 rounded-xl text-left border-2 transition-all flex items-center gap-4
                            ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 bg-white'}
                            ${selectedOption !== null && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          <span className={`
                            w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0
                            ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}
                          `}>
                            {opt.id.toUpperCase()}
                          </span>
                          <span className="flex-1 text-sm"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt.text}</ReactMarkdown></span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-flux-blue" />
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {status === 'finished' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 glass-card rounded-3xl p-10 flex flex-col items-center justify-center text-center">
            {renderScoreBoard()}
            
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center mb-6 text-white shadow-xl shadow-yellow-500/30">
              <Trophy size={48} />
            </div>
            <h3 className="text-3xl font-black text-flux-dark mb-2">Match Finished!</h3>
            {gameOverReason && <p className="text-red-500 text-sm font-bold mb-4">{gameOverReason}</p>}
            
            <p className="text-flux-slate mb-8 max-w-sm">Great effort! Check the scores above to see how you did. Want to go another round?</p>
            <button onClick={() => { disconnect(); handleConnect() }} className="btn-neon text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center gap-3">
              <Swords size={24} /> Play Again
            </button>
            <button onClick={disconnect} className="mt-4 text-sm text-flux-slate hover:text-flux-dark">Leave Arena</button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
