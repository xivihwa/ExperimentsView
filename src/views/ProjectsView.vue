<script setup>
import { ref, nextTick, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/store/projects'
import CreateProjectModal from '@/components/CreateProjectModal.vue'
import DeleteProjectModal from '@/components/DeleteProjectModal.vue'
import '@/assets/styles/views/ProjectsView.css'

const router = useRouter()
const projectsStore = useProjectsStore()
const newProjectName = ref('')
const showAddForm = ref(false)
const showDeleteForm = ref(false)
const projectToDelete = ref(null)
const isLoading = ref(true)

const projects = computed(() => projectsStore.projectsMetadata)

onMounted(async () => {
  try {
    await projectsStore.loadProjectsMetadata()
  } catch (error) {
    console.error('Failed to load projects:', error)
  } finally {
    isLoading.value = false
  }
})

const createProject = async () => {
  if (!newProjectName.value.trim()) return;
  try {
    const newProject = await projectsStore.createProject(newProjectName.value.trim());
    if (!newProject) throw new Error('Project creation failed');
    newProjectName.value = '';
    showAddForm.value = false;
    await nextTick();
    router.push({ 
      name: 'ExperimentsView', 
      params: { projectId: newProject.id } 
    });
  } catch (error) {
    console.error('Error creating project:', error);
    alert('Failed to create project. Please try again.');
  }
}

const showDeleteConfirmation = (project, event) => {
  event.stopPropagation()
  projectToDelete.value = project
  showDeleteForm.value = true
}

const deleteProject = async () => {
  if (!projectToDelete.value) return;
  
  try {
    await projectsStore.deleteProject(projectToDelete.value.id)
    showDeleteForm.value = false
    projectToDelete.value = null
  } catch (error) {
    console.error('Failed to delete project:', error)
    alert('Failed to delete project. Please try again.');
  }
}

const cancelDelete = () => {
  showDeleteForm.value = false
  projectToDelete.value = null
}

const navigateToProject = (projectId) => {
  router.push({ 
    name: 'ExperimentsView', 
    params: { projectId } 
  })
}

const formatDataSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<template>
  <div class="projects-view">
    <div class="header-section">
      <h2>Your Projects</h2>
      <p class="subtitle">Select a project to view experiments or create a new one</p>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading projects...</p>
    </div>

    <div v-else class="projects-grid">
      <div 
        v-for="project in projects" 
        :key="project.id"
        class="project-card"
        @click="navigateToProject(project.id)"
      >
        <div class="project-icon">
          <svg viewBox="0 0 24 24">
            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
        </div>
        <button 
          @click.stop="showDeleteConfirmation(project, $event)" 
          class="delete-btn"
          title="Delete project"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 7L18.1327 19.1425C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1425L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="#ff4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h3>{{ project.name }}</h3>
        <div class="project-stats">
          <span>{{ project.experimentCount || 0 }} experiments</span>
          <span v-if="project.size" class="data-size">{{ formatDataSize(project.size) }}</span>
        </div>
        <div class="project-dates">
          <small>Updated: {{ new Date(project.updatedAt).toLocaleDateString() }}</small>
        </div>
      </div>

      <div  
        class="project-card add-card"
        @click="showAddForm = true"
      >
        <div class="project-icon">
          <svg viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </div>
        <h3>New Project</h3>
      </div>
    </div>

    <CreateProjectModal
      :show="showAddForm"
      :modelValue="newProjectName"
      @update:modelValue="val => newProjectName = val"
      @create="createProject"
      @close="showAddForm = false"
    />

    <DeleteProjectModal
      :show="showDeleteForm"
      :projectName="projectToDelete?.name || ''"
      @delete="deleteProject"
      @close="cancelDelete"
    />
  </div>
</template>