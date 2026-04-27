import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'Chat',
      component: () => import('@/views/Chat.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/Profile.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/lung-ct',
      name: 'LungCTView',
      component: () => import('@/views/LungCTView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/knowledge',
      name: 'Knowledge',
      component: () => import('@/views/KnowledgeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    if (to.path !== '/lung-ct') {
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else {
      next({ name: 'Login', query: { redirect: '/' } })
    }
  } else if (to.name === 'Login' && userStore.isLoggedIn) {
    next({ name: 'Chat' })
  } else {
    next()
  }
})

export default router
