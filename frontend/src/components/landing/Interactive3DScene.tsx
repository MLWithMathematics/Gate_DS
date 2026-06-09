import { useRef, useEffect, useState } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'
import { Brain, BarChart3, Sparkles, Cpu, Database, Layers } from 'lucide-react'

interface FloatingElement {
  id: string
  icon: React.ElementType
  x: number
  y: number
  z: number
  size: number
  color: string
  delay: number
  label: string
}

const ELEMENTS: FloatingElement[] = [
  { id: 'brain', icon: Brain, x: -220, y: -120, z: 80, size: 56, color: '#818CF8', delay: 0, label: 'AI Engine' },
  { id: 'chart', icon: BarChart3, x: 200, y: -80, z: 60, size: 48, color: '#34D399', delay: 0.1, label: 'Analytics' },
  { id: 'spark', icon: Sparkles, x: -180, y: 100, z: 40, size: 44, color: '#FBBF24', delay: 0.2, label: 'Smart MCQs' },
  { id: 'cpu', icon: Cpu, x: 240, y: 120, z: 70, size: 52, color: '#F472B6', delay: 0.15, label: 'RAG Solver' },
  { id: 'db', icon: Database, x: 0, y: -180, z: 50, size: 40, color: '#22D3EE', delay: 0.25, label: '10K+ Questions' },
  { id: 'layers', icon: Layers, x: -40, y: 160, z: 90, size: 46, color: '#A78BFA', delay: 0.3, label: 'Mock Tests' },
]

// Orbiting particles
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  angle: (i / 20) * Math.PI * 2,
  radius: 180 + Math.random() * 120,
  speed: 0.3 + Math.random() * 0.7,
  size: 2 + Math.random() * 4,
  opacity: 0.3 + Math.random() * 0.5,
  color: ['#818CF8', '#34D399', '#22D3EE', '#FBBF24', '#F472B6'][Math.floor(Math.random() * 5)],
}))

// Connection lines between nodes
const CONNECTIONS = [
  [0, 1], [1, 3], [3, 5], [5, 2], [2, 0], [0, 4], [4, 1], [2, 3],
]

export default function Interactive3DScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 0.02)
    }, 33)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      mouseX.set((e.clientX - cx) / rect.width)
      mouseY.set((e.clientY - cy) / rect.height)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[480px] md:h-[520px]"
      style={{ perspective: '1200px' }}
    >
      {/* Central glowing orb */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{
          x: '-50%',
          y: '-50%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0.05) 70%, transparent 100%)',
          filter: 'blur(2px)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Inner ring */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{
          x: '-50%',
          y: '-50%',
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(99,102,241,0.15)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />

      {/* Outer ring */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{
          x: '-50%',
          y: '-50%',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: '1px dashed rgba(99,102,241,0.1)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
      />

      {/* SVG Connection lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        {CONNECTIONS.map(([from, to], i) => {
          const f = ELEMENTS[from]
          const t = ELEMENTS[to]
          const cx = containerRef.current ? containerRef.current.offsetWidth / 2 : 300
          const cy = containerRef.current ? containerRef.current.offsetHeight / 2 : 260
          return (
            <motion.line
              key={i}
              x1={cx + f.x}
              y1={cy + f.y}
              x2={cx + t.x}
              y2={cy + t.y}
              stroke="url(#lineGrad)"
              strokeWidth="1"
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            />
          )
        })}
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#22D3EE" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      {/* Orbiting particles */}
      {PARTICLES.map((p) => {
        const angle = p.angle + time * p.speed
        const px = Math.cos(angle) * p.radius
        const py = Math.sin(angle) * p.radius * 0.5 // elliptical
        return (
          <motion.div
            key={p.id}
            className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
              x: px - p.size / 2,
              y: py - p.size / 2,
              filter: `blur(${p.size > 4 ? 1 : 0}px)`,
            }}
          />
        )
      })}

      {/* Floating 3D elements */}
      {ELEMENTS.map((el) => {
        const Icon = el.icon
        const isHovered = hoveredId === el.id
        const floatY = Math.sin(time * 1.5 + el.delay * 10) * 12

        return (
          <motion.div
            key={el.id}
            className="absolute left-1/2 top-1/2 cursor-pointer"
            style={{
              x: el.x - el.size / 2,
              y: el.y - el.size / 2 + floatY,
              rotateX: smoothY,
              rotateY: smoothX,
              z: el.z,
              transformStyle: 'preserve-3d',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: isHovered ? 1.2 : 1 }}
            transition={{
              opacity: { delay: el.delay + 0.3, duration: 0.5 },
              scale: { delay: el.delay + 0.3, duration: 0.5, type: 'spring' },
            }}
            onMouseEnter={() => setHoveredId(el.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Glow behind */}
            <div
              className="absolute inset-0 rounded-2xl transition-opacity duration-300"
              style={{
                background: el.color,
                opacity: isHovered ? 0.3 : 0.1,
                filter: 'blur(16px)',
                transform: 'scale(1.5)',
              }}
            />

            {/* Card */}
            <div
              className="relative flex flex-col items-center justify-center rounded-2xl backdrop-blur-md transition-all duration-300"
              style={{
                width: el.size,
                height: el.size,
                background: isHovered
                  ? `linear-gradient(135deg, ${el.color}30, ${el.color}15)`
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isHovered ? el.color + '60' : 'rgba(255,255,255,0.1)'}`,
                boxShadow: isHovered
                  ? `0 8px 32px ${el.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`
                  : '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <Icon
                size={el.size * 0.4}
                style={{ color: el.color }}
                className="transition-transform duration-300"
              />
            </div>

            {/* Label tooltip */}
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{
                  top: el.size + 8,
                  background: 'rgba(15,20,40,0.9)',
                  border: `1px solid ${el.color}40`,
                  color: el.color,
                  backdropFilter: 'blur(8px)',
                }}
              >
                {el.label}
              </motion.div>
            )}
          </motion.div>
        )
      })}

      {/* Center logo / icon */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{
          x: '-50%',
          y: '-50%',
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            boxShadow: '0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2)',
          }}
        >
          <Sparkles size={28} className="text-white" style={{ animation: 'none' }} />
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, var(--scene-fade-color, transparent), transparent)',
        }}
      />
    </div>
  )
}
