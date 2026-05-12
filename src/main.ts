import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/app/router'
import App from '@/app/App.vue'
import { useThemeStore } from '@/entities/theme'
import '@/app/styles/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

useThemeStore()

app.mount('#app')
