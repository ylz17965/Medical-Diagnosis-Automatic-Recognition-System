import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import { useSettingsStore } from './stores/settings'
import { useUserStore } from './stores/user'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

const settingsStore = useSettingsStore()
settingsStore.loadFromStorage()

const userStore = useUserStore()
userStore.initFromStorage()

app.mount('#app')
