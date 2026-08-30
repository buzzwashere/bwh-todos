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

// Persisted per account through /api/settings, the same Neon-backed path the todos
// themselves take — so a preference set on one device shows up on the next.
export interface StoredSettings {
  sortBy: SortBy
  showCompleted: boolean
}

export const DEFAULT_SETTINGS: StoredSettings = {
  sortBy: 'Priority',
  showCompleted: true,
}

// Nothing coming back over the wire is trusted: the row outlives app versions, so a
// stale or hand-edited value must not be able to break sorting.
export function normalizeSettings(value: unknown): StoredSettings {
  const v = (value ?? {}) as Record<string, unknown>
  return {
    sortBy: SORT_OPTIONS.includes(v.sortBy as SortBy) ? (v.sortBy as SortBy) : DEFAULT_SETTINGS.sortBy,
    showCompleted:
      typeof v.showCompleted === 'boolean' ? v.showCompleted : DEFAULT_SETTINGS.showCompleted,
  }
}
