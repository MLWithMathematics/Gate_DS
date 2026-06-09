import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  isDark: boolean
  onToggle: () => void
}

export default function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="relative w-14 h-7 rounded-full p-0.5 transition-colors duration-500 focus:outline-none"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #1E1B4B, #312E81)'
          : 'linear-gradient(135deg, #FDE68A, #FBBF24)',
        boxShadow: isDark
          ? '0 0 16px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          : '0 0 16px rgba(251,191,36,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
      }}
      aria-label="Toggle dark mode"
    >
      {/* Stars in dark mode */}
      {isDark && (
        <>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{ top: 6, left: 8 }}
          />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            className="absolute w-0.5 h-0.5 rounded-full bg-white"
            style={{ top: 4, left: 18 }}
          />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            className="absolute w-0.5 h-0.5 rounded-full bg-white"
            style={{ top: 16, left: 12 }}
          />
        </>
      )}

      {/* Toggle knob */}
      <motion.div
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #6366F1, #818CF8)'
            : 'linear-gradient(135deg, #FFFFFF, #FEF3C7)',
          boxShadow: isDark
            ? '0 2px 8px rgba(99,102,241,0.4)'
            : '0 2px 8px rgba(0,0,0,0.15)',
        }}
        animate={{
          x: isDark ? 26 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {isDark ? (
          <Moon size={12} className="text-white" />
        ) : (
          <Sun size={12} className="text-amber-500" />
        )}
      </motion.div>
    </button>
  )
}
