import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth-store'
import { Player } from '@lottiefiles/react-lottie-player'
import { 
  Github, 
  ArrowRight, 
  Code2,
  Users,
  Sparkles,
  Building,
  CheckCircle2,

  Brain,
  Trophy,
  GitBranch,
  TrendingUp,
  Rocket,
  Zap,
  Shield,
  Target,
  BarChart3,
  Cpu,
  Award,
  Globe,
  Star,
  Play,
} from 'lucide-react'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

// ========================================
// DATA
// ========================================
const stats = [
  { icon: Users, value: "50,000+", label: "Developers Verified" },
  { icon: GitBranch, value: "1.2M+", label: "Commits Analyzed" },
  { icon: Building, value: "500+", label: "Partner Companies" },
  { icon: TrendingUp, value: "95%", label: "Placement Rate" },
]

const howItWorks = [
  {
    step: "01",
    title: "Connect GitHub",
    description: "One-click OAuth to securely link your GitHub profile.",
    icon: Github,
    lottie: "/animations/github-connect.json",
  },
  {
    step: "02", 
    title: "AI Analysis",
    description: "Advanced AI examines your code quality, patterns & style.",
    icon: Cpu,
    lottie: "/animations/code-analysis.json",
  },
  {
    step: "03",
    title: "Get AURA Score",
    description: "Receive a verified profile showcasing your true abilities.",
    icon: Award,
    lottie: "/animations/aura-score.json",
  },
  {
    step: "04",
    title: "Land Dream Jobs",
    description: "Get matched with companies that value verified skills.",
    icon: Rocket,
    lottie: "/animations/rocket-launch.json",
  },
]

const features = [
  { icon: Code2, title: "Deep Code Analysis", description: "AI analyzes every commit and PR to understand your expertise" },
  { icon: Brain, title: "AI-Powered Scoring", description: "Get an objective AURA score that represents your true skills" },
  { icon: Shield, title: "Verified Credentials", description: "Blockchain-backed verification for tamper-proof profiles" },
  { icon: Target, title: "Smart Job Matching", description: "Get matched with roles that fit your verified skills" },
  { icon: BarChart3, title: "Growth Analytics", description: "Track your skill progression with detailed insights" },
  { icon: Globe, title: "Global Reach", description: "Connect with top companies worldwide seeking developers" },
]

const testimonials = [
  { name: "Sarah Chen", role: "Senior Engineer", company: "Stripe", avatar: "SC", content: "My AURA profile landed me interviews at 5 top companies!", aura: 847 },
  { name: "Marcus Johnson", role: "Full Stack Dev", company: "Airbnb", avatar: "MJ", content: "From unknown developer to getting recruited by top startups.", aura: 792 },
  { name: "Priya Sharma", role: "Tech Lead", company: "Google", avatar: "PS", content: "Got a 40% higher offer than expected with my verified profile.", aura: 923 },
]

const trustedCompanies = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Stripe", "Airbnb"]

// USP - What makes us different
const usps = [
  {
    icon: Brain,
    title: "Your Code Tells Your Story",
    description: "We don't just count commits. Our AI reads your code like a senior developer would — understanding architecture decisions, problem-solving patterns, and collaboration style.",
    highlight: "847 dimensions analyzed",
    lottie: "/animations/code-analysis.json",
  },
  {
    icon: Shield,
    title: "Beyond The Resume",
    description: "Resumes lie. Code doesn't. Every skill on your profile is verified by analyzing your actual work — not self-reported claims.",
    highlight: "100% verified skills",
    lottie: "/animations/aura-score.json",
  },
  {
    icon: Target,
    title: "Get Discovered, Not Ignored",
    description: "Top companies actively search our platform for verified developers. Your profile works for you 24/7, matching you with opportunities that fit your actual skills.",
    highlight: "3x more interviews",
    lottie: "/animations/rocket-launch.json",
  },
]

// ========================================
// PARTICLE BACKGROUND
// ========================================
function ParticleBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -50, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0, 0.6, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// ========================================
// FLOATING ORBS
// ========================================
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-20 left-[10%] w-72 h-72 rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)' }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-40 right-[5%] w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)' }}
        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-50"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.05) 0%, transparent 50%)' }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  )
}

// ========================================
// ANIMATED COUNTER
// ========================================
function AnimatedCounter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [displayValue, setDisplayValue] = useState("0")
  
  useEffect(() => {
    if (isInView) {
      const numericValue = parseInt(value.replace(/[^0-9]/g, ''))
      const duration = 2000
      const steps = 60
      const increment = numericValue / steps
      let current = 0
      
      const timer = setInterval(() => {
        current += increment
        if (current >= numericValue) {
          setDisplayValue(value)
          clearInterval(timer)
        } else {
          if (numericValue >= 1000000) setDisplayValue((current / 1000000).toFixed(1) + "M")
          else if (numericValue >= 1000) setDisplayValue(Math.floor(current / 1000) + "K")
          else setDisplayValue(Math.floor(current).toString())
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [isInView, value])
  
  return <span ref={ref}>{displayValue}</span>
}

// ========================================
// HERO 3D VISUALIZATION - CLEAN PREMIUM
// ========================================
function HeroVisualization() {
  const skills = [
    { name: 'React', icon: '⚛️' },
    { name: 'TypeScript', icon: '🔷' },
    { name: 'Node.js', icon: '🟢' },
    { name: 'Python', icon: '🐍' },
    { name: 'Go', icon: '🔵' },
    { name: 'Docker', icon: '🐳' },
  ]
  const [activeSkill, setActiveSkill] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => setActiveSkill(prev => (prev + 1) % skills.length), 2500)
    return () => clearInterval(interval)
  }, [skills.length])

  return (
    <div className="relative w-full h-full min-h-[520px]">
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />

      {/* Skill Pills */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 max-w-[380px]">
        {skills.map((skill, i) => (
          <motion.div
            key={skill.name}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-500 ${i === activeSkill ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/[0.02] border-white/[0.06] text-white/40'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <span className="mr-1">{skill.icon}</span>{skill.name}
          </motion.div>
        ))}
      </div>

      {/* Main Profile Card */}
      <motion.div className="absolute top-20 left-1/2 -translate-x-1/2 w-[280px]" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="p-5 rounded-2xl bg-black border border-white/[0.06] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Code2 className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-white">Developer Profile</span>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">✓ Verified</Badge>
          </div>
          <div className="text-center py-3 border-y border-white/[0.04]">
            <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">AURA SCORE</p>
            <motion.p className="text-3xl font-bold text-primary" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}>847</motion.p>
            <p className="text-[9px] text-emerald-400">Top 5% of developers</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[{ l: 'Commits', v: '1.2K' }, { l: 'Projects', v: '24' }, { l: 'Languages', v: '8' }].map((s, i) => (
              <motion.div key={s.l} className="text-center p-1.5 rounded-lg bg-white/[0.02]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.1 }}>
                <p className="text-sm font-semibold text-white">{s.v}</p>
                <p className="text-[8px] text-white/30">{s.l}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Job Match Card */}
      <motion.div className="absolute left-0 top-[42%] w-[200px]" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
        <div className="p-3.5 rounded-xl bg-black border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-500" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="text-[10px] font-medium text-emerald-400">New Job Match</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">G</div>
            <div>
              <p className="text-xs font-medium text-white">Senior Engineer</p>
              <p className="text-[9px] text-white/30">Google • Remote</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ delay: 1, duration: 0.8 }} />
            </div>
            <span className="text-[9px] font-semibold text-emerald-400">92%</span>
          </div>
        </div>
      </motion.div>

      {/* AI Analysis Card */}
      <motion.div className="absolute right-0 top-[38%] w-[210px]" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }}>
        <div className="p-3.5 rounded-xl bg-black border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-medium text-primary">AI Analysis</span>
          </div>
          <div className="bg-black/50 rounded-lg p-2 font-mono text-[9px] mb-2.5 border border-white/[0.03]">
            <span className="text-primary">const</span> <span className="text-cyan-400">analyze</span> <span className="text-white/40">= async () =&gt; ...</span>
          </div>
          {[{ l: 'Code Quality', v: 94 }, { l: 'Architecture', v: 88 }].map((item, i) => (
            <div key={item.l} className="mb-1.5">
              <div className="flex justify-between text-[9px] mb-0.5"><span className="text-white/30">{item.l}</span><span className="text-white">{item.v}%</span></div>
              <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${item.v}%` }} transition={{ delay: 1.2 + i * 0.15 }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recruiter Interest */}
      <motion.div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[240px]" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
        <div className="p-2.5 rounded-xl bg-black border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs">🔔</span>
            <span className="text-[10px] font-medium text-amber-300">3 Recruiters Interested</span>
          </div>
          <div className="flex -space-x-1">
            {['M', 'A', 'S'].map((l, i) => (
              <motion.div key={l} className="w-5 h-5 rounded-full bg-primary border-2 border-black flex items-center justify-center text-[8px] font-bold text-primary-foreground" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.3 + i * 0.07 }}>{l}</motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ========================================
// HERO SECTION
// ========================================
function HeroSection() {
  const { isAuthenticated } = useAuthStore()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 80])

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden bg-background">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_50%)]" />
      <FloatingOrbs />
      <ParticleBackground />
      

      <motion.div style={{ opacity, y }} className="relative z-10 container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="text-center lg:text-left">
            <Badge className="mb-5 px-4 py-2 bg-primary/10 border-primary/20 text-primary">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              #1 Developer Verification + Job Platform
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
              Prove Your Skills.
              <br />
              <span className="text-primary">Land Dream Jobs.</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              Connect your GitHub. Get AI-verified skills. <span className="text-foreground font-medium">Get discovered by top companies</span> looking for proven talent.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="lg" className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                    Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button size="lg" className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                      <Github className="mr-2 h-4 w-4" /> Start Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/recruiter/login">
                    <Button size="lg" variant="outline" className="h-12 px-6 rounded-xl border-border hover:bg-accent">
                      <Building className="mr-2 h-4 w-4" /> Hire Developers
                    </Button>
                  </Link>
                </>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-muted-foreground">
              {[{ i: CheckCircle2, t: "Free forever" }, { i: Zap, t: "2 min setup" }, { i: Users, t: "50K+ devs" }].map((x, i) => (
                <span key={i} className="flex items-center gap-1.5"><x.i className="w-4 h-4 text-primary" />{x.t}</span>
              ))}
            </div>
          </motion.div>
          
          {/* Right */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="hidden lg:block">
            <HeroVisualization />
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

// ========================================
// STATS SECTION
// ========================================
function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })

  return (
    <section ref={ref} className="py-20 border-y border-border/50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                <s.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1"><AnimatedCounter value={s.value} /></div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ========================================
// HOW IT WORKS SECTION
// ========================================
function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section ref={ref} className="py-24">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20"><Play className="w-3.5 h-3.5 mr-1.5" />How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Four Steps to Your <span className="text-primary">Dream Career</span></h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From connecting GitHub to landing interviews — we make the journey seamless.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.map((item, i) => (
            <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1 }} className="relative p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="absolute -top-3 -left-3 w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">{item.step}</div>
              <div className="w-20 h-20 mx-auto mb-4">
                <Player autoplay loop src={item.lottie} style={{ height: '100%', width: '100%' }} />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <item.icon className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">{item.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground text-center">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ========================================
// FEATURES SECTION
// ========================================
function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section ref={ref} className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20"><Zap className="w-3.5 h-3.5 mr-1.5" />Features</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to <span className="text-primary">Stand Out</span></h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.08 }} className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ========================================
// TESTIMONIALS SECTION
// ========================================
function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setActiveIndex(prev => (prev + 1) % testimonials.length), 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section ref={ref} className="py-24">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20"><Star className="w-3.5 h-3.5 mr-1.5" />Testimonials</Badge>
          <h2 className="text-3xl md:text-4xl font-bold">Trusted by <span className="text-primary">Top Developers</span></h2>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="relative h-[200px]">
            <AnimatePresence mode="wait">
              {testimonials.map((t, i) => i === activeIndex && (
                <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                  <div className="h-full p-8 rounded-2xl bg-card border border-border">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">{t.avatar}</div>
                      <div>
                        <h4 className="font-semibold text-foreground">{t.name}</h4>
                        <p className="text-sm text-muted-foreground">{t.role} at {t.company}</p>
                        <Badge className="mt-1 bg-primary/10 text-primary border-0 text-xs"><Trophy className="w-3 h-3 mr-1" />AURA {t.aura}</Badge>
                      </div>
                    </div>
                    <blockquote className="text-lg text-foreground/90 italic">"{t.content}"</blockquote>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveIndex(i)} className={`h-2 rounded-full transition-all ${i === activeIndex ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ========================================
// TRUSTED BY SECTION
// ========================================
function TrustedBySection() {
  return (
    <section className="py-12 border-y border-border/50">
      <div className="container mx-auto px-6">
        <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-6">Developers from these companies trust VerifyDev</p>
        <div className="flex flex-wrap justify-center gap-8">
          {trustedCompanies.map(c => (
            <span key={c} className="text-xl font-bold text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors">{c}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ========================================
// CTA SECTION
// ========================================
function CTASection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.3 })
  const { isAuthenticated } = useAuthStore()

  return (
    <section ref={ref} className="py-24">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6">
            <Player autoplay loop src="/animations/rocket-launch.json" style={{ height: '100%', width: '100%' }} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to <span className="text-primary">Prove Your Worth?</span></h2>
          <p className="text-lg text-muted-foreground mb-8">Join 50,000+ developers who've transformed their careers with verified skills.</p>
          {!isAuthenticated && (
            <Link to="/login">
              <Button size="lg" className="h-14 px-10 text-lg rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                <Github className="mr-2 h-5 w-5" /> Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  )
}

// ========================================
// FOOTER
// ========================================
function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Code2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">VerifyDev</span>
        </div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          {['Privacy', 'Terms', 'About', 'Contact'].map(l => <a key={l} href="#" className="hover:text-foreground transition-colors">{l}</a>)}
        </div>
        <p className="text-sm text-muted-foreground">© 2024 VerifyDev. Prove your worth.</p>
      </div>
    </footer>
  )
}

// ========================================
// USP SECTION - WHY WE'RE DIFFERENT
// ========================================
function USPSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
      
      <div className="container mx-auto px-6 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={isInView ? { opacity: 1, y: 0 } : {}} 
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Why VerifyDev?
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built Different. <span className="text-primary">Built Better.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We're not just another job board. We're the first platform that truly understands developers.
          </p>
        </motion.div>

        <div className="space-y-20">
          {usps.map((usp, i) => (
            <motion.div 
              key={usp.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15 }}
              className={`grid lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'lg:grid-flow-dense' : ''}`}
            >
              {/* Content */}
              <div className={`${i % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <usp.icon className="w-4 h-4" />
                  {usp.highlight}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">{usp.title}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">{usp.description}</p>
                
                {/* Visual Stats */}
                <div className="flex gap-8">
                  {i === 0 && (
                    <>
                      <div>
                        <p className="text-3xl font-bold text-primary">847</p>
                        <p className="text-sm text-muted-foreground">Signal Dimensions</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-primary">24</p>
                        <p className="text-sm text-muted-foreground">Languages Analyzed</p>
                      </div>
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <div>
                        <p className="text-3xl font-bold text-primary">100%</p>
                        <p className="text-sm text-muted-foreground">Verified Skills</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-primary">0</p>
                        <p className="text-sm text-muted-foreground">False Claims</p>
                      </div>
                    </>
                  )}
                  {i === 2 && (
                    <>
                      <div>
                        <p className="text-3xl font-bold text-primary">3x</p>
                        <p className="text-sm text-muted-foreground">More Interviews</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-primary">500+</p>
                        <p className="text-sm text-muted-foreground">Partner Companies</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Lottie Animation */}
              <div className={`${i % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                <motion.div 
                  className="relative w-full aspect-square max-w-md mx-auto"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-xl" />
                  <div className="relative bg-black/40 backdrop-blur-sm rounded-3xl p-8 border border-white/[0.08]">
                    <Player 
                      autoplay 
                      loop 
                      src={usp.lottie} 
                      style={{ height: '100%', width: '100%' }}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ========================================
// MAIN
// ========================================
export default function LandingPageNew() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <StatsSection />
      <USPSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TestimonialsSection />
      <TrustedBySection />
      <CTASection />
      <Footer />
    </div>
  )
}

