export type Frequency = 'daily' | 'monthly' | 'annually' | 'one-time' | 'ongoing' | 'other'
export type Status = 'Not started' | 'In Progress' | 'Done'
export type Priority = 'Low' | 'Medium' | 'High'

export interface Todo {
  id: string
  title: string
  description: string
  priority: Priority
  dueDate: string
  notes: string
  keywords: string
  frequency: Frequency
  status: Status
  createdAt: string
  completed: boolean
  completedAt: string
}

/** The editable fields sent to the API when creating or updating a todo. */
export type TodoInput = Omit<Todo, 'id' | 'createdAt'>
