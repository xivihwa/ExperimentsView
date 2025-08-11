<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMobileMenu } from '@/composables/useMobileMenu'
import '@/assets/styles/components/ExperimentsSidebar.css'

const props = defineProps({
  projectId: String,
  projectName: String,
  experiments: Array,
  experimentColors: Object
})

const router = useRouter()
const route = useRoute()
const { isMobile, isExperimentsSidebarOpen, closeExperimentsSidebar } = useMobileMenu()

const emit = defineEmits(['toggle-experiment'])

const toggleExperiment = (expId, event) => {
  event.stopPropagation()
  emit('toggle-experiment', expId)
}

const navigateToExperiment = (expId) => {
  router.push(`/projects/${props.projectId}/experiments/${expId}`)
  closeExperimentsSidebar()
}
</script>

<template>
  <aside class="experiments-sidebar" :class="{ 'mobile-open': isExperimentsSidebarOpen && isMobile }">
    <button 
      v-if="isMobile"
      @click="closeExperimentsSidebar"
      class="mobile-close-btn"
    >
      <i class="pi pi-times"></i>
    </button>

    <div class="sidebar-header">
      <h3>{{ projectName }}</h3>
      <p>Experiments</p>
    </div>
    
    <div class="experiment-list">
      <div 
        v-for="exp in experiments" 
        :key="exp.id"
        class="experiment-item"
        :class="{ 'selected': exp.selected }"
      >
        <input 
          type="checkbox" 
          :checked="exp.selected" 
          @click="toggleExperiment(exp.id, $event)"
          class="experiment-checkbox"
        />
        <span 
          class="color-dot"
          :style="{ backgroundColor: experimentColors[exp.id] }"
        ></span>
        <span 
          class="name"
          @click="navigateToExperiment(exp.id)"
        >{{ exp.name }}</span>
        <span class="metric-count">{{ exp.metrics?.length || 0 }}</span>
      </div>
    </div>
  </aside>
</template>