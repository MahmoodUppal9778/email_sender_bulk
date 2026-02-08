<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Email Logs</h2>
      <button @click="emailStore.retryFailed()" class="btn btn-secondary">
        Retry All Failed
      </button>
    </div>

    <!-- Filters -->
    <div class="card card-body">
      <div class="flex items-center gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select v-model="filters.status" @change="fetchLogs" class="input w-auto">
            <option value="">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
          <select v-model="filters.campaignId" @change="fetchLogs" class="input w-auto">
            <option value="">All Campaigns</option>
            <option v-for="c in campaigns" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-5 gap-4">
      <div class="card card-body text-center">
        <p class="text-2xl font-bold">{{ stats?.sentToday || 0 }}</p>
        <p class="text-sm text-gray-500">Sent Today</p>
      </div>
      <div class="card card-body text-center">
        <p class="text-2xl font-bold">{{ stats?.sentThisHour || 0 }}</p>
        <p class="text-sm text-gray-500">This Hour</p>
      </div>
      <div class="card card-body text-center">
        <p class="text-2xl font-bold text-green-600">{{ stats?.totalSent || 0 }}</p>
        <p class="text-sm text-gray-500">Total Sent</p>
      </div>
      <div class="card card-body text-center">
        <p class="text-2xl font-bold text-red-600">{{ stats?.totalFailed || 0 }}</p>
        <p class="text-sm text-gray-500">Total Failed</p>
      </div>
      <div class="card card-body text-center">
        <p class="text-2xl font-bold text-blue-600">{{ stats?.pending || 0 }}</p>
        <p class="text-sm text-gray-500">Pending</p>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="card">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="log in logs" :key="log._id" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-sm">{{ log.to }}</td>
              <td class="px-6 py-4 text-sm max-w-xs truncate">{{ log.subject }}</td>
              <td class="px-6 py-4 text-sm">{{ log.campaign?.name || '-' }}</td>
              <td class="px-6 py-4">
                <span 
                  class="badge"
                  :class="{
                    'badge-success': log.status === 'sent',
                    'badge-danger': log.status === 'failed',
                    'badge-warning': log.status === 'retrying'
                  }"
                >
                  {{ log.status }}
                </span>
                <p v-if="log.error" class="text-xs text-red-600 mt-1 max-w-xs truncate">{{ log.error }}</p>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ formatDate(log.sentAt) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="logs.length === 0" class="text-center py-8 text-gray-500">
          No email logs found
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination" class="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <p class="text-sm text-gray-500">
          Page {{ pagination.page }} of {{ pagination.pages }} ({{ pagination.total }} total)
        </p>
        <div class="flex gap-2">
          <button 
            @click="page--; fetchLogs()"
            :disabled="page <= 1"
            class="btn btn-secondary text-sm"
          >
            Previous
          </button>
          <button 
            @click="page++; fetchLogs()"
            :disabled="page >= pagination.pages"
            class="btn btn-secondary text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useEmailStore } from '@/stores/emails'
import { useCampaignStore } from '@/stores/campaigns'

const emailStore = useEmailStore()
const campaignStore = useCampaignStore()

const page = ref(1)
const filters = reactive({
  status: '',
  campaignId: ''
})

const logs = computed(() => emailStore.logs)
const stats = computed(() => emailStore.stats)
const pagination = computed(() => emailStore.pagination)
const campaigns = computed(() => campaignStore.campaigns)

async function fetchLogs() {
  await emailStore.fetchLogs({
    page: page.value,
    status: filters.status || undefined,
    campaignId: filters.campaignId || undefined
  })
}

function formatDate(date) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchLogs()
  emailStore.fetchStats()
  campaignStore.fetchCampaigns()
})
</script>
