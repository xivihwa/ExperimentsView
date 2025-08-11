<script setup>
import { ref } from 'vue'
import '@/assets/styles/components/DropZone.css'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['file-uploaded'])

const isDragging = ref(false)
const errorMessage = ref('')
const fileInput = ref(null)
const isHovering = ref(false)

const handleFileUpload = (event) => {
  if (props.disabled) return
  
  errorMessage.value = ''
  const file = event.target.files?.[0] || event.dataTransfer?.files?.[0]
  if (file) {
    if (validateFile(file)) {
      emit('file-uploaded', file)
    }
  }
}

const validateFile = (file) => {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    errorMessage.value = 'Please upload a CSV file'
    return false
  }
  
  if (file.size > 50 * 1024 * 1024) {
    errorMessage.value = 'File size exceeds 50MB limit'
    return false
  }
  
  return true
}

const handleDragOver = (e) => {
  if (props.disabled) return
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  if (props.disabled) return
  isDragging.value = false
}

const handleDrop = (e) => {
  if (props.disabled) return
  e.preventDefault()
  isDragging.value = false
  handleFileUpload(e)
}

const triggerFileInput = () => {
  if (props.disabled) return
  fileInput.value?.click()
}
</script>

<template>
  <div class="drop-zone-container">
    <input 
      ref="fileInput"
      type="file" 
      accept=".csv" 
      @change="handleFileUpload"
      :disabled="disabled"
      style="display: none;"
    />
    
    <div 
      class="drop-zone" 
      :class="{ 
        'dragging': isDragging && !disabled, 
        'hovering': isHovering && !isDragging && !disabled,
        'disabled': disabled
      }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="triggerFileInput"
      @mouseenter="!disabled && (isHovering = true)"
      @mouseleave="isHovering = false"
    >
      <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" :stroke="disabled ? '#ccc' : '#1A2A80'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
      </div>
      
      <h2>{{ disabled ? 'Processing...' : 'Upload Your CSV Data' }}</h2>
      <p v-if="!disabled">Drag & drop your CSV file here or click to browse</p>
      <p v-else>Please wait while we process your current file</p>
      
      <div class="hint">
        <small>Supported format: CSV (Max 50MB)</small>
      </div>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>