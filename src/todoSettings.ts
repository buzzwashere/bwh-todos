import type { InjectionKey, Ref } from 'vue'

// Settings owned by the app-bar menu in App.vue and read by the list in Todos.vue.
// The refs are passed through as-is rather than copied, so the list re-sorts the
// moment the menu changes.

export type SortBy = 'Priority' | 'Date'

export const SORT_OPTIONS: SortBy[] = ['Priority', 'Date']

export interface TodoSettings {
  sortBy: Ref<SortBy>
  showCompleted: Ref<boolean>
}

export const todoSettingsKey: InjectionKey<TodoSettings> = Symbol('todoSettings')
