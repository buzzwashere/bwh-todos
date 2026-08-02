import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireUserId, UnauthorizedError } from '../_auth.js'
import { sql, mapRow } from '../_db.js'
import { parseTodoInput } from '../_todos.js'

// GET  /api/todos        -> list the signed-in user's todos
// POST /api/todos        -> create a todo for the signed-in user
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
        select * from todos
        where user_id = ${userId}
        order by created_at asc
      `
      return res.status(200).json(rows.map(mapRow))
    }

    if (req.method === 'POST') {
      const input = parseTodoInput(req.body)
      if (!input.title) return res.status(400).json({ error: 'Title is required' })

      const rows = await sql`
        insert into todos (
          user_id, title, description, priority, due_date, notes,
          keywords, frequency, status, completed, completed_at
        ) values (
          ${userId}, ${input.title}, ${input.description}, ${input.priority},
          ${input.dueDate}, ${input.notes}, ${input.keywords}, ${input.frequency},
          ${input.status}, ${input.completed}, ${input.completedAt}
        )
        returning *
      `
      return res.status(201).json(mapRow(rows[0]))
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('[/api/todos] error', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
