import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useEmailStore = defineStore('emails', () => {
  const logs = ref([])
  const stats = ref(null)
  const queueState = ref(null)
  const pagination = ref(null)
  const loading = ref(false)

  async function fetchLogs(params = {}) {
    loading.value = true
    try {
      const response = await api.get('/emails/logs', { params })
      logs.value = response.data.data.logs
      pagination.value = response.data.data.pagination
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    const response = await api.get('/emails/stats')
    stats.value = response.data.data
  }

  async function fetchQueueState() {
    const response = await api.get('/emails/queue-state')
    queueState.value = response.data.data
  }

  async function pauseQueue() {
    await api.post('/emails/queue/pause')
    await fetchQueueState()
  }

  async function resumeQueue() {
    await api.post('/emails/queue/resume')
    await fetchQueueState()
  }

  async function retryFailed(campaignId = null) {
    const response = await api.post('/emails/retry-failed', { campaignId })
    await fetchLogs()
    return response.data
  }

  return {
    logs,
    stats,
    queueState,
    pagination,
    loading,
    fetchLogs,
    fetchStats,
    fetchQueueState,
    pauseQueue,
    resumeQueue,
    retryFailed
  }
})
