import { motion, useScroll, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import {
  Brain, Zap, BarChart3, Trophy, MessageSquareText,
  ArrowRight, Sparkles, ChevronRight, Star, Users, Target, Clock,
  CheckCircle2, TrendingUp, BookOpen, FlaskConical
} from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { RADAR_DATA } from '@/tests/mocks/mockData'
import AuthModal from '@/components/auth/AuthModal'
import Interactive3DScene from '@/components/landing/Interactive3DScene'
import ThemeToggle from '@/components/landing/ThemeToggle'
import { useUIStore } from '@/store'

const FEATURES = [
  { icon: Brain, title: 'AI-Powered MCQ Practice', desc: '10,000+ questions with instant AI explanations. Subject-wise, topic-wise, difficulty-adaptive.', color: '#2563EB', bg: '#EFF6FF' },
  { icon: MessageSquareText, title: 'RAG Doubt Solver', desc: 'Ask any GATE concept. Get structured answers with LaTeX formulas, streamed in real-time.', color: '#0891B2', bg: '#F0FDFA' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'Radar charts, heatmaps, accuracy trends. Know your weak areas before the exam.', color: '#059669', bg: '#F0FDF4' },
  { icon: Trophy, title: 'Gamified Learning', desc: "XP points, streak tracking, badges, leaderboard. Learning that's actually addictive.", color: '#D97706', bg: '#FFFBEB' },
  { icon: Target, title: 'Mock Tests', desc: 'Full-length timed tests with palette navigation, auto-submit and deep result analytics.', color: '#DC2626', bg: '#FEF2F2' },
  { icon: Clock, title: 'Pomodoro Timer', desc: 'Built-in study timer with break reminders. Optimize your focus sessions automatically.', color: '#7C3AED', bg: '#F5F3FF' },
]

const STATS = [
  { label: 'MCQs Available', value: '10,000+', icon: Brain },
  { label: 'Active Students', value: '50,000+', icon: Users },
  { label: 'Score Improvement', value: '34%', icon: BarChart3 },
  { label: 'AI Explanations', value: '500K+', icon: Sparkles },
]

const PROCESS = [
  { num: '01', title: 'Practice MCQs', desc: 'Work through 10,000+ curated GATE DS questions with AI-generated explanations after every attempt.' },
  { num: '02', title: 'Analyse Gaps', desc: 'Radar charts and heatmaps pinpoint exactly which topics cost you marks. No more guessing what to study.' },
  { num: '03', title: 'Ace the Exam', desc: 'Simulate real GATE conditions with full-length mock tests, then review detailed performance analytics.' },
]

const TESTIMONIALS = [
  { name: 'Priya Patel', institute: 'IIT Bombay', text: 'The AI tutor explained eigenvalues better than my professor. Scored 98 percentile in GATE DS!', score: '98.2%ile', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=priya' },
  { name: 'Rahul Gupta', institute: 'NIT Trichy', text: 'Mock tests are insanely good. The weak area detection helped me focus exactly where I needed.', score: '96.8%ile', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=rahul' },
  { name: 'Ananya Singh', institute: 'BITS Pilani', text: "The streak system kept me going for 45 days straight. Best GATE prep platform I've used.", score: '97.5%ile', avatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=ananya' },
]

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: '/mo',
    featured: false,
    features: ['500 MCQs / month', 'Basic analytics', 'AI Doubt Solver (20 queries)', 'Community leaderboard'],
    cta: 'Get Started Free',
  },
  {
    name: 'Pro',
    price: '₹299',
    period: '/mo',
    featured: true,
    features: ['Unlimited MCQs', 'Full analytics & heatmaps', 'Unlimited AI Doubt Solver', '10 mock tests / month', 'Study plan generator', 'Priority support'],
    cta: 'Start Pro',
  },
  {
    name: 'Intensive',
    price: '₹799',
    period: '/mo',
    featured: false,
    features: ['Everything in Pro', 'Unlimited mock tests', 'Personal study roadmap', 'Weekly mentor sessions', 'Previous Year Papers', 'Exam day simulator'],
    cta: 'Go Intensive',
  },
]

/* ── Typewriter ── */
function TypewriterText({ texts }: { texts: string[] }) {
  const [index, setIndex] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const target = texts[index]
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayed.length < target.length) {
          setDisplayed(target.slice(0, displayed.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 2200)
        }
      } else {
        if (displayed.length > 0) {
          setDisplayed(displayed.slice(0, -1))
        } else {
          setIsDeleting(false)
          setIndex(i => (i + 1) % texts.length)
        }
      }
    }, isDeleting ? 35 : 75)
    return () => clearTimeout(timeout)
  }, [displayed, isDeleting, index, texts])

  return (
    <span className="gradient-text-hero">
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-[3px] h-[1em] ml-0.5 align-text-bottom rounded-sm"
        style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
      />
    </span>
  )
}

/* ── Counter animation ── */
function AnimatedCounter({ value }: { value: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {value}
    </motion.span>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const { isDarkMode, toggleDarkMode } = useUIStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  return (
    <div className="min-h-screen overflow-x-hidden transition-colors duration-500" style={{ background: 'var(--landing-bg)', color: 'var(--landing-text)' }}>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* ──────────────── NAV ──────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b" style={{ background: 'var(--landing-nav-bg)', borderColor: 'var(--landing-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: isDarkMode ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#0F2044' }}
            >
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight" style={{ color: 'var(--landing-text)' }}>GATE.AI</span>
          </div>

          {/* Links — desktop */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: 'var(--landing-text-muted)' }}>
            {['Features', 'Process', 'Testimonials', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`}
                className="hover:opacity-80 transition-opacity">{l}</a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <ThemeToggle isDark={isDarkMode} onToggle={toggleDarkMode} />
            <button onClick={() => setIsAuthModalOpen(true)} className="btn-ghost hidden sm:flex text-sm px-4 py-2">
              Sign In
            </button>
            <button onClick={() => setIsAuthModalOpen(true)} className="btn-neon text-sm px-4 py-2 flex items-center gap-1.5">
              Get Started <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </nav>

      {/* ──────────────── HERO ──────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-16 px-4 overflow-hidden">
        {/* Background dot grid */}
        <div className="absolute inset-0 cyber-grid-bg opacity-100 pointer-events-none" />
        {/* Subtle color wash */}
        <motion.div style={{ y: heroY }} className="absolute inset-0 pointer-events-none">
          <div className="orb w-[700px] h-[700px] opacity-[0.07]" style={{ background: isDarkMode ? '#6366F1' : '#2563EB', top: '-200px', right: '-200px' }} />
          <div className="orb w-[400px] h-[400px] opacity-[0.05]" style={{ background: isDarkMode ? '#8B5CF6' : '#0891B2', bottom: '0', left: '-100px' }} />
          {isDarkMode && <div className="orb w-[500px] h-[500px] opacity-[0.04]" style={{ background: '#EC4899', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />}
        </motion.div>

        <div className="relative z-10 w-full max-w-7xl mx-auto py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left - Text content */}
            <div className="text-center lg:text-left">
              {/* Eyebrow badge */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-semibold"
                style={{
                  background: isDarkMode ? 'rgba(99,102,241,0.15)' : '#EFF6FF',
                  border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.3)' : '#BFDBFE'}`,
                  color: isDarkMode ? '#A5B4FC' : '#2563EB',
                }}
              >
                <Sparkles size={13} />
                AI-Powered GATE DS Platform
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
                style={{ color: 'var(--landing-text)' }}
              >
                Crack GATE DS
                <br />
                with{' '}
                <TypewriterText texts={['AI Precision', 'Smart Analytics', 'RAG Tutoring', 'Mock Tests']} />
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="text-lg max-w-2xl mb-10 leading-relaxed"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                The most intelligent GATE DS prep platform. Practice 10,000+ MCQs, solve doubts with
                RAG-powered AI, track weak areas with radar charts, and ace mock tests — all in one place.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-12"
              >
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="btn-neon text-base px-8 py-4 flex items-center gap-2 group hover-glow"
                >
                  Start Preparing Free
                  <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="btn-ghost text-base px-8 py-4 flex items-center gap-2">
                  Watch Demo <ChevronRight size={17} />
                </button>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg lg:max-w-none"
              >
                {STATS.map(({ label, value }) => (
                  <motion.div
                    key={label}
                    className="landing-card p-4 text-center hover-lift"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="font-display text-2xl font-bold gradient-text-glow">
                      <AnimatedCounter value={value} />
                    </div>
                    <div className="text-xs mt-1 font-medium" style={{ color: 'var(--landing-text-muted)' }}>{label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Right - 3D Interactive Scene */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="hidden lg:block"
            >
              <Interactive3DScene />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ──────────────── HERO IMAGE / DASHBOARD PREVIEW ──────────────── */}
      <section className="relative py-24 px-4" id="features" style={{ background: 'var(--landing-bg-alt)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="section-label mb-3">Your Intelligence Hub</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--landing-text)' }}>
              Everything in one dashboard
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--landing-text-muted)' }}>
              Track, analyse, and accelerate your GATE DS preparation with a single unified view
            </p>
          </motion.div>

          {/* Dashboard mock */}
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card p-6 rounded-3xl"
            style={{ boxShadow: '0 4px 32px rgba(15,32,68,0.1), 0 1px 4px rgba(0,0,0,0.06)' }}
          >
            {/* Top bar mockup */}
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-flux-border">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-3 text-xs text-flux-slate font-mono">gate.ai/app/dashboard</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Radar Chart */}
              <div className="glass-card p-5 rounded-2xl">
                <div className="text-xs font-semibold text-flux-slate mb-3">Subject Mastery</div>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={RADAR_DATA} cx="50%" cy="50%" outerRadius={72}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <Radar dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Stat cards */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Overall Accuracy', value: '78%', color: '#2563EB', trend: '+5% this week' },
                  { label: 'Questions Solved', value: '788', color: '#0891B2', trend: '+32 today' },
                  { label: 'Study Streak', value: '12 days', color: '#D97706', trend: '🔥 Keep it up' },
                  { label: 'Mock Score', value: '76/100', color: '#059669', trend: 'Top 15%' },
                  { label: 'XP Earned', value: '3,240', color: '#7C3AED', trend: 'Level 7' },
                  { label: 'Time Studied', value: '48h', color: '#DC2626', trend: 'This month' },
                ].map(({ label, value, color, trend }) => (
                  <div key={label} className="glass-card p-4 rounded-xl">
                    <div className="text-xs text-flux-slate mb-1">{label}</div>
                    <div className="font-display font-bold text-flux-dark text-xl">{value}</div>
                    <div className="text-[11px] mt-1 font-medium" style={{ color }}>{trend}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject progress */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { subject: 'Machine Learning', pct: 78, color: '#2563EB' },
                { subject: 'Mathematics', pct: 82, color: '#0891B2' },
                { subject: 'Deep Learning', pct: 61, color: '#D97706' },
                { subject: 'Statistics', pct: 74, color: '#059669' },
              ].map(({ subject, pct, color }) => (
                <div key={subject} className="glass-card p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-flux-dark">{subject}</span>
                    <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ──────────────── PROCESS (Flux "Why Choose Us") ──────────────── */}
      <section className="py-24 px-4" id="process" style={{ background: 'var(--landing-bg)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="section-label mb-3">How It Works</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold max-w-xl" style={{ color: 'var(--landing-text)' }}>
              Three steps to your dream AIR
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PROCESS.map(({ num, title, desc }, i) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                {/* Connector line */}
                {i < PROCESS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%_-_12px)] w-full h-px border-t-2 border-dashed border-flux-border z-0" />
                )}
                <div className="relative z-10">
                  <div className="process-number mb-4">{num}</div>
                  <h3 className="font-display text-xl font-bold text-flux-dark mb-3">{title}</h3>
                  <p className="text-flux-slate text-sm leading-relaxed">{desc}</p>
                  <div className="mt-5">
                    <button
                      onClick={() => { }}
                      className="text-sm font-semibold text-flux-blue flex items-center gap-1.5 hover:gap-2.5 transition-all group"
                    >
                      Learn More <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── FEATURES GRID ──────────────── */}
      <section className="py-24 px-4" style={{ background: 'var(--landing-bg-alt)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="section-label mb-3">What We Offer</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--landing-text)' }}>
              The service designed for{' '}
              <em className="not-italic gradient-text-hero">GATE DS aspirants</em>
            </h2>
            <p className="text-flux-slate max-w-xl mx-auto">
              Every feature is built specifically around the GATE DS syllabus with AI at its core
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="feature-card"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}
                >
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-flux-dark text-lg mb-2">{title}</h3>
                  <p className="text-sm text-flux-slate leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── DARK STATS BAND (Flux "facts" section) ──────────────── */}
      <section className="py-24 px-4 section-dark">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="section-label mb-4" style={{ color: '#93C5FD' }}>Our Impact</p>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                We make preparation stress-free and{' '}
                <em className="not-italic" style={{ color: '#60A5FA' }}>data-driven</em>
              </h2>
              <p className="text-slate-400 leading-relaxed mb-8">
                Every decision you make about what to study should be backed by data.
                Our analytics engine processes your performance in real time so you always
                know where to focus next.
              </p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { val: '99.7%', label: 'Student Satisfaction' },
                  { val: '4×', label: 'Faster Weak-Area Detection' },
                  { val: '34%', label: 'Average Score Lift' },
                  { val: '50K+', label: 'Students Enrolled' },
                ].map(({ val, label }) => (
                  <div key={label}>
                    <div className="font-display text-4xl font-bold text-white mb-1">
                      <AnimatedCounter value={val} />
                    </div>
                    <div className="text-slate-400 text-sm">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: Brain, title: 'Adaptive Practice', desc: 'Questions adapt to your current proficiency level.' },
                { icon: BarChart3, title: 'Live Analytics', desc: 'Accuracy trends update after every question attempt.' },
                { icon: BookOpen, title: 'Study Plans', desc: 'AI-generated personalised daily study roadmaps.' },
                { icon: FlaskConical, title: 'Realistic Mocks', desc: 'Exact GATE interface simulation with full timer.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="p-5 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: 'rgba(37,99,235,0.25)' }}>
                    <Icon size={17} style={{ color: '#93C5FD' }} />
                  </div>
                  <div className="text-white font-semibold text-sm mb-1">{title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{desc}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ──────────────── TESTIMONIALS ──────────────── */}
      <section className="py-24 px-4" id="testimonials" style={{ background: 'var(--landing-bg)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="section-label mb-3">Happy Students</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold" style={{ color: 'var(--landing-text)' }}>
              Don't take our word for it
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, institute, text, score, avatar }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-7 rounded-2xl flex flex-col gap-4"
                style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-flux-slate text-sm leading-relaxed flex-1">"{text}"</p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2 border-t border-flux-border">
                  <img src={avatar} className="w-10 h-10 rounded-full" alt="" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-flux-dark">{name}</div>
                    <div className="text-[11px] text-flux-slate">{institute}</div>
                  </div>
                  <span className="badge-green">{score}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── PRICING ──────────────── */}
      <section className="py-24 px-4" id="pricing" style={{ background: 'var(--landing-bg-alt)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="section-label mb-3">Our Pricing</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--landing-text)' }}>
              Great prices, premium preparation
            </h2>
            <p className="text-flux-slate max-w-md mx-auto">
              Every plan comes with a 7-day free trial. No credit card required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, period, featured, features, cta }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`pricing-card ${featured ? 'featured' : ''}`}
                style={featured ? { background: '#0F2044', borderColor: '#0F2044' } : {}}
              >
                <div className="mb-6">
                  <div className={`text-sm font-bold uppercase tracking-widest mb-3 ${featured ? 'text-blue-300' : 'text-flux-blue'}`}>
                    {name}
                  </div>
                  <div className="flex items-end gap-1">
                    <span className={`font-display text-4xl font-bold ${featured ? 'text-white' : 'text-flux-dark'}`}>{price}</span>
                    <span className={`text-sm mb-1 ${featured ? 'text-slate-400' : 'text-flux-slate'}`}>{period}</span>
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className={`mt-0.5 flex-shrink-0 ${featured ? 'text-blue-400' : 'text-flux-blue'}`} />
                      <span className={`text-sm ${featured ? 'text-slate-300' : 'text-flux-slate'}`}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className={featured ? 'btn-cyan w-full justify-center' : 'btn-ghost w-full justify-center'}
                >
                  {cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── CTA BAND ──────────────── */}
      <section className="py-24 px-4 section-dark">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <p className="section-label mb-4" style={{ color: '#93C5FD' }}>Join the community</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              Grow your rank by using<br />smarter preparation
            </h2>
            <p className="text-slate-400 mb-10 text-lg">
              Join 50,000+ students preparing smarter with AI. Free forever, no credit card required.
            </p>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="btn-cyan text-base px-10 py-4 flex items-center gap-2 mx-auto group"
            >
              Try It For Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ──────────────── FOOTER ──────────────── */}
      <footer className="bg-flux-dark py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10">
                  <Zap size={15} className="text-white" />
                </div>
                <span className="font-display text-lg font-bold text-white">GATE.AI</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                The most intelligent GATE DS preparation platform, powered by AI and built for serious aspirants.
              </p>
            </div>

            <div>
              <div className="text-white font-semibold text-sm mb-4">Platform</div>
              <ul className="space-y-2.5">
                {['MCQ Practice', 'Mock Tests', 'AI Tutor', 'Analytics', 'Leaderboard'].map(l => (
                  <li key={l}>
                    <a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-white font-semibold text-sm mb-4">Get in Touch</div>
              <div className="text-slate-400 text-sm space-y-2">
                <div>support@gate.ai</div>
                <div>Udaipur, Rajasthan, India</div>
              </div>
              <div className="mt-5">
                <div className="text-white font-semibold text-sm mb-3">Newsletter</div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 rounded-lg text-xs bg-white/10 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                  />
                  <button className="px-3 py-2 rounded-lg bg-flux-blue text-white text-xs font-semibold hover:bg-blue-600 transition-colors">
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">
              © 2025 GATE.AI · Built with ❤️ for GATE DS aspirants · Powered by AI
            </p>
            <div className="flex items-center gap-1.5">
              <TrendingUp size={13} className="text-blue-400" />
              <span className="text-slate-500 text-xs">v1.0.0 · GATE 2025</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
