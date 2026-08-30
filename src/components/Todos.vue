<template>
  <div class="todos-content">
    <!-- One-time migration of todos saved in this browser before cloud sync. -->
    <v-alert
      v-if="legacyTodos.length"
      type="info"
      variant="tonal"
      class="mb-4"
      border="start"
    >
      <div class="d-flex align-center flex-wrap ga-2">
        <span>
          Found {{ legacyTodos.length }} todo{{ legacyTodos.length === 1 ? '' : 's' }}
          saved on this device. Import them to your account?
        </span>
        <v-spacer />
        <v-btn size="small" variant="text" @click="dismissLegacy">Not now</v-btn>
        <v-btn size="small" color="primary" :loading="saving" @click="importLegacy">
          Import
        </v-btn>
      </div>
    </v-alert>

    <div class="todos-toolbar d-flex align-center mb-4 ga-2">
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        size="small"
        :disabled="loading"
        @click="startCreate"
      >
        New Todo
      </v-btn>
      <v-spacer />
      <v-text-field
        v-model="filterText"
        append-inner-icon="mdi-magnify"
        placeholder="Filter by title or keyword"
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
          <v-btn variant="text" :disabled="saving" @click="cancelForm">Cancel</v-btn>
          <v-btn type="submit" color="primary" :loading="saving">
            {{ editingId === null ? 'Add' : 'Save' }}
          </v-btn>
        </div>
      </v-form>
    </v-card>

    <div v-if="loading" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-list v-else class="todo-list" lines="two">
      <v-list-item v-for="todo in sortedTodos" :key="todo.id" :title="todo.title">
        <template #subtitle>
          <div>{{ todo.description }}</div>
          <div v-if="filterText && hitsFor(todo).length" class="hits-line">
            Hits: {{ hitsFor(todo).join(', ') }}
          </div>
        </template>
        <template #prepend>
          <v-icon v-if="todo.completed" color="success">mdi-check</v-icon>
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
              v-if="showFrequencyChip(todo)"
              size="x-small"
              variant="tonal"
            >
              {{ todo.frequency }}
            </v-chip>
            <span v-if="todo.dueDate" class="text-caption text-medium-emphasis">
              {{ todo.dueDate }}
            </span>
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="startEdit(todo)" />
            <v-btn icon="mdi-delete" variant="text" size="small" @click="askDelete(todo)" />
          </div>
        </template>
      </v-list-item>
      <v-list-item v-if="todos.length === 0" class="text-medium-emphasis">
        No todos yet.
      </v-list-item>
    </v-list>

    <v-dialog
      :model-value="pendingDelete !== null"
      max-width="400"
      @update:model-value="(v) => { if (!v) cancelDelete() }"
    >
      <v-card>
        <v-card-title>Delete todo?</v-card-title>
        <v-card-text>
          Are you sure you want to delete "{{ pendingDelete?.title }}"?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelDelete">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="showError" color="error" timeout="5000">
      {{ errorMsg }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">Dismiss</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted, onUnmounted } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import type { Todo, TodoInput, Frequency, Status, Priority } from '../types'
import { createTodosApi } from '../services/todosApi'
import { todoSettingsKey, type SortBy } from '../todoSettings'

const LEGACY_KEY = 'bwh-todos.todos'
const priorities: Priority[] = ['Low', 'Medium', 'High']
const frequencies: Frequency[] = ['daily', 'monthly', 'annually', 'one-time', 'ongoing', 'other']
const statuses: Status[] = ['Not started', 'In Progress', 'Done']

const { getAccessTokenSilently } = useAuth0()
const api = createTodosApi(() => getAccessTokenSilently())

const todos = ref<Todo[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMsg = ref('')
const showError = ref(false)
const legacyTodos = ref<TodoInput[]>([])

const showForm = ref(false)
const editingId = ref<string | null>(null)
const filterText = ref('')

const priorityRank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }

// Provided by App.vue's settings menu. The defaults keep this component usable on its
// own — mounted outside that provider it simply behaves as it did before the menu.
const { sortBy, showCompleted } = inject(todoSettingsKey, {
  sortBy: ref<SortBy>('Date'),
  showCompleted: ref(true),
})

function fail(err: unknown, fallback: string) {
  errorMsg.value = err instanceof Error ? err.message : fallback
  showError.value = true
}

// --- data loading + realtime polling --------------------------------------

const POLL_INTERVAL_MS = 5000
let pollTimer: ReturnType<typeof setInterval> | undefined
let polling = false

onMounted(() => {
  loadTodos()
  pollTimer = setInterval(pollTodos, POLL_INTERVAL_MS)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

async function loadTodos() {
  loading.value = true
  try {
    todos.value = await api.list()
    if (todos.value.length === 0) detectLegacy()
  } catch (err) {
    fail(err, 'Failed to load todos')
  } finally {
    loading.value = false
  }
}

// A stable signature of the list, so a poll only re-renders when data changed.
// Every todo is built by the same mapper, so key order is consistent.
function signature(list: Todo[]): string {
  return JSON.stringify(list)
}

// Quietly re-fetch so changes made on another device appear without a refresh.
async function pollTodos() {
  // Skip while a mutation is in flight (don't clobber optimistic state),
  // while a poll is already running, or when the tab is in the background.
  if (saving.value || polling || document.visibilityState === 'hidden') return
  polling = true
  try {
    const fresh = await api.list()
    if (saving.value) return // a save started mid-request — let it win
    if (signature(fresh) !== signature(todos.value)) {
      todos.value = fresh
    }
  } catch {
    // Transient network errors during polling are non-fatal; keep current list.
  } finally {
    polling = false
  }
}

function onVisibilityChange() {
  // Catch up immediately when the user returns to the tab.
  if (document.visibilityState === 'visible') pollTodos()
}

// --- legacy (localStorage) migration --------------------------------------

function detectLegacy() {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length) {
      legacyTodos.value = parsed.map(toInput)
    }
  } catch {
    /* corrupt local data — ignore */
  }
}

async function importLegacy() {
  saving.value = true
  try {
    for (const input of legacyTodos.value) {
      await api.create(input)
    }
    localStorage.removeItem(LEGACY_KEY)
    legacyTodos.value = []
    await loadTodos()
  } catch (err) {
    fail(err, 'Failed to import todos')
  } finally {
    saving.value = false
  }
}

function dismissLegacy() {
  // Keep the local copy intact so nothing is lost; just hide the banner.
  legacyTodos.value = []
}

// --- filtering / sorting --------------------------------------------------

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
    .filter((t): t is FilterToken => t !== null),
)

function matchesToken(todo: Todo, tok: FilterToken): boolean {
  if (tok.type === 'priority') return todo.priority.toLowerCase() === tok.value
  if (tok.type === 'frequency') return todo.frequency.toLowerCase() === tok.value
  // Keyword tokens match against the todo's title as well as its keywords.
  return (
    (todo.title ?? '').toLowerCase().includes(tok.value) ||
    (todo.keywords ?? '').toLowerCase().includes(tok.value)
  )
}

// A todo with no due date sorts last: '￿' is above every digit, so an empty date
// compares greater than any real one.
const byDueDate = (a: Todo, b: Todo) => (a.dueDate || '￿').localeCompare(b.dueDate || '￿')
const byPriority = (a: Todo, b: Todo) => priorityRank[a.priority] - priorityRank[b.priority]

// Frequency has no natural ordering, so it follows the order the options are declared
// in — shortest cadence first, then the non-recurring ones — rather than alphabetical,
// which would read as annually, daily, monthly.
const frequencyRank: Record<string, number> = Object.fromEntries(frequencies.map((f, i) => [f, i]))
const byFrequency = (a: Todo, b: Todo) =>
  (frequencyRank[a.frequency] ?? frequencies.length) - (frequencyRank[b.frequency] ?? frequencies.length)

const comparators: Record<SortBy, (a: Todo, b: Todo) => number> = {
  Priority: byPriority,
  Date: byDueDate,
  Frequency: byFrequency,
}

// Applied after the chosen key, so rows that tie on it still land in a stable order.
const TIEBREAK_ORDER: SortBy[] = ['Date', 'Priority', 'Frequency']

const sortedTodos = computed(() => {
  const tokens = filterTokens.value
  let filtered = tokens.length
    ? todos.value.filter((t) => tokens.some((tok) => matchesToken(t, tok)))
    : todos.value
  if (!showCompleted.value) {
    filtered = filtered.filter((t) => !t.completed)
  }
  // Completed todos always sink to the bottom; the setting only chooses which key
  // leads above that, with the rest breaking ties.
  const keys = [sortBy.value, ...TIEBREAK_ORDER.filter((k) => k !== sortBy.value)]
  return [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    for (const key of keys) {
      const cmp = comparators[key](a, b)
      if (cmp !== 0) return cmp
    }
    return 0
  })
})

// The recurring cadences are always worth a chip; sorting by frequency puts one on
// every row, so the order the list is in is visible on the rows themselves.
const RECURRING_FREQUENCIES: Frequency[] = ['daily', 'monthly', 'annually']

function showFrequencyChip(todo: Todo): boolean {
  if (!todo.frequency) {
    return false
  }
  return sortBy.value === 'Frequency' || RECURRING_FREQUENCIES.includes(todo.frequency)
}

// --- form state -----------------------------------------------------------

const emptyForm = (): TodoInput => ({
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

const form = reactive<TodoInput>(emptyForm())

/** Normalize an unknown object (legacy row / form) into a safe TodoInput. */
function toInput(src: Partial<Todo>): TodoInput {
  const base = emptyForm()
  return {
    ...base,
    ...src,
    title: (src.title ?? '').toString(),
    completed: Boolean(src.completed),
    completedAt: src.completed ? (src.completedAt ?? '') : '',
  }
}

function formToInput(): TodoInput {
  return toInput({ ...form })
}

function startCreate() {
  Object.assign(form, emptyForm())
  editingId.value = null
  showForm.value = true
}

function startEdit(todo: Todo) {
  Object.assign(form, {
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    dueDate: todo.dueDate,
    notes: todo.notes,
    keywords: todo.keywords ?? '',
    frequency: todo.frequency ?? 'one-time',
    status: todo.status ?? 'Not started',
    completed: todo.completed,
    completedAt: todo.completedAt,
  })
  editingId.value = todo.id
  showForm.value = true
}

async function saveTodo() {
  if (!form.title.trim()) return
  saving.value = true
  try {
    const input = formToInput()
    if (editingId.value === null) {
      const created = await api.create(input)
      todos.value.push(created)
    } else {
      const updated = await api.update(editingId.value, input)
      const idx = todos.value.findIndex((t) => t.id === editingId.value)
      if (idx !== -1) todos.value[idx] = updated
    }
    cancelForm()
  } catch (err) {
    fail(err, 'Failed to save todo')
  } finally {
    saving.value = false
  }
}

function cancelForm() {
  Object.assign(form, emptyForm())
  editingId.value = null
  showForm.value = false
}

// --- delete ---------------------------------------------------------------

const pendingDelete = ref<Todo | null>(null)

function askDelete(todo: Todo) {
  pendingDelete.value = todo
}

async function confirmDelete() {
  const todo = pendingDelete.value
  pendingDelete.value = null
  if (!todo) return
  try {
    await api.remove(todo.id)
    todos.value = todos.value.filter((t) => t.id !== todo.id)
  } catch (err) {
    fail(err, 'Failed to delete todo')
  }
}

function cancelDelete() {
  pendingDelete.value = null
}

// --- display helpers ------------------------------------------------------

function priorityColor(p: Priority) {
  return p === 'High' ? 'error' : p === 'Medium' ? 'warning' : 'grey'
}

function statusColor(s: Status) {
  return s === 'Done' ? 'success' : s === 'In Progress' ? 'info' : 'grey'
}

function hitsFor(todo: Todo): string[] {
  const tokens = filterTokens.value
  if (!tokens.length) return []

  const hits: string[] = []

  const priorityMatched = tokens.some(
    (t) => t.type === 'priority' && todo.priority.toLowerCase() === t.value,
  )
  if (priorityMatched) hits.push(`priority:${todo.priority}`)

  const keywordTokens = tokens.filter((t) => t.type === 'keyword').map((t) => t.value)
  if (keywordTokens.length) {
    const title = (todo.title ?? '').toLowerCase()
    if (keywordTokens.some((tok) => title.includes(tok))) hits.push('title')
    const keywordHits = (todo.keywords ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter((k) => {
        if (!k) return false
        const low = k.toLowerCase()
        return keywordTokens.some((tok) => low.includes(tok))
      })
    hits.push(...keywordHits)
  }

  return hits
}
</script>

<style scoped>
.todos-content {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.hits-line {
  font-style: italic;
  color: var(--bwh-accent);
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

  /* Keep the button and the filter on one row; the filter gives up the width. */
  .todos-toolbar {
    flex-wrap: nowrap;
  }

  /* The spacer would take half the leftover width, which the filter needs here. */
  .todos-toolbar .v-spacer {
    display: none;
  }

  .todos-toolbar .v-btn {
    flex: 0 0 auto;
  }

  /* min-width: 0 is what lets a flex item shrink past its content width — without
     it the field keeps its intrinsic size and pushes itself onto the next row. */
  .todos-filter {
    flex: 1 1 auto;
    min-width: 0;
    max-width: 100%;
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
