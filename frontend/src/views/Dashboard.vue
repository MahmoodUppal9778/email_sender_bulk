<template>
  <div class="space-y-6">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="card card-body">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Total Campaigns</p>
            <p class="text-2xl font-bold">{{ overview?.campaigns?.total || 0 }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mt-2">
          {{ overview?.campaigns?.active || 0 }} active
        </p>
      </div>

      <div class="card card-body">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Emails Sent Today</p>
            <p class="text-2xl font-bold">{{ overview?.emails?.sentToday || 0 }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div class="mt-2">
          <div class="flex justify-between text-sm text-gray-500 mb-1">
            <span>Daily limit</span>
            <span>{{ overview?.emails?.sentToday || 0 }}/{{ overview?.emails?.dailyLimit || 100 }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="bg-green-500 rounded-full h-2 transition-all"
              :style="{ width: `${dailyProgress}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div class="card card-body">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Total Prospects</p>
            <p class="text-2xl font-bold">{{ overview?.prospects?.total || 0 }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div class="flex gap-2 mt-2 text-sm">
          <span class="badge badge-info">{{ overview?.prospects?.queued || 0 }} queued</span>
          <span class="badge badge-success">{{ overview?.prospects?.sent || 0 }} sent</span>
        </div>
      </div>

      <div class="card card-body">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Queue Status</p>
            <p class="text-2xl font-bold">{{ queueStatusLabel }}</p>
          </div>
          <div 
            class="w-12 h-12 rounded-lg flex items-center justify-center"
            :class="queueStatusBg"
          >
            <svg class="w-6 h-6" :class="queueStatusIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!overview?.queue?.isPaused" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path v-if="!overview?.queue?.isPaused" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p class="text-sm text-gray-500 mt-2">
          {{ overview?.emails?.hourlyRemaining || 0 }} remaining this hour
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Activity Chart -->
      <div class="card">
        <div class="card-header">
          <h3 class="font-semibold">Sending Activity (7 days)</h3>
        </div>
        <div class="card-body">
          <div v-if="activity.length" class="h-64">
            <Line :data="chartData" :options="chartOptions" />
          </div>
          <div v-else class="h-64 flex items-center justify-center text-gray-500">
            No activity data yet
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card">
        <div class="card-header flex items-center justify-between">
          <h3 class="font-semibold">Recent Activity</h3>
          <router-link to="/emails" class="text-sm text-primary-600 hover:text-primary-700">
            View all
          </router-link>
        </div>
        <div class="card-body p-0">
          <div v-if="overview?.recentActivity?.length" class="divide-y divide-gray-100">
            <div 
              v-for="activity in overview.recentActivity"
              :key="activity.id"
              class="px-6 py-3 flex items-center justify-between"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ activity.to }}</p>
                <p class="text-xs text-gray-500">{{ activity.campaign }}</p>
              </div>
              <div class="ml-4 flex items-center gap-2">
                <span 
                  class="badge"
                  :class="{
                    'badge-success': activity.status === 'sent',
                    'badge-danger': activity.status === 'failed',
                    'badge-warning': activity.status === 'retrying'
                  }"
                >
                  {{ activity.status }}
                </span>
                <span class="text-xs text-gray-400">{{ formatTime(activity.sentAt) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="p-6 text-center text-gray-500">
            No recent activity
          </div>
        </div>
      </div>
    </div>

    <!-- Gmail Setup Warning -->
    <div v-if="!authStore.user?.gmailUser" class="card border-yellow-200 bg-yellow-50">
      <div class="card-body flex items-center gap-4">
        <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="flex-1">
          <h4 class="font-semibold text-yellow-800">Gmail Setup Required</h4>
          <p class="text-sm text-yellow-700">Configure your Gmail App Password to start sending emails.</p>
        </div>
        <router-link to="/settings" class="btn btn-warning">
          Setup Now
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const authStore = useAuthStore()
const dashboardStore = useDashboardStore()

const overview = computed(() => dashboardStore.overview)
const activity = computed(() => dashboardStore.activity)

const dailyProgress = computed(() => {
  const sent = overview.value?.emails?.sentToday || 0
  const limit = overview.value?.emails?.dailyLimit || 100
  return Math.min((sent / limit) * 100, 100)
})

const queueStatusLabel = computed(() => {
  if (!overview.value?.queue?.isOnline) return 'Offline'
  if (overview.value?.queue?.isPaused) return 'Paused'
  return 'Active'
})

const queueStatusBg = computed(() => {
  if (!overview.value?.queue?.isOnline) return 'bg-red-100'
  if (overview.value?.queue?.isPaused) return 'bg-yellow-100'
  return 'bg-green-100'
})

const queueStatusIcon = computed(() => {
  if (!overview.value?.queue?.isOnline) return 'text-red-600'
  if (overview.value?.queue?.isPaused) return 'text-yellow-600'
  return 'text-green-600'
})

const chartData = computed(() => ({
  labels: activity.value.map(d => d.date),
  datasets: [
    {
      label: 'Sent',
      data: activity.value.map(d => d.sent || 0),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4
    },
    {
      label: 'Failed',
      data: activity.value.map(d => d.failed || 0),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.4
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

onMounted(() => {
  dashboardStore.fetchOverview()
  dashboardStore.fetchActivity()
})
</script>
