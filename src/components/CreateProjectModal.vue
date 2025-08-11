<script setup>
import '@/assets/styles/components/CreateProjectModal.css'

defineProps({
  show: {
    type: Boolean,
    required: true
  },
  modelValue: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'create', 'close'])

const handleInput = (e) => {
  emit('update:modelValue', e.target.value)
}

const handleCreate = () => {
  emit('create')
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <h3>Create New Project</h3>
      <div class="form-group">
        <label>Project Name</label>
        <input
          :value="modelValue"
          type="text"
          placeholder="Enter project name..."
          class="project-input"
          @input="handleInput"
          @keyup.enter="handleCreate"
          autofocus
        />
      </div>
      <div class="form-actions">
        <button @click="handleClose" class="cancel-btn">
          Cancel
        </button>
        <button 
          @click="handleCreate" 
          class="confirm-btn"
          :disabled="!modelValue.trim()"
        >
          Create Project
        </button>
      </div>
    </div>
  </div>
</template>