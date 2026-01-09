import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'
import { Player } from '@lottiefiles/react-lottie-player'
import { 
  Github, 
  Zap, 
  Shield, 
  ArrowRight, 
  Star, 
  Code2,
  Users,
  Sparkles,
  Target,
  Building,
  Briefcase,
  CheckCircle2,
  Play,
  ChevronRight,
  Brain,
  Trophy,
  Globe,
  Heart,
  BarChart3,
  Cpu,
  GitBranch,
  Award,
  TrendingUp,
  FileCode2,
  Rocket,
  Eye,
  Lock,
  Search,
  ArrowUpRight,
} from 'lucide-react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
}

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
}

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
}

const floatAnimation = {
  y: [-10, 10, -10],
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
}

// Features data - Enhanced with more info
const features = [
  {
    icon: Code2,
    title: "Deep Code Analysis",
    description: "AI analyzes every commit, PR, and line of code to understand your true capabilities. We look at patterns, best practices, and real-world implementations.",
    gradient: "from-blue-500 to-cyan-500",
    stats: "2.5M+ commits analyzed",
    delay: 0
  },
  {
    icon: Brain,
    title: "AI-Powered Scoring",
    description: "Get an objective AURA score that represents your actual coding skills and impact. Our ML models are trained on millions of successful developers.",
    gradient: "from-purple-500 to-pink-500",
    stats: "95% accuracy rate",
    delay: 0.1
  },
  {
    icon: Shield,
    title: "Verified Credentials",
    description: "Blockchain-backed verification ensures your profile is tamper-proof and trustworthy. Recruiters see authentic, verified skills.",
    gradient: "from-green-500 to-emerald-500",
    stats: "100% tamper-proof",
    delay: 0.2
  },
  {
    icon: Target,
    title: "Smart Job Matching",
    description: "Get matched with roles that fit your verified skills, not just keywords on resumes. Our AI understands context and skill depth.",
    gradient: "from-orange-500 to-red-500",
    stats: "85% interview rate",
    delay: 0.3
  },
  {
    icon: BarChart3,
    title: "Growth Insights",
    description: "Track your skill progression over time with detailed analytics and personalized recommendations for improvement.",
    gradient: "from-indigo-500 to-blue-500",
    stats: "Real-time tracking",
    delay: 0.4
  },
  {
    icon: Globe,
    title: "Global Opportunities",
    description: "Connect with top companies worldwide looking for verified developer talent. Remote, hybrid, or on-site - you choose.",
    gradient: "from-teal-500 to-cyan-500",
    stats: "500+ companies",
    delay: 0.5
  }
]

// How it works steps - Enhanced
const steps = [
  {
    number: "01",
    title: "Connect GitHub",
    description: "Link your GitHub account with one click. We securely analyze your public contributions and repositories. Your private data stays private.",
    icon: Github,
    color: "from-gray-700 to-gray-900"
  },
  {
    number: "02", 
    title: "AI Analysis",
    description: "Our AI examines code quality, commit patterns, collaboration style, and technical depth across all your projects.",
    icon: Cpu,
    color: "from-purple-600 to-pink-600"
  },
  {
    number: "03",
    title: "Get Your AURA",
    description: "Receive your verified AURA score with detailed breakdown of your coding prowess. Skills verified with evidence.",
    icon: Award,
    color: "from-amber-500 to-orange-500"
  },
  {
    number: "04",
    title: "Land Dream Jobs",
    description: "Get matched with companies that value your verified skills. No more resume guessing games.",
    icon: Briefcase,
    color: "from-green-500 to-emerald-500"
  }
]

// Stats - Enhanced
const stats = [
  { value: "50K+", label: "Developers Verified", icon: Users, color: "text-blue-500" },
  { value: "2.5M+", label: "Commits Analyzed", icon: GitBranch, color: "text-purple-500" },
  { value: "500+", label: "Partner Companies", icon: Building, color: "text-orange-500" },
  { value: "95%", label: "Placement Rate", icon: TrendingUp, color: "text-green-500" }
]

// Testimonials - Enhanced
const testimonials = [
  {
    name: "Sarah Chen",
    role: "Senior Engineer at Stripe",
    avatar: "SC",
    content: "My AURA profile landed me interviews at 5 top companies. The AI analysis showed skills I didn't even know I had!",
    rating: 5,
    aura: 847,
    gradient: "from-purple-500 to-pink-500"
  },
  {
    name: "Marcus Johnson",
    role: "Full Stack at Airbnb",
    avatar: "MJ",
    content: "From unknown developer to getting recruited by top startups. VerifyDev changed my entire career trajectory.",
    rating: 5,
    aura: 792,
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    name: "Priya Sharma",
    role: "Tech Lead at Google",
    avatar: "PS",
    content: "The verified profile gave recruiters confidence in my abilities. Got a 40% higher offer than expected.",
    rating: 5,
    aura: 923,
    gradient: "from-green-500 to-emerald-500"
  }
]

// Trusted companies - with logos mockup
const trustedCompanies = [
  { name: "Google", icon: Search },
  { name: "Microsoft", icon: Building },
  { name: "Amazon", icon: Rocket },
  { name: "Meta", icon: Globe },
  { name: "Apple", icon: Code2 },
  { name: "Netflix", icon: Play },
  { name: "Stripe", icon: Lock },
  { name: "Airbnb", icon: Heart }
]

// Key benefits
const benefits = [
  { icon: CheckCircle2, text: "100% Free for developers", subtext: "No hidden fees, ever" },
  { icon: CheckCircle2, text: "Takes less than 2 minutes", subtext: "Quick and easy setup" },
  { icon: CheckCircle2, text: "Privacy-first approach", subtext: "Your data, your control" },
  { icon: CheckCircle2, text: "No spam, ever", subtext: "Only relevant opportunities" }
]

// For developers vs recruiters comparison
const comparisons = {
  developers: [
    { icon: FileCode2, title: "Prove Real Skills", desc: "Stop self-claiming, start proving" },
    { icon: Trophy, title: "Stand Out", desc: "Rise above generic resumes" },
    { icon: Rocket, title: "Career Growth", desc: "Track and improve your skills" },
  ],
  recruiters: [
    { icon: Eye, title: "See Real Abilities", desc: "Beyond keywords and buzzwords" },
    { icon: Target, title: "Perfect Matches", desc: "Find exactly who you need" },
    { icon: BarChart3, title: "Data-Driven", desc: "Hire with confidence" },
  ]
}

// Floating particles component - Theme Aware
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Glowing orbs - uses primary color for theme awareness */}
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-sm ${
            i % 4 === 0 ? 'bg-primary/40' : 
            i % 4 === 1 ? 'bg-primary/30' : 
            i % 4 === 2 ? 'bg-primary/25' : 'bg-primary/20'
          }`}
          style={{
            width: Math.random() * 6 + 3,
            height: Math.random() * 6 + 3,
          }}
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
          }}
          animate={{
            y: [null, Math.random() * -400 - 100],
            x: [null, `${(Math.random() - 0.5) * 100}px`],
            opacity: [0, 0.9, 0],
            scale: [0.3, 1.2, 0.3],
          }}
          transition={{
            duration: Math.random() * 6 + 4,
            repeat: Infinity,
            repeatType: "loop",
            delay: Math.random() * 4,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* Sparkle stars */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={`star-${i}`}
          className="absolute w-1 h-1 bg-foreground/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: Math.random() * 2 + 1,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  )
}

// Aurora background component - Enhanced with more layers
function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div 
        className="aurora-layer aurora-1"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="aurora-layer aurora-2"
        animate={{ 
          scale: [1, 1.15, 1],
          rotate: [0, -5, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="aurora-layer aurora-3"
        animate={{ 
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Extra glow layer - uses CSS variable for theme awareness */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.1),transparent_50%)]" />
    </div>
  )
}

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  return (
    <span className="stat-number">{value}{suffix}</span>
  )
}


export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  })
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [activeTab, setActiveTab] = useState<'developers' | 'recruiters'>('developers')

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/40 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">VerifyDev</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-all relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-all relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all">How It Works</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-all relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-primary after:transition-all">Testimonials</a>
              <Link to="/recruiter" className="text-sm text-muted-foreground hover:text-foreground transition-colors">For Recruiters</Link>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button className="rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90">
                    Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/get-started" className="hidden sm:block">
                    <Button variant="ghost" className="rounded-xl">Sign In</Button>
                  </Link>
                  <Link to="/get-started">
                    <Button className="rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 btn-shine">
                      <Github className="mr-2 h-4 w-4" />
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Ultra Premium */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <AuroraBackground />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
          
          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />
          
          <FloatingParticles />
        </div>

        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 container mx-auto px-4 py-20"
        >
          {/* Horizontal Layout: Text Left, Visual Right */}
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Text Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              {/* Announcement Badge */}
              <motion.div variants={fadeInUp} className="mb-8">
                <Badge variant="outline" className="px-6 py-2.5 text-sm font-medium border-primary/50 bg-primary/5 backdrop-blur-sm hover:bg-primary/10 transition-colors cursor-pointer group">
                  <Sparkles className="w-4 h-4 mr-2 text-primary animate-pulse" />
                  <span>Introducing AI-Powered Skill Verification</span>
                  <ArrowUpRight className="w-3 h-3 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Badge>
              </motion.div>

              {/* Main Heading - ULTRA Premium Typography */}
              <motion.h1 
                variants={fadeInUp}
                className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-[1.1] tracking-tight"
              >
                <motion.span 
                  className="block bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  Stop Claiming.
                </motion.span>
                <motion.span 
                  className="block mt-2 relative"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                    Start Proving.
                  </span>
                  {/* Glow effect behind text - theme aware */}
                  <span className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10 blur-2xl -z-10" />
                </motion.span>
              </motion.h1>

              {/* Subheading */}
              <motion.p 
                variants={fadeInUp}
                className="text-xl md:text-2xl text-muted-foreground max-w-xl lg:max-w-none mb-12 leading-relaxed"
              >
                AI-powered code analysis that creates a <span className="text-foreground font-medium">verified profile</span> of your actual abilities.
                <br className="hidden md:block" />
                <span className="text-primary font-medium">Your code tells your story.</span> Let it speak for you.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start items-center mb-16"
              >
                {isAuthenticated ? (
                  <Link to="/dashboard">
                    <Button size="lg" className="group px-10 py-7 text-lg rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all shadow-2xl shadow-primary/25 btn-shine">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/get-started">
                      <Button size="lg" className="group px-10 py-7 text-lg rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 hover:scale-105 transition-all shadow-2xl shadow-primary/25 hover:shadow-primary/40 btn-shine breathe-glow">
                        <Github className="mr-2 h-5 w-5" />
                        Get Verified — It's Free
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <Link to="/get-started">
                      <Button size="lg" variant="outline" className="px-10 py-7 text-lg rounded-2xl border-2 hover:bg-primary/5 hover:scale-105 hover:border-primary/50 transition-all">
                        <Building className="mr-2 h-5 w-5" />
                        I'm Hiring Developers
                      </Button>
                    </Link>
                  </>
                )}
              </motion.div>

              {/* Trust Indicators */}
              <motion.div variants={fadeInUp} className="flex flex-wrap justify-center lg:justify-start gap-6 mb-8 lg:mb-0">
                {[
                  { icon: CheckCircle2, text: "Free forever" },
                  { icon: Zap, text: "2 min setup" },
                  { icon: Shield, text: "Privacy first" },
                  { icon: Lock, text: "Enterprise secure" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className="w-4 h-4 text-green-500" />
                    <span>{item.text}</span>
                  </div>
                ))}
              </motion.div>

            </motion.div>

            {/* Right: Visual Content */}
            <motion.div 
              variants={scaleIn}
              className="relative"
            >
                {/* Floating Cards */}
                <motion.div 
                  className="absolute -top-8 -left-4 md:left-8 p-4 rounded-xl bg-card/90 backdrop-blur-xl border shadow-xl z-20"
                  animate={{ y: [-5, 5, -5], rotate: [-2, 2, -2] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Code Quality</p>
                      <p className="text-lg font-bold text-green-500">Excellent</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute -top-4 -right-4 md:right-8 p-4 rounded-xl bg-card/90 backdrop-blur-xl border shadow-xl z-20"
                  animate={{ y: [5, -5, 5], rotate: [2, -2, 2] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">AURA Score</p>
                      <p className="text-lg font-bold text-primary">847</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  className="absolute -bottom-4 left-1/4 p-4 rounded-xl bg-card/90 backdrop-blur-xl border shadow-xl z-20"
                  animate={{ y: [-3, 3, -3], rotate: [-1, 1, -1] }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <GitBranch className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commits Analyzed</p>
                      <p className="text-lg font-bold text-blue-500">2,847</p>
                    </div>
                  </div>
                </motion.div>

                {/* Main Lottie Animation */}
                <motion.div 
                  animate={floatAnimation}
                  className="relative z-10"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/15 to-primary/10 rounded-[40px] blur-3xl" />
                  <div className="relative bg-card/30 backdrop-blur-sm rounded-3xl border border-border/30 p-8 overflow-hidden">
                    <Player
                      autoplay
                      loop
                      src="https://assets5.lottiefiles.com/packages/lf20_w51pcehl.json"
                      style={{ height: '400px', width: '100%' }}
                    />
                  </div>
                </motion.div>
              </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-sm">Scroll to explore</span>
            <ChevronRight className="w-5 h-5 rotate-90" />
          </div>
        </motion.div>
      </section>

      {/* Stats Section - Enhanced */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.1]" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat) => (
              <motion.div 
                key={stat.label}
                variants={scaleIn}
                className="group"
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -8 }}
                  className="relative p-10 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/40 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <stat.icon className={`w-10 h-10 ${stat.color} mb-4 group-hover:scale-110 transition-transform`} />
                    <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                      <AnimatedCounter value={stat.value} />
                    </div>
                    <p className="text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* For Developers & Recruiters Section */}
      <section className="py-32 relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.05),transparent_50%)]" />
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Built for
              </span>{" "}
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Everyone
              </span>
            </motion.h2>
          </motion.div>

          {/* Tab Switcher */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex p-1.5 bg-card/50 backdrop-blur-xl rounded-xl border border-border/80">
              {(['developers', 'recruiters'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'developers' ? '👨‍💻 For Developers' : '👔 For Recruiters'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            >
              {comparisons[activeTab].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <Card className="h-full bg-card/50 backdrop-blur-xl border-border/50 hover:border-primary/30 transition-all rounded-3xl overflow-hidden">
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <item.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section id="features" className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.05]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30">
                <Zap className="w-3 h-3 mr-2 text-primary" />
                Powerful Features
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Skills That Speak
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                For Themselves
              </span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We don't just scan your resume. We understand your code at a fundamental level.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={scaleIn}
                whileHover={{ y: -12, scale: 1.02 }}
                className="group relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-25 transition-opacity duration-500`} />
                <Card className="relative h-full bg-card/40 backdrop-blur-2xl border-border/40 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all rounded-3xl overflow-hidden">
                  <CardContent className="p-8">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg`}>
                      <feature.icon className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{feature.title}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-4">{feature.description}</p>
                    <div className="text-xs text-primary font-medium">{feature.stats}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section - Enhanced */}
      <section id="how-it-works" className="py-32 relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:24px_24px] opacity-50" />
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30">
                <Play className="w-3 h-3 mr-2 text-primary" />
                Simple Process
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Four Steps to
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Your Dream Job
              </span>
            </motion.h2>
          </motion.div>

          {/* Steps - Timeline Style */}
          <div className="max-w-5xl mx-auto relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-purple-500 to-green-500" />
            
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={index % 2 === 0 ? fadeInLeft : fadeInRight}
                className={`flex flex-col md:flex-row items-center gap-8 mb-20 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${step.color} rounded-3xl blur-2xl opacity-10`} />
                    <div className="relative bg-card/50 backdrop-blur-xl rounded-2xl border border-border/80 p-8 hover:border-primary/30 transition-all">
                      <div className="inline-flex items-center gap-4 mb-4">
                        <span className={`text-5xl font-black bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}>
                          {step.number}
                        </span>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${step.color} flex items-center justify-center`}>
                          <step.icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-4">{step.title}</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </motion.div>
                </div>

                {/* Center Dot */}
                <div className="hidden md:flex w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-500 items-center justify-center z-10 shadow-lg shadow-primary/30">
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>

                {/* Spacer */}
                <div className="flex-1 hidden md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section - Enhanced */}
      <section id="testimonials" className="py-32 relative overflow-hidden bg-gradient-to-t from-background via-primary/5 to-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:6rem_4rem]" />
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30">
                <Heart className="w-3 h-3 mr-2 text-red-500" />
                Developer Stories
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Loved by
              </span>
              {" "}
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Developers
              </span>
            </motion.h2>
          </motion.div>

          {/* Testimonial Cards - Enhanced Carousel */}
          <div className="max-w-4xl mx-auto relative h-[350px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -100, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <Card className="h-full bg-card/50 backdrop-blur-xl border-border/50 rounded-3xl overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${testimonials[activeTestimonial].gradient} opacity-5`} />
                  <CardContent className="p-8 md:p-12 h-full flex flex-col justify-center relative">
                    <div className="flex items-center gap-4 mb-8">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${testimonials[activeTestimonial].gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                        {testimonials[activeTestimonial].avatar}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{testimonials[activeTestimonial].name}</h4>
                        <p className="text-muted-foreground">{testimonials[activeTestimonial].role}</p>
                      </div>
                      <div className="ml-auto">
                        <Badge className="bg-primary/10 text-primary border-0 px-4 py-2">
                          <Trophy className="w-4 h-4 mr-2" />
                          AURA {testimonials[activeTestimonial].aura}
                        </Badge>
                      </div>
                    </div>
                    <blockquote className="text-2xl md:text-3xl leading-relaxed mb-8 font-medium">
                      "{testimonials[activeTestimonial].content}"
                    </blockquote>
                    <div className="flex gap-1">
                      {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                        <Star key={i} className="w-6 h-6 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Testimonial indicators */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`h-3 rounded-full transition-all duration-300 ${
                    index === activeTestimonial 
                      ? 'bg-primary w-10' 
                      : 'bg-border w-3 hover:bg-primary/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section - Enhanced */}
      <section className="py-20 relative overflow-hidden border-y border-border/30 bg-card/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.p variants={fadeInUp} className="text-sm text-muted-foreground mb-12 uppercase tracking-wider font-medium">
              Trusted by developers from world's leading companies
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
              {trustedCompanies.map((company) => (
                <motion.div
                  key={company.name}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="flex items-center gap-2 text-2xl font-bold text-muted-foreground/40 hover:text-foreground transition-all cursor-pointer"
                >
                  <company.icon className="w-6 h-6" />
                  <span>{company.name}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Why Different Section - Enhanced */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInLeft}
            >
              <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30">
                <Award className="w-3 h-3 mr-2 text-primary" />
                Why We're Different
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Built by developers,{" "}
                <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  for developers
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We understand the frustration of being judged by resumes that don't reflect your true abilities. 
                That's why we created a system that lets your actual code do the talking.
              </p>
              <div className="space-y-5">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <benefit.icon className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <span className="font-semibold text-lg">{benefit.text}</span>
                      <p className="text-sm text-muted-foreground">{benefit.subtext}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInRight}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-[40px] blur-3xl" />
              <div className="relative bg-card/50 backdrop-blur-xl rounded-[40px] border border-border/50 p-8 overflow-hidden">
                <Player
                  autoplay
                  loop
                  src="https://assets9.lottiefiles.com/packages/lf20_iorpbol0.json"
                  style={{ height: '400px', width: '100%' }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section - Ultra Premium */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-purple-500/5 to-primary/10" />
        <AuroraBackground />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div variants={scaleIn} className="mb-8">
              <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center shadow-2xl shadow-primary/30 mb-8">
                <Rocket className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-bold mb-6">
              Your Code Has a Story.{" "}
              <br />
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Let the World Hear It.
              </span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              50,000+ developers have already discovered their true potential.
              It's your turn to shine.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/get-started">
                <Button size="lg" className="px-12 py-8 text-lg rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all shadow-2xl shadow-primary/25 btn-shine breathe-glow">
                  <Github className="mr-2 h-6 w-6" />
                  Get Verified Now — It's Free
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </motion.div>
            <motion.p variants={fadeInUp} className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-4">
              <span className="flex items-center gap-1"><Zap className="w-4 h-4 text-primary" /> 2 min setup</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className="flex items-center gap-1"><Lock className="w-4 h-4 text-green-500" /> No credit card</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-blue-500" /> Privacy first</span>
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="py-20 border-t border-border/50 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">VerifyDev</span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Revolutionizing how developers prove their skills and find their dream jobs. Your code tells your story.
              </p>
              <div className="flex gap-4">
                <a href="https://github.com" className="w-10 h-10 rounded-xl bg-card border border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all">
                  <Github className="w-5 h-5" />
                </a>
                <a href="https://twitter.com" className="w-10 h-10 rounded-xl bg-card border border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all">
                  <Globe className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link to="/api" className="hover:text-primary transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
                <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms</Link></li>
                <li><Link to="/security" className="hover:text-primary transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © 2026 VerifyDev. All rights reserved. Built with ❤️ for developers.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
