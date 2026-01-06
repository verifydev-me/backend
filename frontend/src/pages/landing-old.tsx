import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth-store'
import { 
  Github, 
  Zap, 
  Shield, 
  BarChart3, 
  ArrowRight, 
  Star, 
  Code2,
  Users,
  Sparkles,
  Target,
  Building,
  Briefcase,
} from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    icon: Github,
    title: 'GitHub Integration',
    description:
      'Connect your GitHub account and automatically import your repositories for analysis.',
  },
  {
    icon: BarChart3,
    title: 'Deep Code Analysis',
    description:
      'AI-powered analysis of code quality, patterns, architecture, and best practices.',
  },
  {
    icon: Zap,
    title: 'Aura Score',
    description:
      'Get a comprehensive developer reputation score based on verified contributions.',
  },
  {
    icon: Shield,
    title: 'Verified Profile',
    description:
      'Share your verified developer profile with recruiters and companies worldwide.',
  },
]

const stats = [
  { value: '10K+', label: 'Developers', icon: Users },
  { value: '50K+', label: 'Projects Analyzed', icon: Code2 },
  { value: '500+', label: 'Companies Hiring', icon: Building },
  { value: '95%', label: 'Match Rate', icon: Target },
]

const howItWorks = [
  {
    step: 1,
    title: 'Connect GitHub',
    description: 'Sign in with your GitHub account to import your repositories',
    icon: Github,
  },
  {
    step: 2,
    title: 'Get Analyzed',
    description: 'Our AI analyzes your code quality, patterns, and contributions',
    icon: BarChart3,
  },
  {
    step: 3,
    title: 'Build Aura',
    description: 'Earn your Aura score based on verified skills and code quality',
    icon: Sparkles,
  },
  {
    step: 4,
    title: 'Get Hired',
    description: 'Connect with companies that value verified developer skills',
    icon: Briefcase,
  },
]

const testimonials = [
  {
    quote: "DevVerify helped me land my dream job at a top tech company. The verified profile made all the difference!",
    author: "Sarah Chen",
    role: "Senior Engineer @ Google",
    avatar: "SC",
    aura: 520,
  },
  {
    quote: "Finally, a platform that lets my code speak for itself. Recruiters actually trust my profile now.",
    author: "Alex Kumar",
    role: "Full Stack Developer",
    avatar: "AK",
    aura: 385,
  },
  {
    quote: "The Aura score is a game-changer. It accurately reflects my skills better than any resume could.",
    author: "Maria Rodriguez",
    role: "Backend Engineer @ Stripe",
    avatar: "MR",
    aura: 445,
  },
]

export default function Landing() {
  const { isAuthenticated, login } = useAuthStore()

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">DevVerify</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Testimonials
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              to="/recruiter/login" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              For Recruiters
            </Link>
            {isAuthenticated ? (
              <Button asChild>
                <Link to="/dashboard">
                  Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button onClick={login}>
                <Github className="mr-2 h-4 w-4" />
                Sign in with GitHub
              </Button>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-30" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px]" />

        <div className="container relative mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge variant="outline" className="mb-6 px-4 py-1.5 gap-2 border-primary/30 bg-primary/5">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <span>Trusted by 10,000+ developers worldwide</span>
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              Prove Your Skills
              <br />
              <span className="text-gradient bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                With Real Code
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Get your GitHub projects analyzed by AI, earn your verified Aura score, 
              and connect with companies that value <span className="text-foreground font-medium">real skills over resumes</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button size="lg" asChild className="h-12 px-8 text-base">
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={login} className="h-12 px-8 text-base gap-2">
                    <Github className="h-5 w-5" />
                    Get Started Free
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                    <a href="#how-it-works">
                      See How It Works
                    </a>
                  </Button>
                </>
              )}
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-4 mt-8 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {['JD', 'AK', 'SC', 'MR', 'TC'].map((initials, i) => (
                  <div 
                    key={i} 
                    className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <span>Join 10,000+ developers building their verified profiles</span>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="text-center p-4 rounded-xl bg-card/50 border border-border/50"
              >
                <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-3xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <br />
              <span className="text-gradient bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Stand Out
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From AI-powered code analysis to job matching, we provide all the tools you
              need to showcase your true developer potential.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Get Verified in{' '}
              <span className="text-gradient bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                4 Simple Steps
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/50 via-purple-500/50 to-primary/50" />
            
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="text-center relative"
              >
                <div className="h-24 w-24 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-4 relative z-10 bg-background">
                  <item.icon className="h-10 w-10 text-primary" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Loved by{' '}
              <span className="text-gradient bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                Developers
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6">"{testimonial.quote}"</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                          {testimonial.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{testimonial.author}</p>
                          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="h-3 w-3 text-primary" />
                        {testimonial.aura}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-purple-500/20 p-12 md:p-16 text-center overflow-hidden"
          >
            {/* Background effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            
            <div className="relative">
              <Badge variant="outline" className="mb-6 bg-background/50">
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Start for free
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Ready to Verify Your Skills?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
                Join thousands of developers who have already built their verified
                profiles and connected with top companies.
              </p>
              {!isAuthenticated && (
                <Button size="lg" onClick={login} className="h-12 px-8 text-base gap-2">
                  <Github className="h-5 w-5" />
                  Get Started with GitHub
                </Button>
              )}
              {isAuthenticated && (
                <Button size="lg" asChild className="h-12 px-8 text-base gap-2">
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl">DevVerify</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The platform for verified developer skills. Prove your abilities with real code.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 DevVerify. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
