import type { StoredSettings } from '../todoSettings'
import type { TokenGetter } from './todosApi'

/**
 * Builds a settings API client bound to an Auth0 token getter, mirroring
 * `createTodosApi`. Every request carries the user's bearer token, so the backend
 * scopes the row to them.
 */
export function createSettingsApi(getToken: TokenGetter) {
  async function request<T>(options: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const res = await fetch('/api/settings', {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    })

    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try {
        const body = await res.json()
        if (body?.error) message = body.error
      } catch {
        /* non-JSON error body — keep the status message */
      }
      throw new Error(message)
    }

    return (await res.json()) as T
  }

  return {
    get: () => request<StoredSettings>(),
    save: (settings: StoredSettings) =>
      request<StoredSettings>({ method: 'PUT', body: JSON.stringify(settings) }),
  }
}

export type SettingsApi = ReturnType<typeof createSettingsApi>
