<template>
  <v-layout class="todos-layout">
    <v-app-bar color="primary" title="BWH Todos"></v-app-bar>
    <v-main>
      <div class="todos-content">
        <h2 class="mb-2">My Todo List</h2>
        <div class="todos-toolbar d-flex align-center mb-4 ga-2">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="startCreate" size="small">
            Create New Todo
          </v-btn>
          <v-spacer />
          <v-text-field
            v-model="filterText"
            append-inner-icon="mdi-magnify"
            placeholder="Filter by keyword"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            class="todos-filter"
          />
        </div>

        <v-card v-if="showForm" class="mb-4 pa-4" variant="outlined">
          <div class="text-subtitle-1 mb-2">
            {{ editingId === null ? 'New Todo' : 'Edit Todo' }}
          </div>
          <v-form @submit.prevent="saveTodo">
            <v-text-field
              v-model="form.title"
              label="Title"
              variant="outlined"
              density="compact"
              required
            />
            <v-textarea
              v-model="form.description"
              label="Description"
              variant="outlined"
              density="compact"
              rows="2"
            />
            <v-select
              v-model="form.priority"
              :items="priorities"
              label="Priority"
              variant="outlined"
              density="compact"
            />
            <v-text-field
              v-model="form.dueDate"
              label="Due Date"
              type="date"
              variant="outlined"
              density="compact"
            />
            <v-textarea
              v-model="form.notes"
              label="Notes"
              variant="outlined"
              density="compact"
              rows="2"
            />
            <v-text-field
              v-model="form.keywords"
              label="Keywords"
              hint="Comma-separated"
              persistent-hint
              variant="outlined"
              density="compact"
              class="mb-4"
            />
            <v-select
              v-model="form.frequency"
              :items="frequencies"
              label="Frequency"
              variant="outlined"
              density="compact"
            />
            <v-select
              v-model="form.status"
              :items="statuses"
              label="Status"
              variant="outlined"
              density="compact"
            />
            <template v-if="editingId !== null">
              <v-checkbox
                v-model="form.completed"
                label="Completed"
                density="compact"
                hide-details
                class="mb-2"
              />
              <v-text-field
                v-model="form.completedAt"
                label="Completed Date"
                type="date"
                variant="outlined"
                density="compact"
                :disabled="!form.completed"
              />
            </template>
            <div class="d-flex ga-2 justify-end">
              <v-btn variant="text" @click="cancelForm">Cancel</v-btn>
              <v-btn type="submit" color="primary">
                {{ editingId === null ? 'Add' : 'Save' }}
              </v-btn>
            </div>
          </v-form>
        </v-card>

        <v-list class="todo-list" lines="two">
          <v-list-item
            v-for="todo in sortedTodos"
            :key="todo.id"
            :title="todo.title"
          >
            <template #subtitle>
              <div>{{ todo.description }}</div>
              <div v-if="filterText && hitsFor(todo).length" class="hits-line">
                Hits: {{ hitsFor(todo).join(', ') }}
              </div>
            </template>
            <template #prepend>
              <v-icon v-if="todo.completed" color="green">mdi-check</v-icon>
              <v-icon v-else :color="priorityColor(todo.priority)">mdi-flag</v-icon>
            </template>
            <template #append>
              <div class="todo-item-meta d-flex align-center ga-2">
                <v-chip
                  v-if="todo.status"
                  size="x-small"
                  variant="tonal"
                  :color="statusColor(todo.status)"
                >
                  {{ todo.status }}
                </v-chip>
                <v-chip
                  v-if="['daily', 'monthly', 'annually'].includes(todo.frequency)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ todo.frequency }}
                </v-chip>
                <span v-if="todo.dueDate" class="text-caption text-medium-emphasis">
                  {{ todo.dueDate }}
                </span>
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click="startEdit(todo)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  @click="askDelete(todo)"
                />
              </div>
            </template>
          </v-list-item>
          <v-list-item v-if="todos.length === 0" class="text-medium-emphasis">
            No todos yet.
          </v-list-item>
        </v-list>

        <v-dialog :model-value="pendingDelete !== null" max-width="400" @update:model-value="(v) => { if (!v) cancelDelete() }">
          <v-card>
            <v-card-title>Delete todo?</v-card-title>
            <v-card-text>
              Are you sure you want to delete "{{ pendingDelete?.title }}"?
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="cancelDelete">Cancel</v-btn>
              <v-btn color="red" variant="flat" @click="confirmDelete">Delete</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'

type Frequency = 'daily' | 'monthly' | 'annually' | 'one-time' | 'ongoing' | 'other'
type Status = 'Not started' | 'In Progress' | 'Done'

interface Todo {
  id: number
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
  dueDate: string
  notes: string
  keywords: string
  frequency: Frequency
  status: Status
  createdAt: string
  completed: boolean
  completedAt: string
}

const STORAGE_KEY = 'bwh-todos.todos'
const priorities = ['Low', 'Medium', 'High'] as const
const frequencies: Frequency[] = ['daily', 'monthly', 'annually', 'one-time', 'ongoing', 'other']
const statuses: Status[] = ['Not started', 'In Progress', 'Done']

const todos = ref<Todo[]>([])
const showForm = ref(false)
const editingId = ref<number | null>(null)
const filterText = ref('')

const priorityRank: Record<Todo['priority'], number> = { High: 0, Medium: 1, Low: 2 }

type FilterToken =
  | { type: 'priority'; value: string }
  | { type: 'frequency'; value: string }
  | { type: 'keyword'; value: string }

const filterTokens = computed<FilterToken[]>(() =>
  (filterText.value ?? '')
    .split(',')
    .map((raw): FilterToken | null => {
      const t = raw.trim().toLowerCase()
      if (!t) return null
      if (t.startsWith('priority:')) {
        const value = t.slice('priority:'.length).trim()
        return value ? { type: 'priority', value } : null
      }
      if (t.startsWith('frequency:')) {
        const value = t.slice('frequency:'.length).trim()
        return value ? { type: 'frequency', value } : null
      }
      return { type: 'keyword', value: t }
    })
    .filter((t): t is FilterToken => t !== null)
)

function matchesToken(todo: Todo, tok: FilterToken): boolean {
  if (tok.type === 'priority') return todo.priority.toLowerCase() === tok.value
  if (tok.type === 'frequency') return todo.frequency.toLowerCase() === tok.value
  return (todo.keywords ?? '').toLowerCase().includes(tok.value)
}

const sortedTodos = computed(() => {
  const tokens = filterTokens.value
  const filtered = tokens.length
    ? todos.value.filter(t => tokens.some(tok => matchesToken(t, tok)))
    : todos.value
  return [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    const aDue = a.dueDate || '￿'
    const bDue = b.dueDate || '￿'
    const dueCmp = aDue.localeCompare(bDue)
    if (dueCmp !== 0) return dueCmp
    return priorityRank[a.priority] - priorityRank[b.priority]
  })
})

const emptyForm = (): Omit<Todo, 'id' | 'createdAt'> => ({
  title: '',
  description: '',
  priority: 'Medium',
  dueDate: '',
  notes: '',
  keywords: '',
  frequency: 'one-time',
  status: 'Not started',
  completed: false,
  completedAt: '',
})

const form = reactive(emptyForm())

onMounted(() => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      todos.value = JSON.parse(raw)
    } catch {
      todos.value = []
    }
  }
})

watch(todos, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

function startCreate() {
  Object.assign(form, emptyForm())
  editingId.value = null
  showForm.value = true
}

function startEdit(todo: Todo) {
  form.title = todo.title
  form.description = todo.description
  form.priority = todo.priority
  form.dueDate = todo.dueDate
  form.notes = todo.notes
  form.keywords = todo.keywords ?? ''
  form.frequency = todo.frequency ?? 'one-time'
  form.status = todo.status ?? 'Not started'
  form.completed = todo.completed
  form.completedAt = todo.completedAt
  editingId.value = todo.id
  showForm.value = true
}

function saveTodo() {
  if (!form.title.trim()) return
  if (editingId.value === null) {
    todos.value.push({
      id: Date.now(),
      ...form,
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: '',
    })
  } else {
    const existing = todos.value.find(t => t.id === editingId.value)
    if (existing) {
      existing.title = form.title
      existing.description = form.description
      existing.priority = form.priority
      existing.dueDate = form.dueDate
      existing.notes = form.notes
      existing.keywords = form.keywords
      existing.frequency = form.frequency
      existing.status = form.status
      existing.completed = form.completed
      existing.completedAt = form.completed ? form.completedAt : ''
    }
  }
  Object.assign(form, emptyForm())
  editingId.value = null
  showForm.value = false
}

function cancelForm() {
  Object.assign(form, emptyForm())
  editingId.value = null
  showForm.value = false
}

const pendingDelete = ref<Todo | null>(null)

function askDelete(todo: Todo) {
  pendingDelete.value = todo
}

function confirmDelete() {
  if (pendingDelete.value) {
    const id = pendingDelete.value.id
    todos.value = todos.value.filter(t => t.id !== id)
  }
  pendingDelete.value = null
}

function cancelDelete() {
  pendingDelete.value = null
}

function priorityColor(p: Todo['priority']) {
  return p === 'High' ? 'red' : p === 'Medium' ? 'orange' : 'grey'
}

function statusColor(s: Status) {
  return s === 'Done' ? 'green' : s === 'In Progress' ? 'blue' : 'grey'
}

function hitsFor(todo: Todo): string[] {
  const tokens = filterTokens.value
  if (!tokens.length) return []

  const hits: string[] = []

  const priorityMatched = tokens.some(
    t => t.type === 'priority' && todo.priority.toLowerCase() === t.value
  )
  if (priorityMatched) hits.push(`priority:${todo.priority}`)

  const keywordTokens = tokens.filter(t => t.type === 'keyword').map(t => t.value)
  if (keywordTokens.length) {
    const keywordHits = (todo.keywords ?? '')
      .split(',')
      .map(k => k.trim())
      .filter(k => {
        if (!k) return false
        const low = k.toLowerCase()
        return keywordTokens.some(tok => low.includes(tok))
      })
    hits.push(...keywordHits)
  }

  return hits
}
</script>

<style scoped>
.todos-layout {
  min-height: 100vh;
}

.todos-content {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.hits-line {
  font-style: italic;
  color: #1976d2;
}

.todo-list :deep(.v-list-item-subtitle) {
  -webkit-line-clamp: unset;
  line-clamp: unset;
  display: block;
  white-space: normal;
}

.todos-filter {
  max-width: 260px;
}

@media (max-width: 600px) {
  .todos-content {
    padding: 1rem;
  }

  .todos-toolbar {
    flex-wrap: wrap;
  }

  .todos-filter {
    max-width: 100%;
    flex: 1 1 100%;
  }

  .todo-list :deep(.v-list-item) {
    display: flex !important;
    flex-wrap: wrap;
    align-items: flex-start;
    padding-block: 12px;
  }

  .todo-list :deep(.v-list-item__content) {
    display: contents;
  }

  .todo-list :deep(.v-list-item__prepend) {
    order: 1;
  }

  .todo-list :deep(.v-list-item-title) {
    order: 2;
    flex: 1 1 auto;
    min-width: 0;
    white-space: normal;
  }

  .todo-list :deep(.v-list-item__append) {
    order: 3;
    flex: 0 0 100%;
    margin-inline-start: 56px;
    margin-inline-end: 0;
    padding-top: 0;
    margin-top: -4px;
  }

  .todo-list :deep(.v-list-item-subtitle) {
    order: 4;
    flex: 0 0 100%;
    margin-inline-start: 56px;
    padding-top: 0;
    margin-top: -4px;
  }

  .todo-item-meta {
    flex-wrap: wrap;
    justify-content: flex-start;
    row-gap: 4px;
  }
}
</style>
