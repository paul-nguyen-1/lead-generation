const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface AuthHooks {
  getAccessToken: () => string | null
  refreshAccessToken: () => Promise<string | null>
  logout: () => void
}

let authHooks: AuthHooks = {
  getAccessToken: () => null,
  refreshAccessToken: async () => null,
  logout: () => {},
}

export function configureApi(hooks: AuthHooks) {
  authHooks = hooks
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean
  body?: unknown
}

async function parseErrorMessage(response: Response): Promise<string> {
  const data = await response.json().catch(() => null)
  const message = (data as { message?: string | Array<string> } | null)
    ?.message
  if (Array.isArray(message)) return message.join(', ')
  return message ?? response.statusText
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
  _isRetry = false,
): Promise<T> {
  const { auth = true, headers, body, ...rest } = options
  const finalHeaders = new Headers(headers)

  if (auth) {
    const token = authHooks.getAccessToken()
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  let finalBody: BodyInit | undefined
  if (body !== undefined) {
    finalBody = JSON.stringify(body)
    if (!finalHeaders.has('Content-Type')) {
      finalHeaders.set('Content-Type', 'application/json')
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
  })

  if (response.status === 401 && auth) {
    if (!_isRetry) {
      const newToken = await authHooks.refreshAccessToken()
      if (newToken) {
        return apiFetch<T>(path, options, true)
      }
    }
    authHooks.logout()
    throw new ApiError(401, await parseErrorMessage(response))
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
