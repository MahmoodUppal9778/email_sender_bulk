import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useDashboardStore = defineStore('dashboard', () => {
  const overview = ref(null)
  const activity = ref([])
  const errors = ref([])
  const loading = ref(false)

  async function fetchOverview() {
    loading.value = true
    try {
      const response = await api.get('/dashboard/overview')
      overview.value = response.data.data
    } finally {
      loading.value = false
    }
  }

  async function fetchActivity(days = 7) {
    const response = await api.get('/dashboard/activity', { params: { days } })
    activity.value = response.data.data
  }

  async function fetchErrors(page = 1) {
    const response = await api.get('/dashboard/errors', { params: { page } })
    errors.value = response.data.data.errors
    return response.data.data
  }

  return {
    overview,
    activity,
    errors,
    loading,
    fetchOverview,
    fetchActivity,
    fetchErrors
  }
})
