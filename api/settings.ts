import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireUserId, UnauthorizedError } from './_auth.js'
import { sql } from './_db.js'

const SORT_OPTIONS = ['Priority', 'Date', 'Frequency']

interface SettingsDto {
  sortBy: string
  showCompleted: boolean
}

// What a user who has never opened the settings menu gets back.
const DEFAULTS: SettingsDto = {
  sortBy: 'Priority',
  showCompleted: true,
}

/** Coerce and whitelist an untrusted body, the way `parseTodoInput` does for todos. */
function parseSettings(body: unknown): SettingsDto {
  const b = (body ?? {}) as Record<string, unknown>
  return {
    sortBy:
      typeof b.sortBy === 'string' && SORT_OPTIONS.includes(b.sortBy) ? b.sortBy : DEFAULTS.sortBy,
    showCompleted: typeof b.showCompleted === 'boolean' ? b.showCompleted : DEFAULTS.showCompleted,
  }
}

function mapRow(row: Record<string, unknown>): SettingsDto {
  return {
    sortBy: (row.sort_by as string) ?? DEFAULTS.sortBy,
    showCompleted: Boolean(row.show_completed),
  }
}

// GET /api/settings -> the signed-in user's display preferences
// PUT /api/settings -> replace them (creating the row on first save)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let userId: string
  try {
    userId = await requireUserId(req)
  } catch (err) {
    if (err instanceof UnauthorizedError) return res.status(401).json({ error: err.message })
    throw err
  }

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        select * from user_settings
        where user_id = ${userId}
      `
      // No row yet is the normal first-visit case, not an error.
      return res.status(200).json(rows[0] ? mapRow(rows[0]) : DEFAULTS)
    }

    if (req.method === 'PUT') {
      const input = parseSettings(req.body)
      const rows = await sql`
        insert into user_settings (user_id, sort_by, show_completed)
        values (${userId}, ${input.sortBy}, ${input.showCompleted})
        on conflict (user_id) do update set
          sort_by = excluded.sort_by,
          show_completed = excluded.show_completed,
          updated_at = now()
        returning *
      `
      return res.status(200).json(mapRow(rows[0]))
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[/api/settings] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
