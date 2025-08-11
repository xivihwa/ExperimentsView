<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProjectsStore } from '@/store/projects'
import '@/assets/styles/views/ExperimentDetails.css'

const route = useRoute()
const projectId = route.params.projectId
const experimentId = route.params.experimentId

const projectsStore = useProjectsStore()
const experiment = ref(null)
const project = ref(null)
const decimalPrecision = ref(8)
const searchQuery = ref('')
const isLoading = ref(false)

onMounted(async () => {
  try {
    isLoading.value = true
    const loadedProject = await projectsStore.getProject(projectId)
    if (loadedProject) {
      project.value = loadedProject
      experiment.value = loadedProject.experiments?.find(e => e.id === experimentId) || null
    }
  } catch (error) {
    console.error('Error loading experiment details:', error)
  } finally {
    isLoading.value = false
  }
})

const metrics = computed(() => {
  if (!experiment.value?.metrics) return []
  
  return experiment.value.metrics.map(metric => {
    const steps = metric.data.map(d => d[0])
    const values = metric.data.map(d => d[1])

    const minIndex = values.reduce((iMin, val, i) => 
      val < values[iMin] ? i : iMin, 0)
    const maxIndex = values.reduce((iMax, val, i) => 
      val > values[iMax] ? i : iMax, 0)

    const lastIndex = metric.data.length - 1

    return {
      name: metric.name,
      last: {
        raw: metric.data[lastIndex][1],
        step: metric.data[lastIndex][0]
      },
      min: {
        raw: values[minIndex],
        step: steps[minIndex]
      },
      max: {
        raw: values[maxIndex],
        step: steps[maxIndex]
      }
    }
  })
})

const filteredMetrics = computed(() => {
  if (!searchQuery.value) return metrics.value
  try {
    const regex = new RegExp(searchQuery.value, 'i')
    return metrics.value.filter(m => regex.test(m.name))
  } catch {
    return metrics.value.filter(m =>
      m.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
})

const formatValue = (value) => {
  if (value == null || isNaN(value)) return ''
  
  if (value === 0 || Math.abs(value) < Number.EPSILON) {
    return '0'
  }
  
  if (Math.abs(value) < 1e-6) {
    const formatted = value.toExponential(decimalPrecision.value)
    return formatted.replace(/0+e/, 'e')
  }
  
  const formatted = value.toFixed(decimalPrecision.value)
  return formatted.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.$/, '')
}
</script>

<template>
  <div class="experiment-details">
    <div class="experiment-header">
      <router-link :to="`/projects/${projectId}`" class="back-link">
        ← Back to project
      </router-link>
      <div class="header-content">
        <h1 v-if="experiment">{{ experiment.name }}</h1>
        <h1 v-else-if="isLoading">Loading experiment...</h1>
        <h1 v-else>Experiment not found</h1>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading experiment details...</p>
    </div>

    <div v-else-if="!experiment" class="error-state">
      <p>Experiment with ID "{{ experimentId }}" not found in this project.</p>
      <router-link :to="`/projects/${projectId}`" class="back-button">
        Return to Project
      </router-link>
    </div>

    <div v-else-if="experiment" class="experiment-content">
      <div class="controls-container">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name (regex)"
            class="search-input"
          >
        </div>
        <div class="precision-selector">
          <span>Precision:</span>
          <select v-model.number="decimalPrecision" class="precision-select">
            <option v-for="n in 10" :value="n-1" :key="n">{{ n-1 }}</option>
          </select>
        </div>
      </div>

      <div v-if="metrics.length" class="metrics-table-wrapper">
        <table class="metrics-table">
          <thead>
            <tr>
              <th rowspan="2" class="main-header">METRIC NAME</th>
              <th colspan="2" class="main-header">LAST</th>
              <th colspan="2" class="main-header">MIN</th>
              <th colspan="2" class="main-header">MAX</th>
            </tr>
            <tr class="sub-headers">
              <th class="value-header">Value</th>
              <th class="step-header">Step</th>
              <th class="value-header">Value</th>
              <th class="step-header">Step</th>
              <th class="value-header">Value</th>
              <th class="step-header">Step</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="metric in filteredMetrics" :key="metric.name">
              <td class="metric-name">{{ metric.name }}</td>
              <td class="metric-value" :title="metric.last.raw?.toString()">
                {{ formatValue(metric.last.raw) }}
              </td>
              <td class="metric-step">{{ metric.last.step }}</td>
              <td class="metric-value" :title="metric.min.raw?.toString()">
                {{ formatValue(metric.min.raw) }}
              </td>
              <td class="metric-step">{{ metric.min.step }}</td>
              <td class="metric-value" :title="metric.max.raw?.toString()">
                {{ formatValue(metric.max.raw) }}
              </td>
              <td class="metric-step">{{ metric.max.step }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="no-metrics">
        No metrics available for this experiment
      </div>
    </div>
  </div>
</template>