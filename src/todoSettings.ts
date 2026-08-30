import type { InjectionKey, Ref } from 'vue'

// Settings owned by the app-bar menu in App.vue and read by the list in Todos.vue.
// The refs are passed through as-is rather than copied, so the list re-sorts the
// moment the menu changes.

export type SortBy = 'Priority' | 'Date' | 'Frequency'

export const SORT_OPTIONS: SortBy[] = ['Priority', 'Date', 'Frequency']

export interface TodoSettings {
  sortBy: Ref<SortBy>
  showCompleted: Ref<boolean>
}

export const todoSettingsKey: InjectionKey<TodoSettings> = Symbol('todoSettings')

// Persisted per browser, alongside the `bwh-todos.` keys the legacy todo import uses.
// These are display preferences, not data, so they deliberately stay local rather than
// syncing with the account.
const STORAGE_KEY = 'bwh-todos.settings'

export interface StoredSettings {
  sortBy: SortBy
  showCompleted: boolean
}

export const DEFAULT_SETTINGS: StoredSettings = {
  sortBy: 'Priority',
  showCompleted: true,
}

// Every stored field is re-validated rather than trusted: the value survives app
// versions, and a stale or hand-edited entry must not be able to break sorting.
export function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_SETTINGS }
    }
    const parsed = JSON.parse(raw)
    return {
      sortBy: SORT_OPTIONS.includes(parsed?.sortBy) ? parsed.sortBy : DEFAULT_SETTINGS.sortBy,
      showCompleted:
        typeof parsed?.showCompleted === 'boolean' ? parsed.showCompleted : DEFAULT_SETTINGS.showCompleted,
    }
  } catch {
    // Unreadable or unparseable — fall back rather than starting with a broken menu.
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable (private windows, blocked site data). Losing the
    // preference is acceptable; throwing out of a watcher is not.
  }
}
