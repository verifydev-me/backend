import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN';
}

export const userClient = {
  /**
   * Get user details by ID
   * Uses internal service communication
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      // Default to localhost/docker service name if not configured
      // We try both service name (docker) and localhost (local dev)
      // Ideally this comes from config
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
      
      const response = await fetch(`${userServiceUrl}/api/v1/users/${userId}/public`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            // Add internal secret if needed for bypass?
            // For public profile, it should be open or require valid token
        }
      });

      if (!response.ok) {
        // Fallback for local development if running outside docker
        if (userServiceUrl.includes('user-service')) {
            const localUrl = 'http://localhost:3002';
            const localRes = await fetch(`${localUrl}/api/v1/users/${userId}/public`);
            if (localRes.ok) {
                const data = await localRes.json() as { success: boolean; data: User };
                return data.data;
            }
        }
        return null;
      }

      const data = await response.json() as { success: boolean; data: User };
      return data.data; // Assuming standard ApiResponse structure { success: true, data: User }
    } catch (error) {
      logger.error({ userId, error }, 'Failed to fetch user details');
      return null;
    }
  },

  /**
   * Batch fetch users (simulated via parallel requests for now)
   */
  async getUsers(userIds: string[]): Promise<Map<string, User>> {
    const uniqueIds = [...new Set(userIds)];
    const users = new Map<string, User>();
    
    // Limit concurrency if needed, but for now specific parallel fetch
    const promises = uniqueIds.map(id => this.getUser(id));
    const results = await Promise.all(promises);

    results.forEach((user, index) => {
        if (user) {
            users.set(uniqueIds[index], user);
        }
    });

    return users;
  }
};
