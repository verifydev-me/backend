import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { AuraLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | undefined | null): string {
  if (num == null) return '0'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatRelativeTime(date?: string | Date | null): string {
  if (!date) return 'N/A'
  const now = new Date()
  const then = new Date(date)
  if (isNaN(then.getTime())) return 'N/A'
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 0) return 'just now'
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
  return formatDate(date)
}

export function getAuraLevel(score: number): AuraLevel {
  if (score >= 501) return 'legend'
  if (score >= 401) return 'expert'
  if (score >= 251) return 'skilled'
  if (score >= 101) return 'rising'
  return 'novice'
}

export function getAuraColor(level: AuraLevel): string {
  const colors: Record<AuraLevel, string> = {
    novice: '#71717a',
    rising: '#22c55e',
    skilled: '#3b82f6',
    expert: '#8b5cf6',
    legend: '#f59e0b',
  }
  return colors[level]
}

export function getAuraBadgeClass(level: AuraLevel): string {
  return `aura-badge-${level}`
}

export function getInitials(name?: string | null): string {
  if (!name) return '??'
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f7df1e',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Go: '#00ADD8',
    Rust: '#dea584',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    Dart: '#00B4AB',
    Shell: '#89e051',
    HTML: '#e34c26',
    CSS: '#563d7c',
  }
  return colors[language] || '#6e7681'
}

export function formatSalary(min?: number, max?: number, currency = 'USD'): string {
  if (!min && !max) return 'Competitive'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
  if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`
  if (min) return `${formatter.format(min)}+`
  if (max) return `Up to ${formatter.format(max)}`
  return 'Competitive'
}
