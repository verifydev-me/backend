import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Code2,
  Briefcase,
  UserCircle,
  Building,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Zap,
  Target,
} from 'lucide-react'

const roles = [
  {
    id: 'developer',
    title: 'Developer',
    subtitle: 'Build, Create, Innovate',
    description: 'Showcase your projects, verify skills, and get discovered by top recruiters',
    icon: Code2,
    color: 'from-blue-500 to-cyan-500',
    bgGlow: 'bg-blue-500/20',
    route: '/auth/otp-login',
    features: [
      'GitHub Integration',
      'DSA Profile Verification',
      'AURA Score System',
      'Project Analytics',
    ],
  },
  {
    id: 'recruiter',
    title: 'Recruiter / HR',
    subtitle: 'Find Top Talent',
    description: 'Discover verified developers, post jobs, and build your dream team',
    icon: Briefcase,
    color: 'from-purple-500 to-pink-500',
    bgGlow: 'bg-purple-500/20',
    route: '/recruiter/login',
    features: [
      'Smart Candidate Search',
      'AURA-based Filtering',
      'Job Posting & Management',
      'Applicant Tracking',
    ],
  },
  {
    id: 'user',
    title: 'User / Visitor',
    subtitle: 'Explore & Discover',
    description: 'Browse public developer profiles and explore the community',
    icon: UserCircle,
    color: 'from-green-500 to-emerald-500',
    bgGlow: 'bg-green-500/20',
    route: '/',
    features: [
      'Browse Public Profiles',
      'Discover Top Developers',
      'Explore Projects',
      'Community Access',
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
}

const cardHoverVariants = {
  hover: {
    scale: 1.02,
    y: -8,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
}

export default function RoleSelection() {
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  const handleRoleSelect = (roleId: string, route: string) => {
    setSelectedRole(roleId)
    setTimeout(() => {
      navigate(route)
    }, 400)
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            className="inline-block mb-4"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-500 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-gradient-to-r from-primary to-purple-500 p-3 rounded-2xl">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
            Choose Your Path
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Select your role to continue. Each path is designed specifically for your needs.
          </p>
        </motion.div>

        {/* Role Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
        >
          {roles.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id

            return (
              <motion.div key={role.id} variants={itemVariants}>
                <AnimatePresence mode="wait">
                  <motion.div
                    variants={cardHoverVariants}
                    whileHover="hover"
                    whileTap={{ scale: 0.98 }}
                    className="h-full"
                  >
                    <Card
                      className={`relative overflow-hidden cursor-pointer h-full border-2 transition-all duration-300 ${
                        isSelected
                          ? 'border-primary shadow-lg shadow-primary/20'
                          : 'border-border hover:border-primary/50 hover:shadow-lg'
                      }`}
                      onClick={() => handleRoleSelect(role.id, role.route)}
                    >
                      {/* Glow Effect */}
                      <div className={`absolute inset-0 ${role.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl`} />

                      <CardContent className="relative p-6 h-full flex flex-col">
                        {/* Icon */}
                        <div className="mb-6">
                          <div className={`inline-block p-4 rounded-2xl bg-gradient-to-br ${role.color}`}>
                            <Icon className="h-8 w-8 text-white" />
                          </div>
                        </div>

                        {/* Title */}
                        <div className="mb-4">
                          <h2 className="text-2xl font-bold mb-1">{role.title}</h2>
                          <p className="text-sm text-muted-foreground">{role.subtitle}</p>
                        </div>

                        {/* Description */}
                        <p className="text-muted-foreground mb-6 flex-grow">
                          {role.description}
                        </p>

                        {/* Features */}
                        <div className="space-y-2 mb-6">
                          {role.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-muted-foreground">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* CTA Button */}
                        <Button
                          className={`w-full group bg-gradient-to-r ${role.color} hover:opacity-90 transition-opacity`}
                          size="lg"
                        >
                          <span>Continue</span>
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>

                        {/* Selected Indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute top-4 right-4"
                            >
                              <div className="bg-primary rounded-full p-2">
                                <CheckCircle2 className="h-5 w-5 text-white" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-12 space-y-4"
        >
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span>Quick Setup</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Personalized Experience</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <span>Trusted Platform</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Not sure? Choose "User / Visitor" to explore without signing up.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
