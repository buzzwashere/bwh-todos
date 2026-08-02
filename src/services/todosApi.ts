import type { Todo, TodoInput } from '../types'

/** Returns a fresh Auth0 access token for the current user. */
export type TokenGetter = () => Promise<string>

/**
 * Builds a todos API client bound to an Auth0 token getter. Every request
 * carries the user's bearer token, so the backend scopes results to them.
 */
export function createTodosApi(getToken: TokenGetter) {
  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const res = await fetch(`/api/todos${path}`, {
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

    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  return {
    list: () => request<Todo[]>(''),
    create: (input: TodoInput) =>
      request<Todo>('', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: TodoInput) =>
      request<Todo>(`/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    remove: (id: string) => request<void>(`/${id}`, { method: 'DELETE' }),
  }
}

export type TodosApi = ReturnType<typeof createTodosApi>
