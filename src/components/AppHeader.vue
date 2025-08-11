<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useMobileMenu } from '@/composables/useMobileMenu'
import '@/assets/styles/components/AppHeader.css'

const route = useRoute()
const { 
  isMobile, 
  isMainSidebarOpen, 
  isExperimentsSidebarOpen,
  toggleMainSidebar,
  toggleExperimentsSidebar 
} = useMobileMenu()

const showHeader = computed(() => route.name !== 'HomeView')

const showBurger = computed(() => {
  if (!isMobile.value) return false
  return ['ProjectsView', 'ExperimentsView'].includes(route.name)
})

const showMobileNav = computed(() => {
  return isMobile.value && route.name === 'ExperimentsView'
})

const showDesktopNav = computed(() => !isMobile.value)

const isExperimentsPage = computed(() => route.name === 'ExperimentsView')

const toggleSidebar = () => {
  if (isExperimentsPage.value) {
    toggleExperimentsSidebar()
  } else {
    toggleMainSidebar()
  }
}

const isSidebarOpen = computed(() => {
  if (isExperimentsPage.value) {
    return isExperimentsSidebarOpen.value
  }
  return isMainSidebarOpen.value
})

const isActiveRoute = (routeName) => {
  return route.name === routeName
}
</script>

<template>
  <div v-if="showHeader">
    <header class="app-header">
      <button 
        v-if="showBurger"
        class="burger-button"
        @click="toggleSidebar"
        :aria-label="isSidebarOpen ? 'Close menu' : 'Open menu'"
      >
        <i :class="isSidebarOpen ? 'pi pi-times' : 'pi pi-bars'"></i>
      </button>
      
      <h1>Experiments Viewer</h1>
      
      <nav v-if="showDesktopNav" class="header-nav">
        <router-link 
          to="/" 
          :class="{ 'active': isActiveRoute('HomeView') }"
        >Home</router-link>
        <router-link 
          to="/projects" 
          :class="{ 'active': isActiveRoute('ProjectsView') }"
        >Projects</router-link>
        <router-link 
          to="/settings" 
          :class="{ 'active': isActiveRoute('SettingsView') }"
        >Settings</router-link>
      </nav>
    </header>
    
    <nav v-if="showMobileNav" class="mobile-nav">
      <router-link 
        to="/" 
        :class="{ 'active': isActiveRoute('HomeView') }"
      >Home</router-link>
      <router-link 
        to="/projects" 
        :class="{ 'active': isActiveRoute('ProjectsView') }"
      >Projects</router-link>
      <router-link 
        to="/settings" 
        :class="{ 'active': isActiveRoute('SettingsView') }"
      >Settings</router-link>
    </nav>
  </div>
</template>