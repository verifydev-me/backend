/**
 * Niche Inference Service
 * 
 * Infers developer's primary role and niche based on their verified skills,
 * technologies, and project analysis. This is system-generated and cannot be
 * edited by users - maintaining trust factor for recruiters.
 */

import { PrismaClient, DeveloperNiche, SkillSource } from '@prisma/client'
import { logger } from '../utils/logger'

// Niche detection rules - maps skill patterns to niches
interface NicheRule {
  niche: DeveloperNiche
  signals: string[]
  weight: number
  roleTitle: string
}

// Production-grade niche detection rules
const NICHE_RULES: NicheRule[] = [
  // Frontend
  {
    niche: 'WEB_FRONTEND',
    signals: ['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt', 'tailwind', 'css', 'sass', 'styled-components', 'webpack', 'vite', 'typescript', 'html', 'responsive design', 'accessibility'],
    weight: 1,
    roleTitle: 'Frontend Developer'
  },
  
  // Backend Web
  {
    niche: 'WEB_BACKEND',
    signals: ['node.js', 'express', 'fastify', 'nestjs', 'django', 'flask', 'fastapi', 'spring boot', 'rest api', 'graphql', 'postgresql', 'mongodb', 'mysql', 'redis', 'authentication', 'authorization'],
    weight: 1,
    roleTitle: 'Backend Developer'
  },
  
  // Full Stack
  {
    niche: 'WEB_FULLSTACK',
    signals: ['full-stack', 'mern', 'mean', 'next.js', 't3 stack', 'prisma', 'trpc', 'remix'],
    weight: 0.8,
    roleTitle: 'Full Stack Developer'
  },
  
  // Mobile Android
  {
    niche: 'MOBILE_ANDROID',
    signals: ['android', 'kotlin', 'android sdk', 'jetpack compose', 'android studio', 'gradle', 'room database', 'android architecture'],
    weight: 1,
    roleTitle: 'Android Developer'
  },
  
  // Mobile iOS
  {
    niche: 'MOBILE_IOS',
    signals: ['ios', 'swift', 'swiftui', 'objective-c', 'xcode', 'cocoapods', 'core data', 'uikit'],
    weight: 1,
    roleTitle: 'iOS Developer'
  },
  
  // Cross-platform Mobile
  {
    niche: 'MOBILE_CROSS',
    signals: ['react native', 'flutter', 'dart', 'expo', 'xamarin', 'ionic', 'cross-platform mobile'],
    weight: 1,
    roleTitle: 'Mobile Developer'
  },
  
  // Backend Systems (Go, Rust, C++)
  {
    niche: 'BACKEND_SYSTEMS',
    signals: ['go', 'golang', 'rust', 'c++', 'systems programming', 'concurrency', 'performance optimization', 'memory management', 'grpc'],
    weight: 1.2,
    roleTitle: 'Backend Systems Engineer'
  },
  
  // Distributed Systems
  {
    niche: 'DISTRIBUTED',
    signals: ['kafka', 'rabbitmq', 'redis', 'microservices', 'event-driven', 'message queue', 'distributed systems', 'service mesh', 'grpc', 'protobuf', 'pub/sub', 'celery'],
    weight: 1.5,
    roleTitle: 'Distributed Systems Engineer'
  },
  
  // Data Engineering
  {
    niche: 'DATA_ENGINEERING',
    signals: ['apache spark', 'airflow', 'etl', 'data pipeline', 'hadoop', 'databricks', 'dbt', 'snowflake', 'big data', 'data warehouse'],
    weight: 1.3,
    roleTitle: 'Data Engineer'
  },
  
  // ML/AI
  {
    niche: 'ML_AI',
    signals: ['tensorflow', 'pytorch', 'machine learning', 'deep learning', 'neural network', 'nlp', 'computer vision', 'scikit-learn', 'keras', 'hugging face', 'llm', 'transformers'],
    weight: 1.4,
    roleTitle: 'ML/AI Engineer'
  },
  
  // DevOps
  {
    niche: 'DEVOPS',
    signals: ['docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'github actions', 'ci/cd', 'helm', 'argocd', 'prometheus', 'grafana'],
    weight: 1.2,
    roleTitle: 'DevOps Engineer'
  },
  
  // Cloud Infrastructure
  {
    niche: 'CLOUD_INFRA',
    signals: ['aws', 'gcp', 'azure', 'cloud architecture', 'lambda', 'serverless', 's3', 'ec2', 'cloudformation', 'cloud functions', 'ecs', 'eks'],
    weight: 1.3,
    roleTitle: 'Cloud Engineer'
  },
  
  // Security
  {
    niche: 'SECURITY',
    signals: ['security', 'penetration testing', 'owasp', 'cryptography', 'security audit', 'vulnerability', 'appsec', 'sast', 'dast', 'authentication', 'oauth', 'jwt'],
    weight: 1.4,
    roleTitle: 'Security Engineer'
  },
  
  // Blockchain
  {
    niche: 'BLOCKCHAIN',
    signals: ['solidity', 'ethereum', 'web3', 'smart contract', 'blockchain', 'defi', 'nft', 'hardhat', 'truffle', 'evm', 'dapp'],
    weight: 1.3,
    roleTitle: 'Blockchain Developer'
  },
  
  // Embedded
  {
    niche: 'EMBEDDED',
    signals: ['embedded', 'c', 'arduino', 'raspberry pi', 'iot', 'microcontroller', 'firmware', 'rtos', 'stm32', 'esp32'],
    weight: 1.2,
    roleTitle: 'Embedded Systems Engineer'
  },
  
  // Game Dev
  {
    niche: 'GAME_DEV',
    signals: ['unity', 'unreal', 'godot', 'game engine', 'game development', 'c#', 'opengl', 'directx', 'graphics programming', 'shaders'],
    weight: 1.2,
    roleTitle: 'Game Developer'
  }
]

interface NicheScore {
  niche: DeveloperNiche
  score: number
  matchedSignals: string[]
  roleTitle: string
}

export class NicheService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Infer user's niche based on their skills and technologies
   */
  async inferUserNiche(userId: string): Promise<{
    primaryNiche: DeveloperNiche
    secondaryNiche: DeveloperNiche | null
    primaryRole: string
    confidence: number
    autoTags: string[]
  }> {
    // Get user's verified skills and technologies
    const [skills, technologies] = await Promise.all([
      this.prisma.skill.findMany({
        where: { 
          userId,
          source: { in: [SkillSource.ANALYSIS, SkillSource.GITHUB] }
        },
        select: { name: true, verifiedScore: true, category: true }
      }),
      this.prisma.technology.findMany({
        where: { userId },
        select: { name: true, confidence: true, category: true }
      })
    ])

    // Combine all signals
    const allSignals = [
      ...skills.map(s => s.name.toLowerCase()),
      ...technologies.map(t => t.name.toLowerCase())
    ]

    // Score each niche
    const nicheScores: NicheScore[] = NICHE_RULES.map(rule => {
      const matchedSignals = rule.signals.filter(signal => 
        allSignals.some(s => s.includes(signal) || signal.includes(s))
      )
      
      return {
        niche: rule.niche,
        score: matchedSignals.length * rule.weight,
        matchedSignals,
        roleTitle: rule.roleTitle
      }
    })

    // Sort by score and get top niches
    nicheScores.sort((a, b) => b.score - a.score)
    
    const topNiche = nicheScores[0]
    const secondNiche = nicheScores[1]

    // Handle fullstack detection
    let primaryNiche = topNiche.niche
    let primaryRole = topNiche.roleTitle
    
    // If both frontend and backend are strong, mark as fullstack
    const frontendScore = nicheScores.find(n => n.niche === 'WEB_FRONTEND')?.score || 0
    const backendScore = nicheScores.find(n => n.niche === 'WEB_BACKEND')?.score || 0
    
    if (frontendScore > 2 && backendScore > 2) {
      primaryNiche = 'WEB_FULLSTACK'
      primaryRole = 'Full Stack Developer'
    }

    // Calculate confidence (0-100)
    const maxPossibleScore = Math.max(...NICHE_RULES.map(r => r.signals.length * r.weight))
    const confidence = Math.min(100, Math.round((topNiche.score / maxPossibleScore) * 100 * 2))

    // Generate auto-tags based on detected signals
    const autoTags = this.generateAutoTags(nicheScores, skills, technologies)

    return {
      primaryNiche: primaryNiche === 'GENERAL' || topNiche.score < 1 ? 'GENERAL' : primaryNiche,
      secondaryNiche: secondNiche && secondNiche.score > 1 ? secondNiche.niche : null,
      primaryRole: topNiche.score < 1 ? 'Software Developer' : primaryRole,
      confidence,
      autoTags
    }
  }

  /**
   * Generate auto-tags based on detected patterns
   */
  private generateAutoTags(
    nicheScores: NicheScore[],
    skills: { name: string; verifiedScore: number; category: string }[],
    technologies: { name: string; confidence: number; category: string }[]
  ): string[] {
    const tags: string[] = []

    // Add primary role tag
    const topNiche = nicheScores[0]
    if (topNiche.score >= 2) {
      tags.push(topNiche.roleTitle)
    }

    // Check for infrastructure awareness
    const hasInfra = technologies.some(t => 
      ['docker', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure'].some(i => 
        t.name.toLowerCase().includes(i)
      )
    )
    if (hasInfra) {
      tags.push('Infrastructure Aware')
    }

    // Check for event-driven architecture
    const hasEventDriven = technologies.some(t =>
      ['kafka', 'rabbitmq', 'redis', 'pub/sub', 'event'].some(e =>
        t.name.toLowerCase().includes(e)
      )
    )
    if (hasEventDriven) {
      tags.push('Event-Driven Architecture')
    }

    // Check for production-grade patterns
    const hasProduction = skills.some(s =>
      ['ci/cd', 'testing', 'monitoring', 'logging', 'deployment'].some(p =>
        s.name.toLowerCase().includes(p)
      )
    )
    if (hasProduction) {
      tags.push('Production-Grade Systems')
    }

    // Check for API expertise
    const hasApi = skills.some(s =>
      ['rest api', 'graphql', 'grpc', 'api design'].some(a =>
        s.name.toLowerCase().includes(a)
      )
    )
    if (hasApi) {
      tags.push('API Developer')
    }

    // Check for database expertise
    const databaseSkills = skills.filter(s => s.category === 'DATABASE')
    if (databaseSkills.length >= 2) {
      tags.push('Database Expert')
    }

    return tags.slice(0, 5) // Max 5 tags
  }

  /**
   * Update user's niche in database
   */
  async updateUserNiche(userId: string): Promise<void> {
    try {
      const inference = await this.inferUserNiche(userId)

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          primaryRole: inference.primaryRole,
          primaryNiche: inference.primaryNiche,
          secondaryNiche: inference.secondaryNiche,
          nicheConfidence: inference.confidence,
          nicheInferredAt: new Date(),
          autoTags: inference.autoTags
        }
      })

      logger.info({ 
        userId, 
        niche: inference.primaryNiche,
        role: inference.primaryRole,
        confidence: inference.confidence
      }, 'User niche updated')
    } catch (error) {
      logger.error({ error, userId }, 'Failed to update user niche')
      throw error
    }
  }
}
