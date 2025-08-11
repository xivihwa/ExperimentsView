<script setup>
import { useRoute } from 'vue-router'
import { useMobileMenu } from '@/composables/useMobileMenu'
import '@/assets/styles/components/SideBar.css'

const route = useRoute()
const { isMobile, isMainSidebarOpen, closeMainSidebar } = useMobileMenu()
</script>

<template>
  <aside class="main-sidebar" :class="{ 'mobile-open': isMainSidebarOpen && isMobile }">
    <button 
      v-if="isMobile"
      @click="closeMainSidebar"
      class="mobile-close-btn"
    >
      <i class="pi pi-times"></i>
    </button>

    <nav class="nav-menu">
      <router-link 
        to="/" 
        class="nav-item"
        @click="closeMainSidebar"
        :class="{ 'router-link-active': route.name === 'HomeView' }"
      >
        <i class="pi pi-home"></i>
        <span>Home</span>
      </router-link>
      <router-link 
        to="/projects" 
        class="nav-item"
        @click="closeMainSidebar"
        :class="{ 'router-link-active': route.name === 'ProjectsView' }"
      >
        <i class="pi pi-folder"></i>
        <span>Projects</span>
      </router-link>
      <router-link 
        to="/settings" 
        class="nav-item"
        @click="closeMainSidebar"
        :class="{ 'router-link-active': route.name === 'SettingsView' }"
      >
        <i class="pi pi-cog"></i>
        <span>Settings</span>
      </router-link>
    </nav>
  </aside>
</template>