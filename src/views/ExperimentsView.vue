<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '@/store/projects'
import { useMobileMenu } from '@/composables/useMobileMenu'
import ExperimentsSidebar from '@/components/ExperimentsSidebar.vue'
import ChartCard from '@/components/ChartCard.vue'
import DropZone from '@/components/DropZone.vue'
import UploadModal from '@/components/UploadModal.vue'
import '@/assets/styles/views/ExperimentsView.css'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const { isMobile, isExperimentsSidebarOpen, closeExperimentsSidebar } = useMobileMenu()

const projectId = computed(() => route.params.projectId)
const isLoading = ref(false)
const project = ref(null)
const error = ref(null)
const retryCount = ref(0)
const maxRetries = 3

const isValidProjectId = computed(() => {
  return projectId.value && typeof projectId.value === 'string' && projectId.value.trim().length > 0
})

const loadProjectData = async (forceReload = false) => {
  if (!isValidProjectId.value) {
    error.value = 'Invalid project ID'
    return
  }

  try {
    isLoading.value = true
    error.value = null
    
    const loadedProject = await projectsStore.getProject(projectId.value, forceReload)
    if (loadedProject) {
      project.value = { ...loadedProject }
      retryCount.value = 0
    } else {
      const metadata = projectsStore.projectsMetadata.find(p => p.id === projectId.value)
      if (metadata) {
        if (retryCount.value < maxRetries) {
          retryCount.value++
          setTimeout(() => loadProjectData(true), 1000)
          return
        }
      }
      error.value = 'Project not found'
    }
  } catch (err) {
    console.error('Error loading project:', err)
    error.value = `Failed to load project: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

watch(projectId, (newId, oldId) => {
  if (newId !== oldId) {
    project.value = null
    loadProjectData()
  }
}, { immediate: true })

watch(() => projectsStore.projects, (newProjects) => {
  if (!projectId.value) return
  
  const found = newProjects.find(p => p.id === projectId.value)
  if (found) {
    project.value = { ...found }
  }
}, { deep: true })

const projectName = computed(() => {
  if (project.value?.name) return project.value.name
  if (isLoading.value) return 'Loading...'
  
  const metadata = projectsStore.projectsMetadata.find(p => p.id === projectId.value)
  return metadata?.name || 'Unknown Project'
})

const experiments = computed(() => {
  if (!project.value?.experiments) return []
  
  return project.value.experiments.map(exp => ({
    id: exp.id,
    name: exp.name || exp.id,
    metrics: exp.metrics || [],
    selected: exp.selected !== false
  }))
})

const hasExperiments = computed(() => {
  return experiments.value.length > 0
})

const selectedExperiments = computed(() => 
  experiments.value.filter(exp => exp.selected)
)

const experimentColors = computed(() => {
  return project.value?.experimentColors || {}
})

const metricNames = computed(() => {
  const names = new Set()
  experiments.value.forEach(exp => {
    exp.metrics?.forEach(metric => {
      if (metric?.name) {
        names.add(metric.name)
      }
    })
  })
  return Array.from(names).sort()
})

async function toggleExperiment(expId) {
  if (!project.value?.experiments || !expId) return
  
  const idx = project.value.experiments.findIndex(e => e.id === expId)
  if (idx === -1) return
  
  try {
    const updatedExperiments = [...project.value.experiments]
    updatedExperiments[idx] = {
      ...updatedExperiments[idx],
      selected: !updatedExperiments[idx].selected
    }
    
    const updatedProject = {
      ...project.value,
      experiments: updatedExperiments,
      updatedAt: new Date().toISOString()
    }
    
    project.value = updatedProject
    await projectsStore.updateProject(updatedProject)
    
  } catch (err) {
    console.error('Failed to toggle experiment:', err)
    await loadProjectData(true)
  }
}

const handleFileUploaded = async (file) => {
  if (!isValidProjectId.value) {
    error.value = 'Invalid project ID'
    return
  }

  try {
    error.value = null
    
    const result = await projectsStore.uploadCsvFile(projectId.value, file, {
      onProgress: (processed) => {
        console.log(`Processed ${processed} rows`)
      },
      onError: (uploadError) => {
        console.error('Upload error:', uploadError)
      }
    })

    if (result) {
      project.value = { ...result }
      await nextTick()
    } else {
      throw new Error('No data was processed from the CSV file')
    }
  } catch (uploadError) {
    console.error('File processing error:', uploadError)
    
    if (uploadError.name === 'AbortError') {
      error.value = 'Upload cancelled'
    } else {
      error.value = `Error processing CSV file: ${uploadError.message}`
    }
  }
}

const cancelProcessing = () => {
  projectsStore.abortUpload()
}

const clearError = () => {
  error.value = null
  retryCount.value = 0
}

const retryLoadProject = async () => {
  retryCount.value = 0
  await loadProjectData(true)
}

onMounted(async () => {
  await projectsStore.initializeStore()
  
  if (isValidProjectId.value) {
    await loadProjectData()
  }
})

onUnmounted(() => {
  if (projectId.value) {
    projectsStore.unloadProject(projectId.value)
  }
})
</script>

<template>
  <div class="experiments-view">
    <UploadModal 
      :is-uploading="projectsStore.isUploading"
      :upload-progress="projectsStore.uploadProgress"
      @cancel="cancelProcessing"
    />

    <ExperimentsSidebar 
      :class="{ 'mobile-open': isExperimentsSidebarOpen && isMobile }"
      :project-id="projectId"
      :project-name="projectName"
      :experiments="experiments"
      :experiment-colors="experimentColors"
      @toggle-experiment="toggleExperiment"
    />

    <div class="experiments-main-content with-sidebar">
      <div v-if="error && !isLoading" class="error-state">
        <div class="error-message">
          <h3>Error</h3>
          <p>{{ error }}</p>
          <div class="error-actions">
            <button @click="retryLoadProject" class="retry-btn">
              Retry Loading
            </button>
            <button @click="clearError" class="clear-btn">
              Clear Error
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="hasExperiments && !isLoading" class="metrics-grid">
        <ChartCard 
          v-for="metricName in metricNames" 
          :key="metricName"
          :metric-name="metricName"
          :experiment-colors="experimentColors"
          :experiments="experiments"
          :selected-experiments="selectedExperiments"
        />
      </div>

      <div v-else-if="!isLoading && !hasExperiments && project" class="no-experiments">
        <DropZone 
          @file-uploaded="handleFileUploaded" 
          :disabled="projectsStore.isUploading"
        />
      </div>

      <div v-else-if="isLoading && !projectsStore.isUploading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading project...</p>
      </div>
    </div>
  </div>
</template>