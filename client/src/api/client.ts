import { useAuthStore } from '@/stores/auth'

export interface RequestConfig extends Omit<RequestInit, 'body'> {
  params?: Record<string, any>
  data?: any
  headers?: Record<string, string>
}

export interface ApiResponseWrapper<T = any> {
  data: T
  status: number
  statusText: string
  headers: Headers
}

class HttpClient {
  private baseURL: string = ''
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>> = []
  private responseInterceptors: Array<(response: any) => any | Promise<any>> = []

  constructor(baseURL: string = '') {
    // No trailing slash: callers always pass paths that start with /api
    this.baseURL = baseURL.replace(/\/+$/, '')

    // Default interceptor: attach Authorization bearer token if available
    this.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers = {
          Authorization: `Bearer ${token}`,
          ...config.headers,
        }
      }
      return config
    })
  }

  public interceptors = {
    request: {
      use: (fn: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>) => {
        this.requestInterceptors.push(fn)
      },
    },
    response: {
      use: (fn: (response: any) => any | Promise<any>) => {
        this.responseInterceptors.push(fn)
      },
    },
  }

  // One refresh at a time: parallel calls that all hit an expired token share it (the server rotates the refresh token)
  private refreshPromise: Promise<boolean> | null = null

  private refreshAccessToken(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null
      })
    }
    return this.refreshPromise
  }

  /** Swaps the saved refresh token for a new access token. Resolves false if that is not possible. */
  private async doRefresh(): Promise<boolean> {
    try {
      const auth = useAuthStore()
      const refreshToken = auth.user?.refreshToken
      // The refresh_token cookie goes along automatically; the bearer header is for sessions that have no cookie
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (refreshToken && !refreshToken.startsWith('mock-refresh')) {
        headers.Authorization = `Bearer ${refreshToken}`
      }
      const res = await fetch(`${this.baseURL}/api/v1/auth/refresh`, { method: 'POST', headers, credentials: 'include' })
      if (!res.ok) return false
      const body = await res.json().catch(() => ({}))
      if (!body?.accessToken) return false

      auth.setToken(body.accessToken)
      // The old refresh token is now void, so the new one must replace it everywhere
      if (auth.user) {
        auth.setUser({ ...auth.user, refreshToken: body.refreshToken ?? auth.user.refreshToken })
      }
      return true
    } catch {
      return false
    }
  }

  /** The login cannot be renewed: forget it and go to the login page. */
  private endSession() {
    try {
      useAuthStore().clearAuth()
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('auth_user')
    }
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }

  async request<T = any>(url: string, config: RequestConfig = {}, retried = false): Promise<T> {
    // 1. Run Request Interceptors
    let activeConfig = { ...config }
    for (const interceptor of this.requestInterceptors) {
      activeConfig = await interceptor(activeConfig)
    }

    // 2. Query Params
    let finalUrl = this.baseURL ? `${this.baseURL}${url}` : url
    if (activeConfig.params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(activeConfig.params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      }
      const qs = searchParams.toString()
      if (qs) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs
      }
    }

    // 3. Headers & Body
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(activeConfig.headers || {}),
    }

    let body: BodyInit | undefined = undefined
    if (activeConfig.data !== undefined) {
      if (activeConfig.data instanceof FormData) {
        body = activeConfig.data
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(activeConfig.data)
      }
    }

    // 4. Fetch Execution
    const response = await fetch(finalUrl, {
      ...activeConfig,
      headers,
      body,
      credentials: 'include',
    })

    const parsedData = await response.json().catch(() => ({}))

    // The access token expired: the server says "Authentication required". Renew it and repeat the call once.
    // A 401 that means "wrong role" has a different message, so it is not treated as an expired login.
    if (
      response.status === 401 &&
      !retried &&
      !url.startsWith('/api/v1/auth/') &&
      /authentication (is )?required/i.test(String(parsedData?.message || ''))
    ) {
      const hadSession = !!localStorage.getItem('access_token')
      if (hadSession) {
        if (await this.refreshAccessToken()) {
          return this.request<T>(url, config, true)
        }
        this.endSession()
      }
    }

    if (!response.ok) {
      const message = parsedData?.message || parsedData?.error || `HTTP ${response.status}: Request failed`
      const error: any = new Error(message)
      error.status = response.status
      error.data = parsedData
      throw error
    }

    // 5. Run Response Interceptors
    let result = parsedData
    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result)
    }

    return result as T
  }

  get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' })
  }

  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'POST', data })
  }

  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'PUT', data })
  }

  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'PATCH', data })
  }

  delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' })
  }
}

// Empty in dev (Vite proxies /api to localhost:8080); the full backend URL in production builds
export const http = new HttpClient(import.meta.env.VITE_API_BASE_URL ?? '')
