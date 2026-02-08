<template>
  <div class="space-y-6" v-if="campaign">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-3">
          <router-link to="/campaigns" class="text-gray-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </router-link>
          <h2 class="text-xl font-bold">{{ campaign.name }}</h2>
          <span 
            class="badge"
            :class="statusBadgeClass(campaign.status)"
          >
            {{ campaign.status }}
          </span>
        </div>
        <p class="text-gray-500 mt-1">{{ campaign.description || 'No description' }}</p>
      </div>

      <div class="flex items-center gap-2">
        <button 
          v-if="campaign.status === 'draft' || campaign.status === 'paused'"
          @click="handleStart"
          class="btn btn-success"
        >
          Start Campaign
        </button>
        <button 
          v-else-if="campaign.status === 'active'"
          @click="handlePause"
          class="btn btn-warning"
        >
          Pause
        </button>
        <button 
          v-if="campaign.status === 'paused'"
          @click="handleResume"
          class="btn btn-primary"
        >
          Resume
        </button>
        <button 
          @click="showDeleteModal = true"
          class="btn btn-danger"
        >
          Delete
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-5 gap-4">
      <div class="card card-body text-center">
        <p class="text-2xl font-bold">{{ campaign.stats.totalProspects }}</p>
        <p class="text-sm text-gray-500">Total</p>
      </div>
      <div class="card card-body text-center">
        <p class="text-2xl font-bold text-blue-600">{{ campaign.stats.emailsPending }}</p>
        <p class="text-sm text-gray-500">Pending</p>
      </div>
      <div class="card card-body text-center">
        <p class="text-2xl font-bold text-green-600">{{ campaign.stats.emailsSent }}</p>
        <p class="text-sm text-gray-500">Sent</p>
      </div>
      <div class="card card-body text-center">
        <p class="text-2xl font-bold text-yellow-600">{{ campaign.stats.emailsRetrying }}</p>
        <p class="text-sm text-gray-500">Retrying</p>
      </div>
      <div class="card card-body text-center">
        <p class="text-2xl font-bold text-red-600">{{ campaign.stats.emailsFailed }}</p>
        <p class="text-sm text-gray-500">Failed</p>
      </div>
    </div>

    <!-- Upload Section -->
    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold">Upload Prospects</h3>
      </div>
      <div class="card-body">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <input
              ref="fileInput"
              type="file"
              accept=".csv,.xlsx,.xls"
              @change="handleFileSelect"
              class="hidden"
            />
            <div 
              @click="$refs.fileInput.click()"
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop.prevent="handleDrop"
              class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
              :class="dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'"
            >
              <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p class="text-gray-600">
                <span class="text-primary-600 font-medium">Click to upload</span> or drag and drop
              </p>
              <p class="text-sm text-gray-500 mt-1">CSV or Excel files</p>
            </div>
          </div>
        </div>

        <div v-if="uploadMessage" class="mt-4 p-3 rounded-lg" :class="uploadError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'">
          {{ uploadMessage }}
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 mt-4">
          <button 
            @click="handleScrapeEmails"
            :disabled="scraping"
            class="btn btn-secondary text-sm"
          >
            {{ scraping ? 'Scraping...' : 'Scrape Missing Emails' }}
          </button>
          <button 
            @click="handleAnalyzeWebsites"
            :disabled="analyzing"
            class="btn btn-secondary text-sm"
          >
            {{ analyzing ? 'Analyzing...' : 'Analyze Websites' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Prospects Table -->
    <div class="card">
      <div class="card-header flex items-center justify-between">
        <h3 class="font-semibold">Prospects ({{ prospects.length }})</h3>
        <div class="flex items-center gap-2">
          <select v-model="filter" class="input text-sm w-auto">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
          </select>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Website</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Niche</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="prospect in filteredProspects" :key="prospect._id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <a :href="prospect.websiteUrl" target="_blank" class="text-primary-600 hover:underline">
                  {{ prospect.domain }}
                </a>
                <p v-if="prospect.websiteData?.siteName" class="text-xs text-gray-500">
                  {{ prospect.websiteData.siteName }}
                </p>
              </td>
              <td class="px-6 py-4">
                <span v-if="prospect.email" class="text-sm">{{ prospect.email }}</span>
                <span v-else class="text-sm text-gray-400">Not found</span>
                <span v-if="prospect.emailSource === 'scraped'" class="ml-1 text-xs text-gray-400">(scraped)</span>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm capitalize">{{ prospect.websiteData?.niche || '-' }}</span>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="badge"
                  :class="{
                    'badge-gray': prospect.emailStatus === 'pending',
                    'badge-info': prospect.emailStatus === 'queued',
                    'badge-success': prospect.emailStatus === 'sent',
                    'badge-danger': prospect.emailStatus === 'failed',
                    'badge-warning': prospect.emailStatus === 'retrying'
                  }"
                >
                  {{ prospect.emailStatus }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm">
                {{ prospect.emailAttempts }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredProspects.length === 0" class="text-center py-8 text-gray-500">
          No prospects found
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="card max-w-md w-full mx-4">
        <div class="card-body">
          <h3 class="text-lg font-semibold mb-4">Delete Campaign?</h3>
          <p class="text-gray-600 mb-6">
            This will permanently delete the campaign and all associated prospects. This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button @click="showDeleteModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button @click="handleDelete" class="btn btn-danger">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCampaignStore } from '@/stores/campaigns'

const route = useRoute()
const router = useRouter()
const campaignStore = useCampaignStore()

const dragOver = ref(false)
const filter = ref('')
const showDeleteModal = ref(false)
const uploadMessage = ref('')
const uploadError = ref(false)
const scraping = ref(false)
const analyzing = ref(false)

const campaign = computed(() => campaignStore.currentCampaign)
const prospects = computed(() => campaignStore.prospects)

const filteredProspects = computed(() => {
  if (!filter.value) return prospects.value
  return prospects.value.filter(p => p.emailStatus === filter.value)
})

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

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) await uploadFile(file)
}

async function handleDrop(event) {
  dragOver.value = false
  const file = event.dataTransfer.files[0]
  if (file) await uploadFile(file)
}

async function uploadFile(file) {
  uploadMessage.value = ''
  uploadError.value = false

  try {
    const result = await campaignStore.uploadProspects(route.params.id, file)
    uploadMessage.value = result.message
  } catch (err) {
    uploadError.value = true
    uploadMessage.value = err.response?.data?.message || 'Upload failed'
  }
}

async function handleScrapeEmails() {
  scraping.value = true
  try {
    const result = await campaignStore.scrapeEmails(route.params.id)
    uploadMessage.value = result.message
    uploadError.value = false
  } catch (err) {
    uploadError.value = true
    uploadMessage.value = err.response?.data?.message || 'Scraping failed'
  } finally {
    scraping.value = false
  }
}

async function handleAnalyzeWebsites() {
  analyzing.value = true
  try {
    const result = await campaignStore.analyzeWebsites(route.params.id)
    uploadMessage.value = result.message
    uploadError.value = false
  } catch (err) {
    uploadError.value = true
    uploadMessage.value = err.response?.data?.message || 'Analysis failed'
  } finally {
    analyzing.value = false
  }
}

async function handleStart() {
  try {
    await campaignStore.startCampaign(route.params.id)
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to start campaign')
  }
}

async function handlePause() {
  await campaignStore.pauseCampaign(route.params.id)
}

async function handleResume() {
  await campaignStore.resumeCampaign(route.params.id)
}

async function handleDelete() {
  await campaignStore.deleteCampaign(route.params.id)
  router.push('/campaigns')
}

onMounted(() => {
  campaignStore.fetchCampaign(route.params.id)
})
</script>
