const DB_NAME = 'experimentsDB'
const PROJECTS_STORE = 'projects'
const METADATA_STORE = 'projectsMetadata'
const DB_VERSION = 2

let dbPromise = null

export const initDB = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      const oldVersion = event.oldVersion
      
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        const projectsStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' })
        projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' })
        metadataStore.createIndex('name', 'name', { unique: false })
        metadataStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
      
      if (oldVersion === 1) {
        const transaction = event.target.transaction
        const projectsStore = transaction.objectStore(PROJECTS_STORE)
        const metadataStore = transaction.objectStore(METADATA_STORE)
        
        projectsStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result
          if (cursor) {
            const project = cursor.value
            const metadata = {
              id: project.id,
              name: project.name,
              experimentCount: project.experiments?.length || 0,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
              dataSize: calculateDataSize(project)
            }
            metadataStore.put(metadata)
            cursor.continue()
          }
        }
      }
    }
  })
}

const getDB = async () => {
  if (!dbPromise) {
    dbPromise = initDB()
  }
  return dbPromise
}

const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }
  
  const cloned = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (key.startsWith('__v_') || key === '_isVue' || key === '__ob__' || key === '_isMetadataOnly') {
        continue
      }
      cloned[key] = deepClone(obj[key])
    }
  }
  
  return cloned
}

const calculateDataSize = (project) => {
  if (!project.experiments) return 0
  
  return project.experiments.reduce((total, exp) => {
    return total + (exp.metrics?.reduce((metricTotal, metric) => {
      return metricTotal + (metric.data?.length || 0) * 16
    }, 0) || 0)
  }, 0)
}

const serializeProject = (project) => {
  const cleanProject = {
    id: project.id,
    name: project.name,
    experiments: (project.experiments || []).map(exp => ({
      id: exp.id,
      name: exp.name,
      metrics: (exp.metrics || []).map(metric => ({
        name: metric.name,
        data: (metric.data || []).map(point => [Number(point[0]), Number(point[1])])
      })),
      selected: exp.selected !== false,
      createdAt: exp.createdAt || new Date().toISOString(),
      updatedAt: exp.updatedAt || new Date().toISOString()
    })),
    experimentColors: project.experimentColors || {},
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
    dataSize: project.dataSize || calculateDataSize(project)
  }
  
  return deepClone(cleanProject)
}

const serializeMetadata = (project) => {
  return deepClone({
    id: project.id,
    name: project.name,
    experimentCount: project.experiments?.length || 0,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
    dataSize: project.dataSize || calculateDataSize(project)
  })
}

export const saveProject = async (project) => {
  const db = await getDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE, METADATA_STORE], 'readwrite')
    
    transaction.onerror = () => {
      console.error('Transaction error:', transaction.error)
      reject(transaction.error)
    }
    transaction.oncomplete = () => resolve()
    
    try {
      const serializedProject = serializeProject(project)
      const metadata = serializeMetadata(project)
      
      if (!serializedProject.id || !metadata.id) {
        throw new Error('Project must have an ID')
      }
      
      const projectStore = transaction.objectStore(PROJECTS_STORE)
      projectStore.put(serializedProject)
      
      const metadataStore = transaction.objectStore(METADATA_STORE)
      metadataStore.put(metadata)
      
    } catch (error) {
      console.error('Serialization error:', error)
      reject(error)
    }
  })
}

export const getProject = async (id) => {
  const db = await getDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE], 'readonly')
    const request = transaction.objectStore(PROJECTS_STORE).get(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const result = request.result
      if (result) {
        resolve(deepClone(result))
      } else {
        resolve(null)
      }
    }
  })
}

export const getProjectMetadata = async (id) => {
  const db = await getDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readonly')
    const request = transaction.objectStore(METADATA_STORE).get(id)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result ? deepClone(request.result) : null)
  })
}

export const getAllProjects = async (metadataOnly = false) => {
  const db = await getDB()
  const storeName = metadataOnly ? METADATA_STORE : PROJECTS_STORE
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly')
    const request = transaction.objectStore(storeName).getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const results = request.result || []
      resolve(results.map(item => deepClone(item)))
    }
  })
}

export const deleteProject = async (id) => {
  const db = await getDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROJECTS_STORE, METADATA_STORE], 'readwrite')
    
    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()
    
    transaction.objectStore(PROJECTS_STORE).delete(id)
    transaction.objectStore(METADATA_STORE).delete(id)
  })
}

export const getStorageInfo = async () => {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null
  }
  
  try {
    const estimate = await navigator.storage.estimate()
    return {
      quota: estimate.quota,
      usage: estimate.usage,
      available: estimate.quota - estimate.usage,
      usageDetails: estimate.usageDetails
    }
  } catch (error) {
    console.error('Failed to get storage info:', error)
    return null
  }
}

export const cleanupStorage = async (maxProjects = 10) => {
  const db = await getDB()
  
  return new Promise(async (resolve, reject) => {
    try {
      const metadata = await getAllProjects(true)
      
      if (metadata.length > maxProjects) {
        const projectsToDelete = metadata
          .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
          .slice(0, metadata.length - maxProjects)
        
        const transaction = db.transaction([PROJECTS_STORE, METADATA_STORE], 'readwrite')
        
        transaction.onerror = () => reject(transaction.error)
        transaction.oncomplete = () => resolve(projectsToDelete.length)
        
        for (const project of projectsToDelete) {
          transaction.objectStore(PROJECTS_STORE).delete(project.id)
          transaction.objectStore(METADATA_STORE).delete(project.id)
        }
      } else {
        resolve(0)
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
      reject(error)
    }
  })
}

export const exportProject = async (id) => {
  const project = await getProject(id)
  if (!project) return null
  
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    project: serializeProject(project)
  }
}

export const importProject = async (exportData) => {
  if (!exportData.project) {
    throw new Error('Invalid export data')
  }
  
  const project = exportData.project
  
  const existing = await getProjectMetadata(project.id)
  if (existing) {
    project.id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  project.updatedAt = new Date().toISOString()
  
  await saveProject(project)
  return project
}

export const batchOperation = async (operations, batchSize = 100) => {
  const results = []
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch)
    results.push(...batchResults)
    
    if (i + batchSize < operations.length) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
  
  return results
}