import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useCampaignStore = defineStore('campaigns', () => {
  const campaigns = ref([])
  const currentCampaign = ref(null)
  const prospects = ref([])
  const loading = ref(false)

  async function fetchCampaigns() {
    loading.value = true
    try {
      const response = await api.get('/campaigns')
      campaigns.value = response.data.data.campaigns
    } finally {
      loading.value = false
    }
  }

  async function fetchCampaign(id) {
    loading.value = true
    try {
      const response = await api.get(`/campaigns/${id}`)
      currentCampaign.value = response.data.data.campaign
      prospects.value = response.data.data.prospects
    } finally {
      loading.value = false
    }
  }

  async function createCampaign(data) {
    const response = await api.post('/campaigns', data)
    await fetchCampaigns()
    return response.data.data.campaign
  }

  async function updateCampaign(id, data) {
    const response = await api.put(`/campaigns/${id}`, data)
    await fetchCampaigns()
    return response.data.data.campaign
  }

  async function deleteCampaign(id) {
    await api.delete(`/campaigns/${id}`)
    await fetchCampaigns()
  }

  async function startCampaign(id) {
    const response = await api.post(`/campaigns/${id}/start`)
    await fetchCampaign(id)
    return response.data
  }

  async function pauseCampaign(id) {
    const response = await api.post(`/campaigns/${id}/pause`)
    await fetchCampaign(id)
    return response.data
  }

  async function resumeCampaign(id) {
    const response = await api.post(`/campaigns/${id}/resume`)
    await fetchCampaign(id)
    return response.data
  }

  async function uploadProspects(campaignId, file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/upload/${campaignId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    await fetchCampaign(campaignId)
    return response.data
  }

  async function scrapeEmails(campaignId) {
    const response = await api.post(`/upload/${campaignId}/scrape-emails`)
    await fetchCampaign(campaignId)
    return response.data
  }

  async function analyzeWebsites(campaignId) {
    const response = await api.post(`/upload/${campaignId}/analyze-websites`)
    await fetchCampaign(campaignId)
    return response.data
  }

  return {
    campaigns,
    currentCampaign,
    prospects,
    loading,
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    uploadProspects,
    scrapeEmails,
    analyzeWebsites
  }
})
