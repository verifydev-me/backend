/**
 * Connect Platforms Page
 * After signup, users connect their developer platforms here
 * GitHub, LeetCode, GeeksforGeeks, LinkedIn, etc.
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Github, 
  ArrowRight, 
  Check, 
  Code2, 
  ExternalLink,
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth-store'

// Platform definitions
const platforms = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Import repositories, contributions & code analysis',
    icon: Github,
    color: 'bg-gray-900 dark:bg-white dark:text-gray-900',
    required: true,
    connected: false,
  },
  {
    id: 'leetcode',
    name: 'LeetCode',
    description: 'DSA skills, problem solving & contest rating',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/>
      </svg>
    ),
    color: 'bg-orange-500',
    required: false,
    connected: false,
  },
  {
    id: 'geeksforgeeks',
    name: 'GeeksforGeeks',
    description: 'Coding score, practice problems & institute rank',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M21.45 14.315c-.143.28-.334.532-.565.745a3.691 3.691 0 0 1-1.104.695 4.51 4.51 0 0 1-3.116-.016 3.79 3.79 0 0 1-2.135-2.078 3.571 3.571 0 0 1-.319-.91h-.046c.093.3.198.598.319.91.476 1.023 1.193 1.768 2.135 2.078a4.51 4.51 0 0 0 3.116.016 3.691 3.691 0 0 0 1.104-.695c.23-.213.422-.465.565-.745.188-.37.293-.785.293-1.226 0-.44-.105-.856-.293-1.226-.143-.28-.334-.532-.565-.745a3.691 3.691 0 0 0-1.104-.695 4.51 4.51 0 0 0-3.116-.016 3.79 3.79 0 0 0-2.135 2.078 3.571 3.571 0 0 0-.319.91h.046a3.571 3.571 0 0 1 .319-.91 3.79 3.79 0 0 1 2.135-2.078 4.51 4.51 0 0 1 3.116.016 3.691 3.691 0 0 1 1.104.695c.23.213.422.465.565.745.188.37.293.785.293 1.226 0 .44-.105.856-.293 1.226zM2.55 14.315c.143.28.334.532.565.745.32.302.687.535 1.104.695.998.39 2.108.406 3.116.016a3.79 3.79 0 0 0 2.135-2.078c.12-.3.226-.598.319-.91h.046a3.571 3.571 0 0 1-.319.91 3.79 3.79 0 0 1-2.135 2.078 4.51 4.51 0 0 1-3.116-.016 3.691 3.691 0 0 1-1.104-.695 2.267 2.267 0 0 1-.565-.745A2.723 2.723 0 0 1 2.3 13.09c0-.44.105-.856.293-1.226.143-.28.334-.532.565-.745.32-.302.687-.535 1.104-.695a4.51 4.51 0 0 1 3.116.016 3.79 3.79 0 0 1 2.135 2.078c.12.3.226.598.319.91h-.046a3.571 3.571 0 0 0-.319-.91 3.79 3.79 0 0 0-2.135-2.078 4.51 4.51 0 0 0-3.116-.016 3.691 3.691 0 0 0-1.104.695 2.267 2.267 0 0 0-.565.745A2.723 2.723 0 0 0 2.3 13.09c0 .44.105.856.293 1.226z"/>
      </svg>
    ),
    color: 'bg-green-600',
    required: false,
    connected: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Import work experience & education',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: 'bg-blue-600',
    required: false,
    connected: false,
  },
  {
    id: 'hackerrank',
    name: 'HackerRank',
    description: 'Certifications & skill badges',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M12 0c1.285 0 9.75 4.886 10.392 6 .645 1.115.645 10.885 0 12S13.287 24 12 24s-9.75-4.885-10.395-6c-.641-1.115-.641-10.885 0-12C2.25 4.886 10.715 0 12 0zm2.295 6.799c-.141 0-.258.115-.258.258v3.875H9.963V6.908h.701a.257.257 0 0 0 .258-.259c0-.142-.116-.258-.258-.258H7.964a.258.258 0 0 0-.258.258c0 .143.116.259.258.259h.701v10.035h-.701a.258.258 0 0 0-.258.259c0 .142.116.258.258.258h2.7a.258.258 0 0 0 .258-.258.258.258 0 0 0-.258-.259h-.701v-5.361h4.074v5.361h-.701a.258.258 0 0 0-.258.259c0 .142.116.258.258.258h2.7a.258.258 0 0 0 .258-.258.258.258 0 0 0-.258-.259h-.701V6.908h.701a.257.257 0 0 0 .258-.259.258.258 0 0 0-.258-.258h-2.7v.008z"/>
      </svg>
    ),
    color: 'bg-emerald-500',
    required: false,
    connected: false,
  },
  {
    id: 'codechef',
    name: 'CodeChef',
    description: 'Contest ratings & rankings',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M11.007 0c-.787.031-1.515.37-2.222.685a12.27 12.27 0 0 1-1.864.703c-.635.176-1.3.354-1.814.788-.222.186-.39.43-.49.704-.097.262-.142.508-.191.75-.19.944-.287 1.927-.429 2.881-.142.953-.333 1.906-.63 2.822-.15.46-.339.942-.63 1.327-.29.384-.658.687-.992 1.018a9.606 9.606 0 0 0-1.788 2.391 4.987 4.987 0 0 0-.327.833c-.082.274-.11.57-.093.853.017.282.079.56.166.826.087.267.205.511.322.757.234.487.477.952.752 1.402.275.45.571.893.904 1.306a7.6 7.6 0 0 0 1.102 1.129 2.35 2.35 0 0 0 .633.369c.242.08.494.097.729.035.235-.062.44-.176.611-.32.171-.145.306-.32.404-.513.196-.384.282-.803.388-1.192.107-.388.232-.765.394-1.125.08-.176.169-.345.257-.508l.122-.122c-.066.263-.092.529-.082.796.01.268.055.537.119.8.065.263.154.519.268.762a3.97 3.97 0 0 0 .79 1.058c.167.158.346.304.54.429.193.125.4.22.612.28.211.06.434.086.651.074.218-.012.436-.065.633-.17a2.21 2.21 0 0 0 .455-.319l.08-.073c.164.3.357.587.573.856.217.269.456.518.72.742.263.223.552.42.864.584.312.164.647.286.993.36.347.074.713.108 1.067.067.355-.041.705-.146 1.022-.32.316-.174.6-.411.844-.698.244-.287.448-.62.605-.98.157-.36.265-.746.32-1.139.056-.393.058-.795.007-1.182a4.88 4.88 0 0 0-.28-1.103 5.632 5.632 0 0 0-.52-1.025l-.06-.086c.052.014.107.024.16.031.268.038.539.012.793-.063.254-.076.49-.203.697-.367.207-.165.381-.364.525-.586.143-.222.256-.464.337-.716.162-.502.234-1.028.283-1.55.048-.523.071-1.05.112-1.576.04-.526.1-1.053.204-1.573.105-.52.257-1.035.465-1.531.104-.247.224-.49.353-.727.13-.236.27-.466.392-.706.121-.24.222-.492.276-.759.055-.266.068-.542.026-.806a1.593 1.593 0 0 0-.307-.683c-.151-.195-.342-.353-.55-.477-.417-.248-.891-.38-1.345-.52-.455-.138-.91-.28-1.377-.356-.465-.076-.95-.084-1.418-.19-.468-.106-.923-.303-1.318-.579a3.192 3.192 0 0 1-.502-.44c-.163-.174-.3-.373-.388-.593-.088-.22-.13-.46-.115-.698.014-.237.082-.47.198-.676.116-.206.278-.382.468-.522.19-.14.403-.247.627-.32.448-.145.92-.177 1.382-.22.461-.044.922-.094 1.37-.203.45-.11.889-.281 1.283-.524a2.78 2.78 0 0 0 .621-.495c.084-.094.159-.197.217-.307a.786.786 0 0 0 .1-.345.475.475 0 0 0-.062-.226c-.018-.032-.041-.05-.066-.064l-.022-.01c-.168-.115-.386-.086-.583-.064l-.07.006a4.981 4.981 0 0 1-.695.032 4.462 4.462 0 0 1-1.452-.293c-.24-.092-.467-.21-.682-.345-.215-.136-.419-.292-.622-.445a6.932 6.932 0 0 0-1.316-.816A6.305 6.305 0 0 0 13.5.085a6.167 6.167 0 0 0-1.548-.08c-.27.019-.538.056-.801.11-.264.054-.524.129-.773.23z"/>
      </svg>
    ),
    color: 'bg-amber-600',
    required: false,
    connected: false,
  },
]

export default function ConnectPlatforms() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  // Check if minimum requirements met (GitHub required)
  const canContinue = connectedPlatforms.includes('github')

  const handleConnect = async (platformId: string) => {
    setLoading(platformId)
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (platformId === 'github') {
      // Use existing GitHub OAuth
      login()
      return
    }

    // For other platforms, simulate connection
    // In production, these would redirect to OAuth flows
    setConnectedPlatforms(prev => [...prev, platformId])
    setLoading(null)
  }

  const handleDisconnect = (platformId: string) => {
    setConnectedPlatforms(prev => prev.filter(p => p !== platformId))
  }

  const handleContinue = () => {
    // Save connected platforms to backend
    // For now, just redirect to dashboard
    navigate('/dashboard')
  }

  const handleSkip = () => {
    // Allow skipping but warn about limited features
    if (confirm('Skipping platform connections will limit your AURA score and verified skills. Continue?')) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] bg-primary/10" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full blur-[100px] bg-primary/5" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="p-2 rounded-xl bg-primary">
              <Code2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">VerifyDev</span>
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-3">
            Connect Your Platforms
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Link your developer accounts to verify your skills and build a comprehensive profile
          </p>
        </motion.div>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-sm text-muted-foreground">Account Created</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
              2
            </div>
            <span className="text-sm font-medium text-foreground">Connect Platforms</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-semibold">
              3
            </div>
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </div>
        </motion.div>

        {/* Platforms Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid gap-4 mb-8"
        >
          {platforms.map((platform, index) => {
            const isConnected = connectedPlatforms.includes(platform.id)
            const isLoading = loading === platform.id
            const Icon = platform.icon

            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`p-4 rounded-xl border transition-all ${
                  isConnected
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-card border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${platform.color} text-white`}>
                    <Icon />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{platform.name}</h3>
                      {platform.required && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Required
                        </span>
                      )}
                      {isConnected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{platform.description}</p>
                  </div>

                  {/* Action Button */}
                  <div>
                    {isConnected ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(platform.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(platform.id)}
                        disabled={isLoading}
                        className="gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Connect
                            <ExternalLink className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Benefits callout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-8"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground mb-1">Why connect platforms?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Get a higher AURA score with verified skills</li>
                <li>• Auto-fill your resume with real data</li>
                <li>• Stand out to recruiters with verified DSA ratings</li>
                <li>• Showcase all your work in one place</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            className="flex-1 h-12 gap-2"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Continue to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            className="h-12"
            onClick={handleSkip}
          >
            Skip for now
          </Button>
        </motion.div>

        {!canContinue && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Please connect at least GitHub to continue
          </p>
        )}
      </div>
    </div>
  )
}
