import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

// Neon's serverless driver runs SQL over HTTP — no connection pool to manage,
// which is exactly what short-lived Vercel functions want.
export const sql = neon(process.env.DATABASE_URL)

/** A todo as returned to the client (camelCase, matches the Vue app's Todo type). */
export interface TodoDto {
  id: string
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
  createdAt: string
}

/** Map a raw snake_case DB row to the camelCase shape the frontend expects. */
export function mapRow(row: Record<string, unknown>): TodoDto {
  return {
    id: String(row.id),
    title: (row.title as string) ?? '',
    description: (row.description as string) ?? '',
    priority: (row.priority as string) ?? 'Medium',
    dueDate: (row.due_date as string) ?? '',
    notes: (row.notes as string) ?? '',
    keywords: (row.keywords as string) ?? '',
    frequency: (row.frequency as string) ?? 'one-time',
    status: (row.status as string) ?? 'Not started',
    completed: Boolean(row.completed),
    completedAt: (row.completed_at as string) ?? '',
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? ''),
  }
}
