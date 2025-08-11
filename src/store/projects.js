import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  saveProject, 
  getProject as idbGetProject,
  getAllProjects, 
  deleteProject as idbDeleteProject,
  getProjectMetadata 
} from '@/utils/idb'
import { StreamingCsvParser, PerformanceMonitor } from '@/utils/parseCsv'

const COLOR_PALETTE = [
  '#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE',
  '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC', '#1E90FF'
]

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref(new Map())
  const projectsMetadata = ref(new Map())
  const loadedProjects = ref(new Set())
  const loadingProjects = ref(new Set())
  const csvParser = ref(null)
  const uploadProgress = ref(0)
  const isUploading = ref(false)
  const initializationPromise = ref(null)

  const projectsMetadataArray = computed(() => {
    return Array.from(projectsMetadata.value.values()).sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    )
  })

  const projectsArray = computed(() => {
    return Array.from(projects.value.values())
  })

  const migrateFromLocalStorage = async () => {
    try {
      const oldData = localStorage.getItem('projects')
      if (!oldData) return
      
      const oldProjects = JSON.parse(oldData)
      
      if (oldProjects && oldProjects.length > 0) {
        console.log('Migrating projects from localStorage...')
        for (const project of oldProjects) {
          await saveProject(project)
        }
        localStorage.removeItem('projects')
        console.log('Migration completed')
      }
    } catch (error) {
      console.error('Migration failed:', error)
    }
  }

  const loadProjectsMetadata = async (force = false) => {
    if (!force && projectsMetadata.value.size > 0) return
    
    try {
      const metadata = await getAllProjects(true)
      projectsMetadata.value.clear()
      
      metadata.forEach(meta => {
        projectsMetadata.value.set(meta.id, {
          ...meta,
          experimentCount: meta.experimentCount || 0,
          dataSize: meta.dataSize || 0
        })
      })
    } catch (error) {
      console.error('Failed to load projects metadata:', error)
      projectsMetadata.value.clear()
    }
  }

  const createProject = async (name) => {
    const trimmedName = name.trim()
    if (!trimmedName) return null
    
    const newProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedName,
      experiments: [],
      experimentColors: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataSize: 0
    }
    
    try {
      await saveProject(newProject)
      
      projects.value.set(newProject.id, { ...newProject })
      projectsMetadata.value.set(newProject.id, {
        id: newProject.id,
        name: newProject.name,
        experimentCount: 0,
        createdAt: newProject.createdAt,
        updatedAt: newProject.updatedAt,
        dataSize: 0
      })
      
      loadedProjects.value.add(newProject.id)
      
      return newProject
    } catch (error) {
      console.error('Error saving project:', error)
      return null
    }
  }

  const getProject = async (projectId, forceReload = false) => {
    if (!projectId) return null

    if (loadingProjects.value.has(projectId)) {
      while (loadingProjects.value.has(projectId)) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    if (!forceReload && loadedProjects.value.has(projectId)) {
      return projects.value.get(projectId) || null
    }
    
    loadingProjects.value.add(projectId)
    
    try {
      const dbProject = await idbGetProject(projectId)
      if (dbProject) {
        const validatedProject = {
          ...dbProject,
          experiments: dbProject.experiments || [],
          experimentColors: dbProject.experimentColors || {},
          dataSize: dbProject.dataSize || 0
        }
        
        projects.value.set(projectId, validatedProject)
        loadedProjects.value.add(projectId)
        
        const metadata = {
          id: validatedProject.id,
          name: validatedProject.name,
          experimentCount: validatedProject.experiments.length,
          createdAt: validatedProject.createdAt,
          updatedAt: validatedProject.updatedAt,
          dataSize: validatedProject.dataSize
        }
        projectsMetadata.value.set(projectId, metadata)
        
        return validatedProject
      } else {
        projectsMetadata.value.delete(projectId)
        return null
      }
    } catch (error) {
      console.error('Error loading project from DB:', error)
      return null
    } finally {
      loadingProjects.value.delete(projectId)
    }
  }

  const addExperimentsBatch = async (projectId, experiments, options = {}) => {
    if (!experiments || !Array.isArray(experiments) || experiments.length === 0) return null
    
    const monitor = new PerformanceMonitor()
    monitor.start()
    
    const project = await getProject(projectId)
    if (!project) {
      console.error('Project not found:', projectId)
      return null
    }

    monitor.checkpoint('Project loaded')

    try {
      const existingExperiments = new Map()
      project.experiments.forEach(exp => {
        existingExperiments.set(exp.id, exp)
      })

      const existingColors = new Map(Object.entries(project.experimentColors || {}))
      let dataSize = project.dataSize || 0

      monitor.checkpoint('Existing experiments mapped')

      experiments.forEach(exp => {
        if (!exp.id || !exp.metrics || !Array.isArray(exp.metrics)) {
          console.warn('Invalid experiment data:', exp)
          return
        }

        const serializedMetrics = exp.metrics.map(metric => {
          if (!metric.name || !metric.data || !Array.isArray(metric.data)) {
            console.warn('Invalid metric data:', metric)
            return null
          }
          
          const data = metric.data.map(point => {
            if (!Array.isArray(point) || point.length < 2) {
              console.warn('Invalid data point:', point)
              return [0, 0]
            }
            return [Number(point[0]) || 0, Number(point[1]) || 0]
          })
          
          dataSize += data.length * 16
          
          return {
            name: metric.name,
            data
          }
        }).filter(Boolean)

        const experimentData = {
          id: exp.id,
          name: exp.name || exp.id,
          metrics: serializedMetrics,
          selected: exp.selected !== false,
          createdAt: exp.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        existingExperiments.set(exp.id, experimentData)

        if (!existingColors.has(exp.id)) {
          const colorIndex = existingColors.size % COLOR_PALETTE.length
          existingColors.set(exp.id, COLOR_PALETTE[colorIndex])
        }
      })

      monitor.checkpoint('Experiments processed')

      const updatedProject = {
        ...project,
        experiments: Array.from(existingExperiments.values()),
        experimentColors: Object.fromEntries(existingColors),
        dataSize,
        updatedAt: new Date().toISOString()
      }

      await updateProject(updatedProject)
      
      monitor.checkpoint('Project saved')
      console.log('Batch processing summary:', monitor.getSummary())
      
      return updatedProject
    } catch (error) {
      console.error('Error in addExperimentsBatch:', error)
      throw error
    }
  }

  const updateProject = async (projectData) => {
    if (!projectData || !projectData.id) {
      console.error('Invalid project data for update')
      return
    }

    try {
      const cleanProject = {
        id: projectData.id,
        name: projectData.name,
        experiments: projectData.experiments || [],
        experimentColors: projectData.experimentColors || {},
        createdAt: projectData.createdAt || new Date().toISOString(),
        updatedAt: projectData.updatedAt || new Date().toISOString(),
        dataSize: projectData.dataSize || 0
      }

      await saveProject(cleanProject)
      
      projects.value.set(cleanProject.id, cleanProject)
      loadedProjects.value.add(cleanProject.id)
      
      const metadata = {
        id: cleanProject.id,
        name: cleanProject.name,
        experimentCount: cleanProject.experiments.length,
        createdAt: cleanProject.createdAt,
        updatedAt: cleanProject.updatedAt,
        dataSize: cleanProject.dataSize
      }
      projectsMetadata.value.set(cleanProject.id, metadata)
      
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    }
  }

  const deleteProject = async (projectId) => {
    try {
      await idbDeleteProject(projectId)
      
      projects.value.delete(projectId)
      projectsMetadata.value.delete(projectId)
      loadedProjects.value.delete(projectId)
      loadingProjects.value.delete(projectId)
      
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    }
  }

  const uploadCsvFile = async (projectId, file, options = {}) => {
    if (!csvParser.value) {
      csvParser.value = new StreamingCsvParser()
    }

    isUploading.value = true
    uploadProgress.value = 0

    try {
      const experiments = await csvParser.value.parseFile(file, {
        onProgress: (processed) => {
          uploadProgress.value = Math.min(90, (processed / 100000) * 100)
        },
        onError: (error) => {
          console.error('CSV parsing error:', error)
        },
        ...options
      })

      uploadProgress.value = 95
      
      if (experiments && experiments.length > 0) {
        const result = await addExperimentsBatch(projectId, experiments)
        uploadProgress.value = 100
        return result
      } else {
        throw new Error('No experiments found in CSV file')
      }
      
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    } finally {
      isUploading.value = false
      uploadProgress.value = 0
    }
  }

  const abortUpload = () => {
    if (csvParser.value) {
      csvParser.value.abort()
    }
    isUploading.value = false
    uploadProgress.value = 0
  }

  const unloadProject = (projectId) => {
    if (projectId && loadedProjects.value.has(projectId)) {
      projects.value.delete(projectId)
      loadedProjects.value.delete(projectId)
      
      if (window.gc) {
        window.gc()
      }
    }
  }

  const initializeStore = async () => {
    if (initializationPromise.value) {
      return initializationPromise.value
    }

    initializationPromise.value = (async () => {
      try {
        await migrateFromLocalStorage()
        await loadProjectsMetadata()
        console.log('Store initialized successfully')
      } catch (error) {
        console.error('Store initialization failed:', error)
      }
    })()

    return initializationPromise.value
  }

  initializeStore()

  return {
    projects: projectsArray,
    projectsMetadata: projectsMetadataArray,
    uploadProgress: computed(() => uploadProgress.value),
    isUploading: computed(() => isUploading.value),
    
    createProject,
    getProject,
    deleteProject,
    addExperimentsBatch,
    updateProject,
    uploadCsvFile,
    abortUpload,
    unloadProject,
    loadProjectsMetadata,
    initializeStore
  }
})