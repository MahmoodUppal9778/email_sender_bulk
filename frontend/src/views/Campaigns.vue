<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Campaigns</h2>
      <router-link to="/campaigns/new" class="btn btn-primary">
        + New Campaign
      </router-link>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
    </div>

    <div v-else-if="campaigns.length === 0" class="card card-body text-center py-12">
      <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
      <p class="text-gray-500 mb-4">Create your first campaign to start reaching out.</p>
      <router-link to="/campaigns/new" class="btn btn-primary">
        Create Campaign
      </router-link>
    </div>

    <div v-else class="grid gap-4">
      <div 
        v-for="campaign in campaigns"
        :key="campaign._id"
        class="card hover:shadow-md transition-shadow"
      >
        <div class="card-body">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="text-lg font-semibold">{{ campaign.name }}</h3>
                <span 
                  class="badge"
                  :class="statusBadgeClass(campaign.status)"
                >
                  {{ campaign.status }}
                </span>
              </div>
              <p class="text-gray-500 text-sm mt-1">{{ campaign.description || 'No description' }}</p>
              
              <div class="flex items-center gap-6 mt-4 text-sm text-gray-600">
                <div class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {{ campaign.stats.totalProspects }} prospects
                </div>
                <div class="flex items-center gap-1">
                  <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ campaign.stats.emailsSent }} sent
                </div>
                <div class="flex items-center gap-1">
                  <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ campaign.stats.emailsPending }} pending
                </div>
                <div v-if="campaign.stats.emailsFailed > 0" class="flex items-center gap-1">
                  <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {{ campaign.stats.emailsFailed }} failed
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <router-link 
                :to="`/campaigns/${campaign._id}`"
                class="btn btn-secondary text-sm"
              >
                View
              </router-link>
              <button 
                v-if="campaign.status === 'draft' || campaign.status === 'paused'"
                @click="handleStart(campaign._id)"
                class="btn btn-success text-sm"
              >
                Start
              </button>
              <button 
                v-else-if="campaign.status === 'active'"
                @click="handlePause(campaign._id)"
                class="btn btn-warning text-sm"
              >
                Pause
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useCampaignStore } from '@/stores/campaigns'

const campaignStore = useCampaignStore()

const campaigns = computed(() => campaignStore.campaigns)
const loading = computed(() => campaignStore.loading)

function statusBadgeClass(status) {
  const classes = {
    draft: 'badge-gray',
    active: 'badge-success',
    paused: 'badge-warning',
    completed: 'badge-info',
    failed: 'badge-danger'
  }
  return classes[status] || 'badge-gray'
}

async function handleStart(id) {
  try {
    await campaignStore.startCampaign(id)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to start campaign')
  }
}

async function handlePause(id) {
  try {
    await campaignStore.pauseCampaign(id)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to pause campaign')
  }
}

onMounted(() => {
  campaignStore.fetchCampaigns()
})
</script>
