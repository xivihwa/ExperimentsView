<template>
  <div class="home-view">
    <h1>Welcome to <br>Experiments Viewer!</h1>
    <button @click="goToProjects" class="get-started-btn">
      Get started
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import '@/assets/styles/views/HomeView.css'

const router = useRouter()
const goToProjects = () => router.push('/projects')
</script>