<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
    <div>
      <h2 class="text-lg font-semibold text-gray-900">{{ pageTitle }}</h2>
    </div>

    <div class="flex items-center gap-4">
      <!-- Queue Status -->
      <div class="flex items-center gap-2 text-sm">
        <div 
          class="w-2 h-2 rounded-full"
          :class="queueStatusColor"
        ></div>
        <span class="text-gray-600">{{ queueStatusText }}</span>
      </div>

      <!-- Quick Actions -->
      <button 
        v-if="emailStore.queueState?.state?.isPaused"
        @click="emailStore.resumeQueue()"
        class="btn btn-success text-sm"
      >
        Resume Queue
      </button>
      <button 
        v-else-if="emailStore.queueState"
        @click="emailStore.pauseQueue()"
        class="btn btn-warning text-sm"
      >
        Pause Queue
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEmailStore } from '@/stores/emails'

const route = useRoute()
const emailStore = useEmailStore()

const pageTitle = computed(() => {
  const titles = {
    'Dashboard': 'Dashboard',
    'Campaigns': 'Campaigns',
    'NewCampaign': 'Create Campaign',
    'CampaignDetail': 'Campaign Details',
    'Emails': 'Email Logs',
    'Settings': 'Settings'
  }
  return titles[route.name] || 'Dashboard'
})

const queueStatusColor = computed(() => {
  const state = emailStore.queueState?.state
  if (!state?.isOnline) return 'bg-red-500'
  if (state?.isPaused) return 'bg-yellow-500'
  return 'bg-green-500'
})

const queueStatusText = computed(() => {
  const state = emailStore.queueState?.state
  if (!state?.isOnline) return 'Offline'
  if (state?.isPaused) return 'Paused'
  return 'Queue Active'
})

onMounted(() => {
  emailStore.fetchQueueState()
  // Refresh every 30 seconds
  setInterval(() => emailStore.fetchQueueState(), 30000)
})
</script>
