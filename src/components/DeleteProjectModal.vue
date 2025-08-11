<script setup>
import '@/assets/styles/components/CreateProjectModal.css'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  projectName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['delete', 'close'])

const handleDelete = () => {
  emit('delete')
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <h3>Delete Project</h3>
      <div class="form-group">
        <p style="color: var(--text); font-size: 1rem; line-height: 1.5; margin-bottom: var(--space-lg);">
          Are you sure you want to delete the project 
          <strong style="color: var(--primary);">"{{ projectName }}"</strong>?
        </p>
      </div>
      <div class="form-actions">
        <button @click="handleClose" class="cancel-btn">
          Cancel
        </button>
        <button 
          @click="handleDelete" 
          class="confirm-btn delete-confirm-btn"
        >
          Delete Project
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cancel-btn {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%) !important;
  color: white !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(26, 42, 128, 0.3) !important;
}

.cancel-btn:hover {
  background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary) 100%) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 16px rgba(26, 42, 128, 0.4) !important;
}

.delete-confirm-btn {
  background: linear-gradient(135deg, var(--error) 0%, #dc2626 100%) !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
}

.delete-confirm-btn:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4) !important;
}
</style>