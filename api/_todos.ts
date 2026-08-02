// Shared validation for todo request bodies. Files prefixed with `_` are
// treated as helpers by Vercel, not routable endpoints.

const PRIORITIES = ['Low', 'Medium', 'High']
const FREQUENCIES = ['daily', 'monthly', 'annually', 'one-time', 'ongoing', 'other']
const STATUSES = ['Not started', 'In Progress', 'Done']

export interface TodoInput {
  title: string
  description: string
  priority: string
  dueDate: string
  notes: string
  keywords: string
  frequency: string
  status: string
  completed: boolean
  completedAt: string
}

const asString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : fallback

const oneOf = (v: unknown, allowed: string[], fallback: string): string =>
  typeof v === 'string' && allowed.includes(v) ? v : fallback

/**
 * Coerce and whitelist an untrusted request body into a safe TodoInput.
 * Unknown enum values fall back to defaults; unexpected fields are dropped.
 */
export function parseTodoInput(body: unknown): TodoInput {
  const b = (body ?? {}) as Record<string, unknown>
  const completed = Boolean(b.completed)
  return {
    title: asString(b.title).trim(),
    description: asString(b.description),
    priority: oneOf(b.priority, PRIORITIES, 'Medium'),
    dueDate: asString(b.dueDate),
    notes: asString(b.notes),
    keywords: asString(b.keywords),
    frequency: oneOf(b.frequency, FREQUENCIES, 'one-time'),
    status: oneOf(b.status, STATUSES, 'Not started'),
    completed,
    // Only keep a completion date when the todo is actually completed.
    completedAt: completed ? asString(b.completedAt) : '',
  }
}
