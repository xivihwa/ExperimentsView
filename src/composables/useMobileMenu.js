import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const isMainSidebarOpen = ref(false)
const isExperimentsSidebarOpen = ref(false)
const isMobile = ref(false)

export function useMobileMenu() {
  const route = useRoute()

  const checkScreenSize = () => {
    isMobile.value = window.innerWidth <= 768
    if (!isMobile.value) {
      isMainSidebarOpen.value = false
      isExperimentsSidebarOpen.value = false
    }
  }

  const toggleMainSidebar = () => {
    isMainSidebarOpen.value = !isMainSidebarOpen.value
    if (isMainSidebarOpen.value) {
      isExperimentsSidebarOpen.value = false
    }
  }

  const toggleExperimentsSidebar = () => {
    isExperimentsSidebarOpen.value = !isExperimentsSidebarOpen.value
    if (isExperimentsSidebarOpen.value) {
      isMainSidebarOpen.value = false
    }
  }

  const closeMainSidebar = () => {
    isMainSidebarOpen.value = false
  }

  const closeExperimentsSidebar = () => {
    isExperimentsSidebarOpen.value = false
  }

  const closeAllSidebars = () => {
    isMainSidebarOpen.value = false
    isExperimentsSidebarOpen.value = false
  }

  watch([isMainSidebarOpen, isExperimentsSidebarOpen], ([mainOpen, expOpen]) => {
    if (mainOpen || expOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  })

  watch(() => route.name, () => {
    closeAllSidebars()
  })

  onMounted(() => {
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkScreenSize)
    document.body.style.overflow = ''
  })

  return {
    isMobile,
    isMainSidebarOpen,
    isExperimentsSidebarOpen,
    toggleMainSidebar,
    toggleExperimentsSidebar,
    closeMainSidebar,
    closeExperimentsSidebar,
    closeAllSidebars
  }
}
