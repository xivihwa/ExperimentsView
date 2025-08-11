<script setup>
import { computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectsStore } from '@/store/projects'
import { useMobileMenu } from '@/composables/useMobileMenu'
import '@/assets/styles/style.css'
import '@/assets/styles/App.css'
import AppHeader from '@/components/AppHeader.vue'
import SideBar from '@/components/SideBar.vue'

const route = useRoute()
const projectsStore = useProjectsStore()

const {
  isMobile,
  isMainSidebarOpen,
  isExperimentsSidebarOpen,
  closeAllSidebars
} = useMobileMenu()

const showMainSidebar = computed(() => {
  return ['ProjectsView', 'SettingsView'].includes(route.name)
})

const layoutType = computed(() => {
  if (route.name === 'HomeView') return 'home'
  if (route.name === 'ExperimentsView') return 'experiments'
  if (route.name === 'ExperimentDetails') return 'details'
  return 'default'
})

watch(route, () => {
  nextTick(() => {
    document.body.offsetHeight
  })
})
</script>

<template>
  <div class="app-layout">
    <AppHeader />
    
    <div class="content-wrapper">
      <SideBar 
        v-if="showMainSidebar" 
        :class="{ 'mobile-open': isMainSidebarOpen && isMobile }"
      />
      
      <div 
        v-if="(isMainSidebarOpen || isExperimentsSidebarOpen) && isMobile" 
        class="mobile-overlay"
        @click="closeAllSidebars"
      ></div>      

      <main 
        class="main-content" 
        :class="{
          'with-main-sidebar': showMainSidebar,
          'layout-home': layoutType === 'home',
          'layout-experiments': layoutType === 'experiments',
          'layout-details': layoutType === 'details'
        }"
      >
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>