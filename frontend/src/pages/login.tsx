/**
 * Developer Login - PREMIUM THEME-AWARE EDITION
 * Clean, immersive portal entry that adapts to accent color
 */
import { motion } from 'framer-motion'
import { Github, ArrowLeft, Code2, Sparkles, Shield, Zap, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

// Background Effect - Theme Aware
function LoginBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-background" />
      
      {/* Primary color glows */}
      <motion.div 
        className="absolute bottom-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full blur-[120px] bg-primary/20"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div 
        className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] bg-primary/15"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{ duration: 15, repeat: Infinity }}
      />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--foreground)/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
    </div>
  )
}

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
       {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-2xl bg-primary/10"
          style={{
            width: Math.random() * 150 + 50,
            height: Math.random() * 150 + 50,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, Math.random() * 80 - 40],
            x: [0, Math.random() * 80 - 40],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Infinity,
            repeatType: 'mirror',
          }}
        />
       ))}
    </div>
  )
}

export default function Login() {
  const { login } = useAuthStore()

  const handleGitHubLogin = () => {
    login()
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-background text-foreground">
      <LoginBackground />
      <FloatingOrbs />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        
        {/* Left Side: Brand & Value Prop */}
        <div className="hidden lg:block space-y-8">
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8 }}
           >
             <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-xl bg-primary shadow-xl shadow-primary/20">
                  <Code2 className="w-8 h-8 text-primary-foreground" />
                </div>
                <span className="text-3xl font-bold tracking-tight text-foreground">VerifyDev</span>
             </div>
             
             <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
               <span className="text-foreground">
                 Code Speaks.
               </span>
               <br />
               <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                 We Listen.
               </span>
             </h1>
             
             <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
               The first AI-powered verification platform for developers. 
               Connect your GitHub and let your code prove your worth.
             </p>
           </motion.div>

           <motion.div 
             className="grid gap-4"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.4 }}
           >
              {[
                { icon: Sparkles, title: "AI Analysis", desc: "Deep code quality verification" },
                { icon: Shield, title: "Identity Proof", desc: "Verified developer badges" },
                { icon: Zap, title: "Instant Match", desc: "Skip technical screenings" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/80 backdrop-blur-sm hover:bg-card/80 transition-colors">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
           </motion.div>
        </div>

        {/* Right Side: Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl">
            {/* Subtle gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            <div className="relative z-10 p-8 md:p-12 space-y-8">
              <div className="text-center space-y-2">
                <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
                  <div className="p-2 rounded-xl bg-primary"><Code2 className="w-6 h-6 text-primary-foreground"/></div>
                  <span className="text-xl font-bold text-foreground">VerifyDev</span>
                </div>
                <h2 className="text-3xl font-bold text-foreground">Welcome Back</h2>
                <p className="text-muted-foreground">Sign in to access your developer portal</p>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleGitHubLogin}
                  className="w-full h-14 text-lg font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 group"
                >
                  <Github className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                  Continue with GitHub
                </Button>
                
                <div className="relative flex py-3 items-center">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase tracking-wider">or</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>

                <Link to="/auth/otp-login" className="block">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-border hover:bg-muted hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all">
                    <span className="mr-2">📧</span>
                    Sign in with Email/OTP
                  </Button>
                </Link>

                <Link to="/recruiter/login" className="block">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-border hover:bg-muted hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all">
                    <Terminal className="w-4 h-4 mr-2" />
                    I'm looking to hire
                  </Button>
                </Link>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground px-4">
                  By continuing you agree to our <Link to="/terms" className="text-primary underline hover:no-underline">Terms</Link> and <Link to="/privacy" className="text-primary underline hover:no-underline">Privacy Policy</Link>.
                </p>
              </div>

            </div>
          </div>
          
          {/* Back to Home Link */}
          <div className="text-center mt-6">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Return to Homepage
            </Link>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
