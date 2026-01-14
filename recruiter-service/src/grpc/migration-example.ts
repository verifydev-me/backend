// ==================== EXAMPLE MIGRATION - CANDIDATE SERVICE ====================
// This shows how to migrate existing HTTP calls to gRPC

import { getUser, batchGetUsers, searchCandidates, getUserProfile } from '../grpc/user-client';

/**
 * BEFORE: Using HTTP/axios
 * 
 * const response = await axios.get(
 *   `${USER_SERVICE_URL}/api/internal/candidates/search`,
 *   { params: { skills: ['React', 'Node.js'], minAura: 800 } }
 * );
 * const candidates = response.data.candidates;
 */

/**
 * AFTER: Using gRPC
 */
export async function searchCandidatesGrpc(filters: {
  skills?: string[];
  minAura?: number;
  location?: string;
  page?: number;
  limit?: number;
}): Promise<any> {
  try {
    const result = await searchCandidates({
      skills: filters.skills,
      minAuraScore: filters.minAura,
      locationCity: filters.location,
      page: filters.page,
      limit: filters.limit,
    });

    return {
      candidates: result.candidates,
      total: result.pagination.total,
      page: result.pagination.page,
      totalPages: result.pagination.total_pages,
    };
  } catch (error: any) {
    console.error('gRPC search candidates error:', error);
    throw error;
  }
}

/**
 * BEFORE: Multiple parallel HTTP calls (SLOW!)
 * 
 * const users = await Promise.all(
 *   userIds.map(id => axios.get(`${USER_SERVICE_URL}/api/internal/candidates/${id}`))
 * );
 * const candidates = users.map(res => res.data);
 */

/**
 * AFTER: Single gRPC batch call (FAST!)
 */
export async function getCandidatesByIdsGrpc(userIds: string[]): Promise<any[]> {
  try {
    // Single gRPC call instead of N HTTP calls
    const users = await batchGetUsers(userIds);
    return users;
  } catch (error: any) {
    console.error('gRPC batch get users error:', error);
    throw error;
  }
}

/**
 * BEFORE: Get candidate details with HTTP
 * 
 * const response = await axios.get(`${USER_SERVICE_URL}/api/internal/candidates/${userId}`);
 * const candidate = response.data;
 */

/**
 * AFTER: Get candidate details with gRPC
 */
export async function getCandidateDetailsGrpc(userId: string): Promise<any> {
  try {
    const user = await getUserProfile(userId, {
      includeProjects: true,
      includeSkills: true,
      includeExperiences: true,
      includeEducation: true,
    });

    return user;
  } catch (error: any) {
    console.error('gRPC get candidate details error:', error);
    throw error;
  }
}

/**
 * Performance comparison example
 */
export async function performanceComparison(userIds: string[]): Promise<void> {
  console.log('\n=== Performance Comparison: HTTP vs gRPC ===\n');

  // HTTP approach (simulated - would be slower)
  console.time('HTTP: Multiple parallel calls');
  // await Promise.all(userIds.map(id => httpGetUser(id)));
  console.timeEnd('HTTP: Multiple parallel calls');
  console.log('Estimated time: 150-300ms per call × N calls');

  // gRPC approach
  console.time('gRPC: Single batch call');
  await batchGetUsers(userIds);
  console.timeEnd('gRPC: Single batch call');
  console.log('Actual time: Single optimized call\n');
}
