import { createApp } from 'vue'
import '@/assets/styles/style.css';
import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import 'primeicons/primeicons.css'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(router)
app.use(PrimeVue)
app.use(createPinia())
app.mount('#app')
