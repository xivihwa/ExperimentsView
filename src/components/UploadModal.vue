<script setup>
import { computed } from 'vue'
import '@/assets/styles/components/UploadModal.css'

const props = defineProps({
  isUploading: {
    type: Boolean,
    default: false
  },
  uploadProgress: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['cancel'])

const progressPercentage = computed(() => Math.round(props.uploadProgress))

const cancelUpload = () => {
  emit('cancel')
}
</script>

<template>
  <div v-if="isUploading" class="upload-modal-overlay">
    <div class="upload-modal-content">
      <div class="upload-header">
        <h3>Processing CSV File</h3>
      </div>
      
      <div class="upload-body">
        <div class="spinner-large"></div>
        <p class="upload-text">
          Processing your data... {{ progressPercentage }}%
        </p>
        
        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>
          <span class="progress-label">{{ progressPercentage }}%</span>
        </div>
      </div>
      
      <div class="upload-footer">
        <button 
          @click="cancelUpload"
          class="cancel-upload-btn"
        >
          Cancel Upload
        </button>
      </div>
    </div>
  </div>
</template>