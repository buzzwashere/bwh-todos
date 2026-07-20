import { createRouter, createWebHistory } from 'vue-router'
import Todos from '../components/Todos.vue'

const routes = [
  {
    path: '/',
    name: 'todos',
    component: Todos,
    meta: {
      title: 'Todos',
      description: 'Manage your todos'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
