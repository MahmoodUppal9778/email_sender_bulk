import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value)

  async function login(email, password) {
    const response = await api.post('/auth/login', { email, password })
    token.value = response.data.data.token
    user.value = response.data.data.user
    localStorage.setItem('token', token.value)
    return response.data
  }

  async function register(email, password, name) {
    const response = await api.post('/auth/register', { email, password, name })
    token.value = response.data.data.token
    user.value = response.data.data.user
    localStorage.setItem('token', token.value)
    return response.data
  }

  async function checkAuth() {
    if (!token.value) return
    
    try {
      const response = await api.get('/auth/me')
      user.value = response.data.data.user
    } catch (error) {
      logout()
    }
  }

  async function updateGmailSettings(gmailUser, gmailAppPassword) {
    const response = await api.put('/auth/gmail-settings', { gmailUser, gmailAppPassword })
    await checkAuth()
    return response.data
  }

  async function updateSettings(settings) {
    const response = await api.put('/auth/settings', settings)
    user.value = { ...user.value, settings: response.data.data.settings }
    return response.data
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    checkAuth,
    updateGmailSettings,
    updateSettings,
    logout
  }
})

