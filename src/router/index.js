import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'HomeView',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      showSidebar: false
    }
  },
  {
    path: '/projects',
    name: 'ProjectsView',
    component: () => import('@/views/ProjectsView.vue')
  },
  {
    path: '/projects/:projectId',
    name: 'ExperimentsView',
    component: () => import('@/views/ExperimentsView.vue'),
    meta: {
      showSidebar: false
    },
  },
  {
    path: '/projects/:projectId/experiments/:experimentId',
    name: 'ExperimentDetails',
    component: () => import('@/views/ExperimentDetails.vue'),
    meta: {
      showSidebar: false
    },
    props: true 
  },
  {
    path: '/experiments',
    redirect: '/projects'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

export default router