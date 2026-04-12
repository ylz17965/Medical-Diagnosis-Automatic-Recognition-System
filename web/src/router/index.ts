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
      path: '/user-test',
      name: 'UserTest',
      component: () => import('@/views/UserTest.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/lung-cancer',
      name: 'LungCancerScreening',
      component: () => import('@/views/LungCancerScreening.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/hypertension',
      name: 'HypertensionManagement',
      component: () => import('@/views/HypertensionManagement.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/digital-twin',
      name: 'DigitalTwin',
      component: () => import('@/views/DigitalTwin.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/lung-ct',
      name: 'LungCTView',
      component: () => import('@/views/LungCTView.vue'),
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
