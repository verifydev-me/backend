import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth-store'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

import { useRecruiterStore } from '@/store/recruiter-store'

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Determine which store to use based on URL and available tokens
    const isRecruiterPath = config.url?.includes('/recruiters')
    const recruiterToken = useRecruiterStore.getState().accessToken
    const userToken = useAuthStore.getState().accessToken
    
    let token = null
    if (isRecruiterPath) {
      // Explicitly recruiter endpoint - use recruiter token
      token = recruiterToken
    } else if (recruiterToken) {
      // If recruiter is logged in, use recruiter token for all other endpoints
      token = recruiterToken
    } else {
      // Otherwise use user token
      token = userToken
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // If 401 and not already retrying, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite loops for auth endpoints
      if (originalRequest.url?.includes('/auth/refresh') || 
          originalRequest.url?.includes('/auth/logout') ||
          originalRequest.url?.includes('/recruiters/logout')) {
        return Promise.reject(error)
      }

      originalRequest._retry = true
      const isRecruiterPath = originalRequest.url?.includes('/recruiters')

      try {
        if (isRecruiterPath) {
          // For now, if recruiter token is invalid, just logout
          // In future, you can implement recruiter refresh token here
          const { logout } = useRecruiterStore.getState()
          logout()
          return Promise.reject(error)
        }

        const { refreshToken, setTokens, logout } = useAuthStore.getState()
        
        if (!refreshToken) {
          logout()
          return Promise.reject(error)
        }

        const response = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
          refreshToken,
        })

        const { accessToken, refreshToken: newRefreshToken } = response.data.data
        setTokens(accessToken, newRefreshToken)

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }
        return apiClient(originalRequest)
      } catch (refreshError) {
        if (isRecruiterPath) {
          useRecruiterStore.getState().logout()
        } else {
          useAuthStore.getState().logout()
        }
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Generic API functions
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<{ data: T }>(url, config)
  return response.data.data
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.post<{ data: T }>(url, data, config)
  return response.data.data
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.put<{ data: T }>(url, data, config)
  return response.data.data
}

export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.patch<{ data: T }>(url, data, config)
  return response.data.data
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<{ data: T }>(url, config)
  return response.data.data
}
