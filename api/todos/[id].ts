import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireUserId, UnauthorizedError } from '../_auth.js'
import { sql, mapRow } from '../_db.js'
import { parseTodoInput } from '../_todos.js'

// PUT    /api/todos/:id  -> replace the fields of one of the user's todos
// DELETE /api/todos/:id  -> delete one of the user's todos
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let userId: string
  try {
    userId = await requireUserId(req)
  } catch (err) {
    if (err instanceof UnauthorizedError) return res.status(401).json({ error: err.message })
    throw err
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  if (!id) return res.status(400).json({ error: 'Missing id' })

  try {
    if (req.method === 'PUT') {
      const input = parseTodoInput(req.body)
      if (!input.title) return res.status(400).json({ error: 'Title is required' })

      // The `and user_id` clause guarantees a user can only touch their own rows.
      const rows = await sql`
        update todos set
          title = ${input.title},
          description = ${input.description},
          priority = ${input.priority},
          due_date = ${input.dueDate},
          notes = ${input.notes},
          keywords = ${input.keywords},
          frequency = ${input.frequency},
          status = ${input.status},
          completed = ${input.completed},
          completed_at = ${input.completedAt},
          updated_at = now()
        where id = ${id} and user_id = ${userId}
        returning *
      `
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
      return res.status(200).json(mapRow(rows[0]))
    }

    if (req.method === 'DELETE') {
      const rows = await sql`
        delete from todos
        where id = ${id} and user_id = ${userId}
        returning id
      `
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
      return res.status(204).end()
    }

    res.setHeader('Allow', 'PUT, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[/api/todos/:id] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
