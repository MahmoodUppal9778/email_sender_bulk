<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Gmail Settings -->
    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold">Gmail Configuration</h3>
      </div>
      <div class="card-body space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="font-medium text-blue-900 mb-2">How to get your Gmail App Password:</h4>
          <ol class="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Enable 2-Step Verification on your Google account</li>
            <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" class="underline">https://myaccount.google.com/apppasswords</a></li>
            <li>Select "Mail" and your device</li>
            <li>Click "Generate" and copy the 16-character password</li>
          </ol>
        </div>

        <form @submit.prevent="handleGmailSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Gmail Address</label>
            <input
              v-model="gmailForm.gmailUser"
              type="email"
              class="input"
              placeholder="you@gmail.com"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">App Password</label>
            <input
              v-model="gmailForm.gmailAppPassword"
              type="password"
              class="input"
              placeholder="xxxx xxxx xxxx xxxx"
              required
            />
          </div>

          <div v-if="gmailMessage" class="text-sm" :class="gmailError ? 'text-red-600' : 'text-green-600'">
            {{ gmailMessage }}
          </div>

          <button type="submit" class="btn btn-primary" :disabled="gmailLoading">
            {{ gmailLoading ? 'Saving...' : 'Save Gmail Settings' }}
          </button>
        </form>

        <div v-if="authStore.user?.gmailUser" class="pt-4 border-t border-gray-200">
          <p class="text-sm text-gray-600">
            Current: <span class="font-medium">{{ authStore.user.gmailUser }}</span>
            <span class="text-green-600 ml-2">✓ Configured</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Sending Settings -->
    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold">Sending Limits</h3>
      </div>
      <div class="card-body">
        <form @submit.prevent="handleSettingsSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Emails per Hour</label>
              <input
                v-model.number="settingsForm.emailsPerHour"
                type="number"
                min="1"
                max="50"
                class="input"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Emails per Day</label>
              <input
                v-model.number="settingsForm.emailsPerDay"
                type="number"
                min="1"
                max="500"
                class="input"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Min Delay (seconds)</label>
              <input
                v-model.number="settingsForm.minDelaySeconds"
                type="number"
                min="10"
                max="300"
                class="input"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Max Delay (seconds)</label>
              <input
                v-model.number="settingsForm.maxDelaySeconds"
                type="number"
                min="30"
                max="600"
                class="input"
              />
            </div>
          </div>

          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              id="warmupMode"
              v-model="settingsForm.warmupMode"
              class="w-4 h-4 text-primary-600 rounded border-gray-300"
            />
            <label for="warmupMode" class="text-sm text-gray-700">
              Warmup Mode (gradually increase sending volume over 14 days)
            </label>
          </div>

          <div v-if="settingsMessage" class="text-sm" :class="settingsError ? 'text-red-600' : 'text-green-600'">
            {{ settingsMessage }}
          </div>

          <button type="submit" class="btn btn-primary" :disabled="settingsLoading">
            {{ settingsLoading ? 'Saving...' : 'Save Settings' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Deliverability Tips -->
    <div class="card">
      <div class="card-header">
        <h3 class="font-semibold">Deliverability Best Practices</h3>
      </div>
      <div class="card-body">
        <ul class="space-y-3 text-sm text-gray-600">
          <li class="flex items-start gap-2">
            <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Start slow with warmup mode enabled for new sending accounts
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Keep emails personalized and avoid spam trigger words
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Always include an unsubscribe option in your emails
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Don't send more than 100-200 emails per day from a single account
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Use randomized delays between emails to appear more natural
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Include both HTML and plain text versions of your emails
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const gmailForm = reactive({
  gmailUser: '',
  gmailAppPassword: ''
})
const gmailLoading = ref(false)
const gmailMessage = ref('')
const gmailError = ref(false)

const settingsForm = reactive({
  emailsPerHour: 20,
  emailsPerDay: 100,
  minDelaySeconds: 30,
  maxDelaySeconds: 120,
  warmupMode: true
})
const settingsLoading = ref(false)
const settingsMessage = ref('')
const settingsError = ref(false)

async function handleGmailSubmit() {
  gmailLoading.value = true
  gmailMessage.value = ''
  gmailError.value = false

  try {
    await authStore.updateGmailSettings(gmailForm.gmailUser, gmailForm.gmailAppPassword)
    gmailMessage.value = 'Gmail settings saved successfully!'
    gmailForm.gmailAppPassword = ''
  } catch (err) {
    gmailError.value = true
    gmailMessage.value = err.response?.data?.message || 'Failed to save settings'
  } finally {
    gmailLoading.value = false
  }
}

async function handleSettingsSubmit() {
  settingsLoading.value = true
  settingsMessage.value = ''
  settingsError.value = false

  try {
    await authStore.updateSettings(settingsForm)
    settingsMessage.value = 'Settings saved successfully!'
  } catch (err) {
    settingsError.value = true
    settingsMessage.value = err.response?.data?.message || 'Failed to save settings'
  } finally {
    settingsLoading.value = false
  }
}

onMounted(() => {
  if (authStore.user) {
    gmailForm.gmailUser = authStore.user.gmailUser || ''
    Object.assign(settingsForm, authStore.user.settings || {})
  }
})
</script>
