import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toLocaleString()
}

/**
 * Format a date string
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) return `${years}y ago`
  if (months > 0) return `${months}mo ago`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

/**
 * Format salary range
 */
export function formatSalary(min?: number, max?: number, currency = 'USD'): string {
  if (!min && !max) return 'Competitive'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`
  }
  if (min) return `From ${formatter.format(min)}`
  if (max) return `Up to ${formatter.format(max)}`
  return 'Competitive'
}

/**
 * Get language color for programming languages
 */
export function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
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
    HTML: '#e34c26',
    CSS: '#563d7c',
    SCSS: '#c6538c',
    Vue: '#41b883',
    Shell: '#89e051',
  }
  return colors[language] || '#6e7681'
}

/**
 * Get aura level info
 */
export function getAuraLevel(score: number): { label: string; color: string; gradient: string } {
  if (score >= 90) return { label: 'Elite', color: 'purple', gradient: 'from-purple-500 to-pink-500' }
  if (score >= 70) return { label: 'Expert', color: 'blue', gradient: 'from-blue-500 to-cyan-500' }
  if (score >= 50) return { label: 'Advanced', color: 'green', gradient: 'from-green-500 to-emerald-500' }
  if (score >= 30) return { label: 'Intermediate', color: 'yellow', gradient: 'from-yellow-500 to-orange-500' }
  return { label: 'Beginner', color: 'gray', gradient: 'from-gray-400 to-gray-600' }
}

/**
 * Get CSS class for aura badge
 */
export function getAuraBadgeClass(score: number): string {
  if (score >= 90) return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
  if (score >= 70) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
  if (score >= 50) return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
  if (score >= 30) return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
  return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white'
}
