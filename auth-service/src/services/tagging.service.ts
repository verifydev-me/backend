
import { Skill } from '@prisma/client';


export class TaggingService {
  /**
   * generateProfileTags
   * Analyzes user skills and returns a list of role tags (e.g. "Backend Developer", "DevOps Engineer").
   */
  static generateProfileTags(skills: Skill[]): string[] {
    const tags = new Set<string>();

    const skillNames = skills.map(s => s.name.toLowerCase());
    
    const backendKeywords = ['node', 'node.js', 'go', 'golang', 'python', 'java', 'c#', 'rust', 'ruby', 'php', 'express', 'django', 'spring', 'gin', 'postgresql', 'mongodb', 'mysql', 'redis', 'kafka'];
    const frontendKeywords = ['react', 'react.js', 'vue', 'vue.js', 'angular', 'html', 'css', 'typescript', 'javascript', 'next.js', 'tailwind'];
    const devopsKeywords = ['docker', 'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'terraform', 'jenkins', 'ci/cd', 'linux', 'bash'];
    const mlKeywords = ['pytorch', 'tensorflow', 'keras', 'scikit-learn', 'pandas', 'numpy', 'machine learning', 'ai', 'computer vision', 'nlp'];

    const hasBackend = skillNames.some(s => backendKeywords.some(k => s.includes(k)));
    const hasFrontend = skillNames.some(s => frontendKeywords.some(k => s.includes(k)));
    const hasDevOps = skillNames.some(s => devopsKeywords.some(k => s.includes(k)));
    const hasML = skillNames.some(s => mlKeywords.some(k => s.includes(k)));

    if (hasBackend && hasFrontend) {
        tags.add('Full Stack Developer');
    } else if (hasBackend) {
        tags.add('Backend Developer');
    } else if (hasFrontend) {
        tags.add('Frontend Developer');
    }

    if (hasDevOps) {
        tags.add('Infrastructure Engineer');
    }

    if (hasML) {
        tags.add('ML/AI Engineer');
    }

    // Default if likely no specific match but some skills exist
    if (tags.size === 0 && skills.length > 0) {
        tags.add('Software Developer');
    }

    return Array.from(tags);
  }
}
